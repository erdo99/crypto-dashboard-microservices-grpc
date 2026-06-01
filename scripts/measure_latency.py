#!/usr/bin/env python3
"""Measure /api/crypto latency (what the frontend waits on)."""
import json
import os
import time
import urllib.request

BASE = os.environ.get("API_BASE_URL", "http://localhost:8080").rstrip("/")


def measure(path: str, timeout: float = 120.0) -> tuple[float, int]:
    t0 = time.perf_counter()
    with urllib.request.urlopen(f"{BASE}{path}", timeout=timeout) as resp:
        data = json.loads(resp.read())
    ms = (time.perf_counter() - t0) * 1000
    rows = len(data.get("data", [])) if isinstance(data, dict) else 0
    return ms, rows


def main() -> None:
    print(f"Measuring {BASE} (frontend uses this URL via VITE_API_BASE_URL)\n")

    for source in ("okx", "btcturk", "all"):
        print(f"=== source={source} ===")
        # cold: wait past default 8s cache TTL between runs
        time.sleep(9)
        ms1, n1 = measure(f"/api/crypto?source={source}")
        print(f"  cold (after cache expiry): {ms1:.0f} ms, {n1} rows")
        time.sleep(0.2)
        ms2, n2 = measure(f"/api/crypto?source={source}")
        print(f"  warm (cache hit):          {ms2:.0f} ms, {n2} rows")
        print()


if __name__ == "__main__":
    main()
