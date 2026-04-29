# Flask + CCXT: OKX ana kaynak, BTCTurk fallback.
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from flask import Flask, jsonify, request
from flask_cors import CORS
import ccxt
import requests

app = Flask(__name__)
CORS(app)

BINANCE_SYMBOLS = ["BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT", "XRP/USDT"]
KUCOIN_SYMBOLS = [
    "ADA/USDT",
    "DOGE/USDT",
    "AVAX/USDT",
    "DOT/USDT",
    "MATIC/USDT",
    "APT/USDT",
    "ARB/USDT",
    "LINK/USDT",
    "TRX/USDT",
]
CCXT_SYMBOLS = BINANCE_SYMBOLS + KUCOIN_SYMBOLS
CCXT_EXCHANGE_CANDIDATES = ["okx"]
SYMBOL_ALIASES = {
    "MATIC/USDT": ["MATIC/USDT", "POL/USDT"],
}
BTCTURK_PAIR_MAP = {
    "BTC/USDT": "BTCUSDT",
    "ETH/USDT": "ETHUSDT",
    "BNB/USDT": "BNBUSDT",
    "SOL/USDT": "SOLUSDT",
    "XRP/USDT": "XRPUSDT",
    "ADA/USDT": "ADAUSDT",
    "DOGE/USDT": "DOGEUSDT",
    "AVAX/USDT": "AVAXUSDT",
    "DOT/USDT": "DOTUSDT",
    "MATIC/USDT": "POLUSDT",
    "APT/USDT": "APTUSDT",
    "ARB/USDT": "ARBUSDT",
    "LINK/USDT": "LINKUSDT",
    "TRX/USDT": "TRXUSDT",
}


def _normalize_ticker(exchange_id: str, symbol: str, ticker: dict) -> dict:
    return {
        "symbol": symbol,
        "last": float(ticker.get("last") or 0),
        "percentage": float(ticker.get("percentage") or 0),
        "volume": float(ticker.get("quoteVolume") or ticker.get("baseVolume") or 0),
        "high": float(ticker.get("high") or 0),
        "low": float(ticker.get("low") or 0),
        "exchange": exchange_id,
    }


def _to_float(value) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _fetch_single_exchange(exchange_id: str, symbols: list[str]) -> tuple[str, dict[str, dict], list[dict]]:
    exchange_errors = []
    symbol_rows: dict[str, dict] = {}

    exchange_cls = getattr(ccxt, exchange_id, None)
    if exchange_cls is None:
        return exchange_id, symbol_rows, [{"exchange": exchange_id, "symbol": "*", "message": "exchange class not found"}]

    ex = exchange_cls({"enableRateLimit": True, "timeout": 7000})
    print(f"[ccxt-service] CCXT {exchange_id} fetch started")
    all_tickers = {}

    try:
        if ex.has.get("fetchTickers"):
            all_tickers = ex.fetch_tickers()
    except Exception as e:  # noqa: BLE001
        exchange_errors.append({"exchange": exchange_id, "symbol": "*", "message": f"fetch_tickers failed: {e}"})
        all_tickers = {}

    if all_tickers:
        for symbol in symbols:
            candidates = SYMBOL_ALIASES.get(symbol, [symbol])
            ticker = None
            last_error = None
            for candidate_symbol in candidates:
                try:
                    ticker = all_tickers.get(candidate_symbol)
                    if ticker is None:
                        ticker = all_tickers.get(candidate_symbol.replace("/", ""))
                    if ticker is None:
                        raise ValueError("ticker not found in fetch_tickers payload")
                    break
                except Exception as e:  # noqa: BLE001
                    last_error = e

            if ticker is None:
                exchange_errors.append({"exchange": exchange_id, "symbol": symbol, "message": str(last_error or "ticker not found")})
                continue
            symbol_rows[symbol] = _normalize_ticker(exchange_id, symbol, ticker)
    else:
        max_workers = int(os.environ.get("CCXT_SYMBOL_WORKERS", "4"))
        max_workers = max(1, min(max_workers, len(symbols)))

        def _fetch_one_symbol(symbol: str):
            candidates = SYMBOL_ALIASES.get(symbol, [symbol])
            last_error = None
            for candidate_symbol in candidates:
                try:
                    ticker = ex.fetch_ticker(candidate_symbol)
                    return symbol, _normalize_ticker(exchange_id, symbol, ticker), None
                except Exception as e:  # noqa: BLE001
                    last_error = e
            return symbol, None, {"exchange": exchange_id, "symbol": symbol, "message": str(last_error or "ticker not found")}

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = [executor.submit(_fetch_one_symbol, symbol) for symbol in symbols]
            for future in as_completed(futures):
                symbol, row, err = future.result()
                if row is not None:
                    symbol_rows[symbol] = row
                elif err is not None:
                    exchange_errors.append(err)

    if symbol_rows:
        print(f"[ccxt-service] CCXT {exchange_id} fetch finished: data={len(symbol_rows)}")
    else:
        print(f"[ccxt-service] CCXT {exchange_id} fetch finished: no data")
        exchange_errors.append({"exchange": exchange_id, "symbol": "*", "message": "no usable symbols returned"})

    return exchange_id, symbol_rows, exchange_errors


def _fetch_from_ccxt_candidates(symbols: list[str]) -> tuple[list[dict], list[dict], list[str]]:
    errors = []
    selected_by_symbol: dict[str, dict] = {}
    used_exchanges: set[str] = set()

    exchange_workers = int(os.environ.get("CCXT_EXCHANGE_WORKERS", str(len(CCXT_EXCHANGE_CANDIDATES))))
    exchange_workers = max(1, min(exchange_workers, len(CCXT_EXCHANGE_CANDIDATES)))

    with ThreadPoolExecutor(max_workers=exchange_workers) as executor:
        future_map = {
            executor.submit(_fetch_single_exchange, exchange_id, symbols): exchange_id
            for exchange_id in CCXT_EXCHANGE_CANDIDATES
        }

        for future in as_completed(future_map):
            exchange_id = future_map[future]
            try:
                _, symbol_rows, exchange_errors = future.result()
                errors.extend(exchange_errors)
                for symbol in symbols:
                    if symbol in selected_by_symbol:
                        continue
                    row = symbol_rows.get(symbol)
                    if row is not None:
                        selected_by_symbol[symbol] = row
                        used_exchanges.add(exchange_id)
                if len(selected_by_symbol) == len(symbols):
                    break
            except Exception as e:  # noqa: BLE001
                errors.append({"exchange": exchange_id, "symbol": "*", "message": str(e)})
                print(f"[ccxt-service] CCXT {exchange_id} failed: {e}")

    ordered_rows = [selected_by_symbol[s] for s in symbols if s in selected_by_symbol]
    return ordered_rows, errors, sorted(used_exchanges)


def _fetch_from_okx(symbols: list[str]) -> tuple[list[dict], list[dict], list[str]]:
    exchange_id, symbol_rows, exchange_errors = _fetch_single_exchange("okx", symbols)
    ordered_rows = [symbol_rows[s] for s in symbols if s in symbol_rows]
    used = [exchange_id] if ordered_rows else []
    return ordered_rows, exchange_errors, used


def _fetch_all_first_wins(symbols: list[str]) -> tuple[list[dict], list[dict], list[str]]:
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = {
            executor.submit(_fetch_from_okx, symbols): "okx",
            executor.submit(_fallback_from_btcturk, symbols): "btcturk",
        }
        collected_errors = []
        first_source = None

        for future in as_completed(futures):
            source = futures[future]
            try:
                if source == "okx":
                    data, errs, _ = future.result()
                else:
                    data, errs = future.result()
                collected_errors.extend(errs)
                if data:
                    first_source = source
                    print(f"[ccxt-service] all-first-wins source={source} data={len(data)}")
                    if source == "okx":
                        return data, collected_errors, ["okx"]
                    return data, collected_errors, ["btcturk"]
            except Exception as e:  # noqa: BLE001
                collected_errors.append({"exchange": source, "symbol": "*", "message": str(e)})

        print(f"[ccxt-service] all-first-wins no data, first_source={first_source}")
        return [], collected_errors, []


def _fallback_from_btcturk(symbols: list[str]) -> tuple[list[dict], list[dict]]:
    if not symbols:
        return [], []

    try:
        print("[ccxt-service] BTCTurk fetch started")
        response = requests.get("https://api.btcturk.com/api/v2/ticker", timeout=15)
        response.raise_for_status()
        rows = response.json().get("data", [])
    except Exception as e:  # noqa: BLE001
        return [], [{"exchange": "btcturk", "symbol": "*", "message": str(e)}]

    by_pair = {row.get("pair"): row for row in rows}
    data = []
    errors = []

    for symbol in symbols:
        pair = BTCTURK_PAIR_MAP.get(symbol)
        row = by_pair.get(pair)
        if not pair or not row:
            errors.append({"exchange": "btcturk", "symbol": symbol, "message": "pair not found"})
            continue
        data.append(
            {
                "symbol": symbol,
                "last": float(row.get("last") or 0),
                "percentage": float(row.get("dailyPercent") or 0),
                "volume": float(row.get("volume") or 0),
                "high": float(row.get("high") or 0),
                "low": float(row.get("low") or 0),
                "exchange": "btcturk",
            }
        )

    print(f"[ccxt-service] BTCTurk fetch finished: data={len(data)} errors={len(errors)}")
    return data, errors


@app.get("/fetch-crypto")
def fetch_crypto():
    """Kaynak secimine gore OKX/BTCTurk veya all-first-wins."""
    symbols = CCXT_SYMBOLS
    expected_symbols = set(symbols)
    source = (request.args.get("source", "all") or "all").strip().lower()
    if source not in {"all", "okx", "btcturk"}:
        source = "all"
    print(f"[ccxt-service] /fetch-crypto requested, source={source}, target_symbols={len(symbols)}")

    if source == "okx":
        results, errors, used_ccxt = _fetch_from_okx(symbols)
    elif source == "btcturk":
        results, errors = _fallback_from_btcturk(symbols)
        used_ccxt = ["btcturk"] if results else []
    else:
        results, errors, used_ccxt = _fetch_all_first_wins(symbols)

    deduped = []
    seen_symbols = set()
    for row in results:
        symbol = row.get("symbol")
        if symbol not in expected_symbols or symbol in seen_symbols:
            continue
        seen_symbols.add(symbol)
        deduped.append(row)

    payload = {
        "data": deduped,
        "errors": errors,
        "partial": bool(errors),
    }
    print(
        f"[ccxt-service] response ready: data={len(payload['data'])} errors={len(payload['errors'])} used_ccxt={used_ccxt}"
    )
    return jsonify(payload), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=False)
