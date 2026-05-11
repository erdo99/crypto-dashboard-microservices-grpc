# crypto-dashboard-microservices-grpc

Polyglot crypto dashboard with React frontend, Go API gateway, and Python market data service using gRPC/Protobuf between services.

## Architecture

- `frontend/`: React + Vite UI
- `api/`: GoFiber REST gateway
- `ccxt-service/`: Python data service (gRPC server)
- `proto/`: shared Protobuf contract

Data flow:

1. Frontend calls Go REST API.
2. Go API calls Python service via gRPC (`GetCryptoList`).
3. Python responds with market data from selected source (`all`, `okx`, `btcturk`).

## Screenshots & demo

PNG previews are in [`images/`](images/); a screen recording is in [`videos/`](videos/).

<p align="center">
  <img src="images/cTümü-Açık.png" width="48%" alt="UI: all sources, overview" />
  <img src="images/cTümü-kayıtlar.png" width="48%" alt="UI: all sources, records" />
</p>
<p align="center">
  <img src="images/cTümü-sistem.png" width="48%" alt="UI: all sources, system" />
  <img src="images/cSistem-Btc.png" width="48%" alt="UI: BTCTurk source" />
</p>
<p align="center">
  <img src="images/cSistem-okx.png" width="70%" alt="UI: OKX source" />
</p>

**Demo video:** [screen recording](videos/Crypto%20Dashboard%20-%20Ki%C5%9Fisel%20-%20Microsoft%E2%80%8B%20Edge%202026-05-11%2018-18-42.mp4) (Edge export; the filename contains a zero-width space after “Microsoft”, which is why a plain copy-paste link can break).

## Environment Variables

| Service | Variable | Default |
|---|---|---|
| Python gRPC | `PORT` | `5000` (HTTP app, optional) |
| Go API | `PORT` | `8080` |
| Go API | `CCXT_GRPC_ADDR` | `localhost:50051` |
| Go API | `PYTHON_GRPC_TIMEOUT_SECONDS` | `45` |
| Go API | `CORS_ORIGIN` | `http://localhost:5174,http://localhost:5173,http://localhost:3000` |
| Frontend | `VITE_API_BASE_URL` | `http://localhost:8080` |

## Run Locally

### 1) Python gRPC service

```bash
cd ccxt-service
pip install -r requirements.txt
python grpc_server.py
```

### 2) Go API

```bash
cd api
go mod tidy
go run .
```

### 3) Frontend

```bash
cd frontend
npm install
npm run dev
```

Open: `http://localhost:5174`

## API Endpoints

- Health: `GET /api/health`
- Crypto list: `GET /api/crypto?source=all|okx|btcturk`
- Single symbol: `GET /api/crypto/:symbol?source=all|okx|btcturk`

## Notes

- Inter-service transport is gRPC/Protobuf (Go -> Python).
- Frontend communication remains REST (Frontend -> Go).
