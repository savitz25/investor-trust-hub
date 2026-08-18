"""Modest production-safe concurrency smoke. Do not use as a load test."""

from __future__ import annotations

import argparse
import json
import statistics
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed


def fetch(url: str) -> dict:
    started = time.perf_counter()
    try:
        request = urllib.request.Request(url, headers={"User-Agent": "InvestorTrustHub-concurrency-smoke"})
        with urllib.request.urlopen(request, timeout=30) as response:
            body = response.read(8000).decode("utf-8", errors="replace")
            elapsed = int((time.perf_counter() - started) * 1000)
            unavailable = "temporarily unavailable" in body.lower()
            return {
                "url": url,
                "status": response.status,
                "ms": elapsed,
                "unavailable": unavailable,
            }
    except urllib.error.HTTPError as exc:
        return {"url": url, "status": exc.code, "ms": int((time.perf_counter() - started) * 1000), "unavailable": False}
    except Exception as exc:  # noqa: BLE001
        return {"url": url, "status": 0, "ms": int((time.perf_counter() - started) * 1000), "error": type(exc).__name__, "unavailable": False}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="https://investor-trust-hub-web.vercel.app")
    parser.add_argument("--workers", type=int, default=8)
    args = parser.parse_args()
    base = args.base.rstrip("/")
    urls = [
        f"{base}/",
        f"{base}/firms",
        f"{base}/firms?q=105958",
        f"{base}/firms?q=vanguard",
        f"{base}/firm/sec-crd-105958",
        f"{base}/firm/sec-crd-106676",
        f"{base}/firm/sec-crd-109691",
        f"{base}/firm/sec-crd-2288",
    ] * 4
    results = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = [pool.submit(fetch, url) for url in urls]
        for future in as_completed(futures):
            results.append(future.result())
    statuses = [item["status"] for item in results]
    ok = sum(1 for status in statuses if 200 <= status < 400)
    failed = len(results) - ok
    unavailable = sum(1 for item in results if item.get("unavailable"))
    timings = [item["ms"] for item in results]
    report = {
        "requests": len(results),
        "successes": ok,
        "failures": failed,
        "temporary_unavailable_responses": unavailable,
        "latency_ms_p50": int(statistics.median(timings)) if timings else None,
        "latency_ms_max": max(timings) if timings else None,
    }
    print(json.dumps(report, indent=2))
    return 0 if failed == 0 and unavailable == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
