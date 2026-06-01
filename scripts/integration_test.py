#!/usr/bin/env python3
"""End-to-end smoke test: Go API -> Python gRPC -> exchanges."""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request

API_BASE = os.environ.get("API_BASE_URL", "http://localhost:8080").rstrip("/")
EXPECTED_SYMBOL_COUNT = 14
SOURCES = ("all", "okx", "btcturk")
STARTUP_WAIT_SEC = int(os.environ.get("INTEGRATION_STARTUP_WAIT", "90"))
POLL_INTERVAL_SEC = 2


def get_json(path: str, timeout: float = 60.0) -> tuple[int, dict]:
    url = f"{API_BASE}{path}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = resp.read().decode("utf-8")
        return resp.status, json.loads(body)


def wait_for_health() -> None:
    deadline = time.monotonic() + STARTUP_WAIT_SEC
    last_err: Exception | None = None
    while time.monotonic() < deadline:
        try:
            status, data = get_json("/api/health", timeout=5)
            if status == 200 and data.get("status") == "ok":
                print(f"[ok] health {API_BASE}/api/health")
                return
        except Exception as e:  # noqa: BLE001
            last_err = e
        time.sleep(POLL_INTERVAL_SEC)
    raise RuntimeError(f"API not ready after {STARTUP_WAIT_SEC}s: {last_err}")


def assert_crypto_source(source: str) -> None:
    path = f"/api/crypto?source={source}"
    status, payload = get_json(path, timeout=90)
    if status != 200:
        raise AssertionError(f"{source}: HTTP {status}")

    if not payload.get("success"):
        raise AssertionError(f"{source}: success=false payload={payload!r}")

    rows = payload.get("data") or []
    errors = payload.get("errors") or []
    count = len(rows)

    print(
        f"[ok] source={source} rows={count} errors={len(errors)} "
        f"partial={payload.get('partial')} elapsed_check=done"
    )

    if count == 0:
        raise AssertionError(f"{source}: no rows returned")

    if count < EXPECTED_SYMBOL_COUNT - 2:
        raise AssertionError(
            f"{source}: expected ~{EXPECTED_SYMBOL_COUNT} rows, got {count} "
            f"(allowing 2 missing); errors={errors[:3]}"
        )

    exchanges = {str(r.get("exchange", "")).lower() for r in rows}
    symbols = {r.get("symbol") for r in rows}
    print(f"     exchanges={sorted(exchanges)} unique_symbols={len(symbols)}")


def main() -> int:
    print(f"Integration test against {API_BASE}")
    try:
        wait_for_health()
        for source in SOURCES:
            assert_crypto_source(source)
    except urllib.error.HTTPError as e:
        print(f"[fail] HTTP {e.code}: {e.read().decode('utf-8', errors='replace')}", file=sys.stderr)
        return 1
    except Exception as e:  # noqa: BLE001
        print(f"[fail] {e}", file=sys.stderr)
        return 1

    print("\nAll checks passed (health + all + okx + btcturk).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
