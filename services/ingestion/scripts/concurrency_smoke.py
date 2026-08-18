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
    parser.add_argument("--base", default="https://www.investortrusthub.com")
    parser.add_argument("--workers", type=int, default=10)
    parser.add_argument("--rounds", type=int, default=1, help="Repeat the mixed URL set this many times")
    args = parser.parse_args()
    base = args.base.rstrip("/")
    urls = [
        f"{base}/",
        f"{base}/firms",
        f"{base}/firms?q=105958",
        f"{base}/firms?q=vanguard",
        f"{base}/firms?state=FL",
        f"{base}/firms?q=capital&state=NY",
        f"{base}/firm/sec-crd-105958",
        f"{base}/firm/sec-crd-106676",
        f"{base}/firm/sec-crd-109691",
        f"{base}/firm/sec-crd-2288",
        f"{base}/firm/sec-crd-10091",
        f"{base}/firm/sec-crd-104550",
        f"{base}/firm/sec-crd-3767",
        f"{base}/firm/sec-crd-20804",
    ]
    # 40 mixed requests: first pass + repeats of cacheable firm/home routes
    urls = urls + [
        f"{base}/",
        f"{base}/firms",
        f"{base}/firm/sec-crd-105958",
        f"{base}/firm/sec-crd-106676",
        f"{base}/firm/sec-crd-109691",
        f"{base}/firm/sec-crd-2288",
        f"{base}/firm/sec-crd-10091",
        f"{base}/firm/sec-crd-104550",
        f"{base}/firm/sec-crd-3767",
        f"{base}/firm/sec-crd-20804",
        f"{base}/firms?q=105958",
        f"{base}/firms?state=FL",
    ] + urls
    if args.rounds > 1:
        urls = urls * args.rounds
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
    timings_sorted = sorted(timings)
    p95 = timings_sorted[max(0, int(round(0.95 * (len(timings_sorted) - 1))))] if timings_sorted else None
    report = {
        "requests": len(results),
        "successes": ok,
        "failures": failed,
        "temporary_unavailable_responses": unavailable,
        "latency_ms_p50": int(statistics.median(timings)) if timings else None,
        "latency_ms_p95": p95,
        "latency_ms_max": max(timings) if timings else None,
        "failed_urls": [item["url"] for item in results if item["status"] < 200 or item["status"] >= 400 or item.get("unavailable")],
    }
    print(json.dumps(report, indent=2))
    return 0 if failed == 0 and unavailable == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
