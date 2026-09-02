"""Discover official NJ Bureau of Securities action-library URLs. Stdlib only."""
from __future__ import annotations

import hashlib
import json
import re
import ssl
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "data" / "raw" / "nj-bos" / "html"
GEN = ROOT / "data" / "generated" / "nj-inv-001"
UA = "InvestorTrustHub/NJ-INV-001 (research acquisition; +https://www.investortrusthub.com)"
CTX = ssl.create_default_context()

SEED = {
    "bos_home": "https://www.njconsumeraffairs.gov/bos/",
    "bos_home_pages": "https://www.njconsumeraffairs.gov/bos/Pages/default.aspx",
    "bos_news": "https://www.njconsumeraffairs.gov/bos/Pages/news.aspx",
    "bos_faq": "https://www.njconsumeraffairs.gov/bos/Pages/FAQinvestor.aspx",
    "bos_forms": "https://www.njconsumeraffairs.gov/bos/Pages/industryforms.aspx",
    "bos_cbyi": "https://www.njconsumeraffairs.gov/bos/Pages/cbyinvest.aspx",
    "dca_actions": "https://www.njconsumeraffairs.gov/Pages/actions.aspx",
    "orders": "https://www.njconsumeraffairs.gov/bos/Pages/orders.aspx",
    "orders2": "https://www.njconsumeraffairs.gov/bos/Pages/Orders.aspx",
    "orders_filed": "https://www.njconsumeraffairs.gov/bos/Pages/OrdersandFiledComplaints.aspx",
    "actions_bos": "https://www.njconsumeraffairs.gov/bos/Pages/actions.aspx",
    "actions_lib": "https://www.njconsumeraffairs.gov/Actions/Pages/default.aspx",
    "check": "https://www.njconsumeraffairs.gov/bos/Pages/Check-Before-You-Invest.aspx",
}


def fetch(url: str) -> dict:
    rec = {"url": url}
    try:
        req = Request(url, headers={"User-Agent": UA, "Accept": "text/html"})
        with urlopen(req, context=CTX, timeout=45) as resp:
            body = resp.read()
            rec.update(
                {
                    "status": resp.status,
                    "final_url": resp.geturl(),
                    "bytes": len(body),
                    "sha256": hashlib.sha256(body).hexdigest(),
                    "content_type": resp.headers.get("Content-Type"),
                }
            )
            return rec, body
    except HTTPError as exc:
        rec.update({"status": exc.code, "error": str(exc.reason), "bytes": 0})
        return rec, b""
    except (URLError, TimeoutError, OSError) as exc:
        rec.update({"status": None, "error": str(exc), "bytes": 0})
        return rec, b""


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    GEN.mkdir(parents=True, exist_ok=True)
    results = []
    for key, url in SEED.items():
        rec, body = fetch(url)
        rec["key"] = key
        if rec.get("status") == 200 and body:
            path = OUT / f"{key}.html"
            path.write_bytes(body)
            rec["path"] = path.relative_to(ROOT).as_posix()
            text = body.decode("utf-8", errors="replace")
            rec["order_like_hrefs"] = sorted(
                set(
                    re.findall(
                        r'href=["\']([^"\']*(?:[Oo]rder|[Aa]ction|[Cc]omplaint)[^"\']*)["\']',
                        text,
                    )
                )
            )[:40]
            print(f"OK {rec['status']} {key} {rec['bytes']} hrefs={len(rec['order_like_hrefs'])}")
        else:
            print(f"HTTP {rec.get('status')} {key}")
        results.append(rec)
        time.sleep(0.12)
    (GEN / "discovery.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
    print("DONE", sum(1 for r in results if r.get("status") == 200), "/", len(results))


if __name__ == "__main__":
    main()
