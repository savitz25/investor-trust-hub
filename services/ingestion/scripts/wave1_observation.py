"""Wave 1 observation: sitemap ↔ DB bijection and conservative HTTP health."""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from load_env import load_local_env  # noqa: E402

NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}


def fetch(url: str, timeout: int = 30) -> dict:
    started = time.perf_counter()
    try:
        request = urllib.request.Request(
            url,
            headers={"User-Agent": "InvestorTrustHub-wave1-observation"},
        )
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read().decode("utf-8", errors="replace")
            return {
                "url": url,
                "status": response.status,
                "ms": int((time.perf_counter() - started) * 1000),
                "body": body,
                "unavailable": "temporarily unavailable" in body.lower(),
            }
    except urllib.error.HTTPError as exc:
        return {
            "url": url,
            "status": exc.code,
            "ms": int((time.perf_counter() - started) * 1000),
            "body": "",
            "unavailable": False,
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "url": url,
            "status": 0,
            "ms": int((time.perf_counter() - started) * 1000),
            "body": "",
            "unavailable": False,
            "error": type(exc).__name__,
        }


def sitemap_firm_crds(xml_text: str) -> list[str]:
    root = ET.fromstring(xml_text)
    crds: list[str] = []
    for loc in root.findall("sm:url/sm:loc", NS):
        text = loc.text or ""
        match = re.search(r"/firm/sec-crd-(\d+)$", text)
        if match:
            crds.append(match.group(1))
    return crds


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="https://www.investortrusthub.com")
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--held-sample", type=int, default=100)
    args = parser.parse_args()
    load_local_env(ROOT)
    import os

    import psycopg

    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        print("DATABASE_URL missing")
        return 1

    sitemap = fetch(f"{args.base.rstrip('/')}/sitemap.xml")
    if sitemap["status"] != 200:
        print(json.dumps({"error": "sitemap_fetch_failed", "status": sitemap["status"]}))
        return 1
    sitemap_crds = set(sitemap_firm_crds(sitemap["body"]))

    with psycopg.connect(dsn, connect_timeout=30) as conn:
        db_crds = {
            row[0]
            for row in conn.execute(
                """
                SELECT crd.identifier_value
                FROM search_documents sd
                JOIN firms f ON f.id = sd.entity_id
                JOIN firm_identifiers crd
                  ON crd.firm_id = f.id AND crd.identifier_type = 'crd'
                WHERE sd.entity_kind = 'firm' AND sd.indexable AND NOT f.is_synthetic
                """
            ).fetchall()
        }
        held = [
            row[0]
            for row in conn.execute(
                """
                SELECT crd.identifier_value
                FROM search_documents sd
                JOIN firms f ON f.id = sd.entity_id
                JOIN firm_identifiers crd
                  ON crd.firm_id = f.id AND crd.identifier_type = 'crd'
                WHERE sd.entity_kind = 'firm' AND NOT sd.indexable AND NOT f.is_synthetic
                ORDER BY crd.identifier_value
                LIMIT %s
                """,
                (args.held_sample,),
            ).fetchall()
        ]

    missing = sorted(db_crds - sitemap_crds)
    extra = sorted(sitemap_crds - db_crds)
    report: dict = {
        "observed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "db_indexable": len(db_crds),
        "sitemap_firms": len(sitemap_crds),
        "missing_from_sitemap": len(missing),
        "extra_in_sitemap": len(extra),
        "bijection": not missing and not extra,
    }

    wave_failures = []
    urls = [f"{args.base.rstrip('/')}/firm/sec-crd-{crd}" for crd in sorted(db_crds)]
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = [pool.submit(fetch, url) for url in urls]
        passed = 0
        for future in as_completed(futures):
            item = future.result()
            body = item.get("body") or ""
            titles = re.findall(r"<title>([^<]*)</title>", body, flags=re.I)
            robots = re.search(r'name="robots" content="([^"]+)"', body)
            canon = re.search(r'rel="canonical" href="([^"]+)"', body)
            crd = re.search(r"sec-crd-(\d+)", item["url"])
            ok = (
                item["status"] == 200
                and not item.get("unavailable")
                and robots
                and "noindex" not in robots.group(1)
                and canon
                and canon.group(1).startswith("https://www.investortrusthub.com/firm/sec-crd-")
                and crd
                and crd.group(1) in body
            )
            if ok:
                passed += 1
            else:
                wave_failures.append(
                    {
                        "url": item["url"],
                        "status": item["status"],
                        "unavailable": item.get("unavailable"),
                        "titles": titles,
                        "robots": robots.group(1) if robots else None,
                    }
                )
    report["wave_http"] = {
        "passed": passed,
        "failed": len(wave_failures),
        "temporary_unavailable": sum(1 for item in wave_failures if item.get("unavailable")),
        "failures": wave_failures[:25],
    }

    held_failures = []
    held_passed = 0
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = [pool.submit(fetch, f"{args.base.rstrip('/')}/firm/sec-crd-{crd}") for crd in held]
        for future in as_completed(futures):
            item = future.result()
            body = item.get("body") or ""
            robots = re.search(r'name="robots" content="([^"]+)"', body)
            canon = re.search(r'rel="canonical" href="([^"]+)"', body)
            crd = re.search(r"sec-crd-(\d+)", item["url"])
            in_sitemap = crd.group(1) in sitemap_crds if crd else True
            ok = (
                item["status"] == 200
                and robots
                and "noindex" in robots.group(1)
                and canon
                and "www.investortrusthub.com" in canon.group(1)
                and not in_sitemap
            )
            if ok:
                held_passed += 1
            else:
                held_failures.append({"url": item["url"], "status": item["status"]})
    report["held_http"] = {
        "sample": len(held),
        "passed": held_passed,
        "failed": len(held_failures),
        "failures": held_failures[:10],
    }

    out = ROOT / "data" / "reports" / "wave1-observation.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    if not report["bijection"] or report["wave_http"]["failed"] or report["held_http"]["failed"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
