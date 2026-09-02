"""Download seeded official NJ BOS PDFs. Stdlib only."""
from __future__ import annotations

import hashlib
import json
import ssl
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[3]
URLS = ROOT / "data" / "fixtures" / "nj-inv-001" / "official-pdf-urls.txt"
DEST = ROOT / "data" / "raw" / "nj-bos" / "pdfs"
REPORT = ROOT / "data" / "reports" / "nj-inv-001" / "acquire.json"
UA = "InvestorTrustHub/NJ-INV-001 (research acquisition; +https://www.investortrusthub.com)"
CTX = ssl.create_default_context()


def main() -> None:
    DEST.mkdir(parents=True, exist_ok=True)
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    urls = [line.strip() for line in URLS.read_text(encoding="utf-8").splitlines() if line.strip() and not line.startswith("#")]
    print("URLS", len(urls))
    results = []
    seen_hash: dict[str, str] = {}
    for url in urls:
        name = unquote(urlparse(url).path.rstrip("/").rsplit("/", 1)[-1])
        rec: dict = {"url": url, "name": name}
        try:
            req = Request(url, headers={"User-Agent": UA, "Accept": "application/pdf"})
            with urlopen(req, context=CTX, timeout=60) as resp:
                body = resp.read()
                rec.update(
                    {
                        "status": resp.status,
                        "ctype": resp.headers.get("Content-Type"),
                        "bytes": len(body),
                        "sha256": hashlib.sha256(body).hexdigest(),
                        "pdf": body.startswith(b"%PDF"),
                    }
                )
                if rec["pdf"]:
                    digest = rec["sha256"]
                    if digest in seen_hash:
                        rec["saved"] = False
                        rec["skipped_existing_hash"] = True
                    else:
                        (DEST / name).write_bytes(body)
                        rec["saved"] = True
                        seen_hash[digest] = name
                else:
                    rec["saved"] = False
                print(f"OK {rec['status']} {rec['bytes']} {name} saved={rec.get('saved')}")
        except HTTPError as exc:
            rec.update({"status": exc.code, "error": str(exc.reason), "saved": False})
            print("HTTP", exc.code, name)
        except (URLError, TimeoutError, OSError) as exc:
            rec.update({"status": None, "error": str(exc), "saved": False})
            print("ERR", name, exc)
        results.append(rec)
        time.sleep(0.12)
    REPORT.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print("SAVED", sum(1 for r in results if r.get("saved")), "/", len(results))


if __name__ == "__main__":
    main()
