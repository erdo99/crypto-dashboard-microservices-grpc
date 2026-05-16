// GoFiber proxy: Python CCXT servisinden kripto ticker listesi.
package main

import (
	"context"
	"log"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	cryptopb "crypto-api/internal/gen/cryptopb"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type CryptoData struct {
	Symbol     string  `json:"symbol"`
	Last       float64 `json:"last"`
	Percentage float64 `json:"percentage"`
	Volume     float64 `json:"volume"`
	High       float64 `json:"high"`
	Low        float64 `json:"low"`
	Exchange   string  `json:"exchange"`
}

type pythonPayload struct {
	Data    []CryptoData     `json:"data"`
	Errors  []map[string]any `json:"errors"`
	Partial bool             `json:"partial"`
}

func env(key, def string) string {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	return v
}

var (
	grpcClient     cryptopb.CryptoServiceClient
	grpcClientOnce sync.Once
	grpcClientErr  error
)

func getGRPCClient() (cryptopb.CryptoServiceClient, error) {
	grpcClientOnce.Do(func() {
		grpcAddr := env("CCXT_GRPC_ADDR", "localhost:50051")
		conn, err := grpc.NewClient(grpcAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
		if err != nil {
			grpcClientErr = err
			log.Printf("[api] python grpc dial failed: %v", err)
			return
		}
		grpcClient = cryptopb.NewCryptoServiceClient(conn)
		log.Printf("[api] python grpc client ready at %s", grpcAddr)
	})
	return grpcClient, grpcClientErr
}

func fetchFromPython(source string) ([]CryptoData, []map[string]any, bool, error) {
	if source == "" {
		source = "all"
	}
	log.Printf("[api] fetching python data source=%s", source)

	timeoutSec, err := strconv.Atoi(env("PYTHON_GRPC_TIMEOUT_SECONDS", "45"))
	if err != nil || timeoutSec <= 0 {
		timeoutSec = 45
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeoutSec)*time.Second)
	defer cancel()

	client, err := getGRPCClient()
	if err != nil {
		return nil, []map[string]any{{"exchange": "python", "message": err.Error()}}, true, err
	}
	resp, err := client.GetCryptoList(ctx, &cryptopb.GetCryptoListRequest{
		Source: source,
	})
	if err != nil {
		log.Printf("[api] python grpc request failed: %v", err)
		return nil, []map[string]any{{"exchange": "python", "message": err.Error()}}, true, err
	}

	data := make([]CryptoData, 0, len(resp.GetData()))
	for _, row := range resp.GetData() {
		data = append(data, CryptoData{
			Symbol:     row.GetSymbol(),
			Last:       row.GetLast(),
			Percentage: row.GetPercentage(),
			Volume:     row.GetVolume(),
			High:       row.GetHigh(),
			Low:        row.GetLow(),
			Exchange:   row.GetExchange(),
		})
	}

	errs := make([]map[string]any, 0, len(resp.GetErrors()))
	for _, e := range resp.GetErrors() {
		errs = append(errs, map[string]any{
			"exchange": e.GetExchange(),
			"symbol":   e.GetSymbol(),
			"message":  e.GetMessage(),
		})
	}

	log.Printf("[api] python grpc payload received: data=%d errors=%d partial=%v", len(data), len(errs), resp.GetPartial())
	return data, errs, resp.GetPartial(), nil
}

func main() {
	app := fiber.New()

	allowed := env("CORS_ORIGIN", "http://localhost:5174,http://localhost:5173,http://localhost:3000")
	app.Use(cors.New(cors.Config{
		AllowOrigins:     allowed,
		AllowMethods:     "GET,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept",
		AllowCredentials: false,
	}))

	app.Get("/api/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	app.Get("/api/crypto", func(c *fiber.Ctx) error {
		source := strings.ToLower(strings.TrimSpace(c.Query("source", "all")))
		if source != "all" && source != "okx" && source != "btcturk" {
			source = "all"
		}
		log.Printf("[api] /api/crypto requested source=%s", source)
		data, errs, partial, err := fetchFromPython(source)
		if err != nil && len(data) == 0 {
			log.Printf("[api] /api/crypto failed with no data: %v", err)
			return c.Status(502).JSON(fiber.Map{
				"success": false,
				"error":   err.Error(),
				"errors":  errs,
				"data":    []CryptoData{},
			})
		}
		log.Printf("[api] /api/crypto success: data=%d errors=%d partial=%v", len(data), len(errs), partial)
		return c.JSON(fiber.Map{
			"success": true,
			"data":    data,
			"errors":  errs,
			"partial": partial,
		})
	})

	app.Get("/api/crypto/:symbol", func(c *fiber.Ctx) error {
		symbol := c.Params("symbol")
		source := strings.ToLower(strings.TrimSpace(c.Query("source", "all")))
		if source != "all" && source != "okx" && source != "btcturk" {
			source = "all"
		}
		log.Printf("[api] /api/crypto/%s requested source=%s", symbol, source)
		data, errs, partial, err := fetchFromPython(source)
		if err != nil && len(data) == 0 {
			log.Printf("[api] /api/crypto/%s failed with no data: %v", symbol, err)
			return c.Status(502).JSON(fiber.Map{"success": false, "error": err.Error()})
		}
		var out []CryptoData
		for _, d := range data {
			if strings.EqualFold(strings.ReplaceAll(d.Symbol, "/", ""), strings.ReplaceAll(symbol, "/", "")) ||
				strings.EqualFold(d.Symbol, symbol) {
				out = append(out, d)
			}
		}
		if len(out) == 0 {
			log.Printf("[api] /api/crypto/%s not found", symbol)
			return c.Status(404).JSON(fiber.Map{"success": false, "message": "symbol not found", "errors": errs, "partial": partial})
		}
		log.Printf("[api] /api/crypto/%s success", symbol)
		return c.JSON(fiber.Map{"success": true, "data": out[0], "errors": errs, "partial": partial})
	})

	port := env("PORT", "8080")
	log.Printf("crypto-api listening on :%s (CCXT_GRPC_ADDR=%s)", port, env("CCXT_GRPC_ADDR", "localhost:50051"))
	log.Fatal(app.Listen(":" + port))
}
