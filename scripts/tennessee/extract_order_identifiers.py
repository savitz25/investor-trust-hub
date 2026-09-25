"""TN-INV-001 — bounded identifier pass over 2024-2026 Consent and Cease and Desist order PDFs.

Acquisition helper (needs Playwright + pdfplumber; not run in CI). For each listing in the window it
downloads the first listed document into the gitignored data/raw/tennessee/tn-inv-001/pdfs/ folder,
then records only printed identifiers: CRD numbers (with the word CRD next to them) and SEC file
numbers (801-/8-). No names or text are written. Output:
data/tennessee/tn-inv-001/order-document-identifiers.json (committed).
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).parent))
import tn_order_index as idx  # noqa: E402

SRC = ROOT / "data/tennessee/tn-inv-001"
PDFS = ROOT / "data/raw/tennessee/tn-inv-001/pdfs"
OUT = SRC / "order-document-identifiers.json"
WINDOW = (2024, 2026)
ARCHIVES = ("consent-orders", "cease-and-desist-orders")


def listings() -> list[dict]:
    rows = []
    for name in ARCHIVES:
        rows += [
            r
            for r in idx.parse_archive(name, (SRC / f"{name}-archive.html").read_text(encoding="utf-8"))
            if WINDOW[0] <= r["sourceYear"] <= WINDOW[1]
        ]
    return rows


async def download(rows: list[dict]) -> None:
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context()
        for r in rows:
            url = r["documents"][0]["url"]
            path = PDFS / (hashlib.sha256(url.encode()).hexdigest()[:16] + ".pdf")
            if path.exists() and path.stat().st_size > 1000:
                continue
            for attempt in range(4):
                try:
                    resp = await ctx.request.get(url, timeout=90000)
                    if resp.ok:
                        path.write_bytes(await resp.body())
                    else:
                        print("HTTP", resp.status, url)
                    break
                except Exception as e:  # tn.gov resets bursts; back off and retry
                    print("retry", attempt, url, e)
                    await asyncio.sleep(6)
            await asyncio.sleep(1.5)
        await b.close()


def identifiers(path: Path) -> dict:
    import pdfplumber

    with pdfplumber.open(path) as pdf:
        text = "\n".join((pg.extract_text() or "") for pg in pdf.pages)
        pages = len(pdf.pages)
    flat = " ".join(text.split())
    crd = sorted({m for m in re.findall(r"CRD\s*(?:No\.?|Number|#)?\s*:?\s*(?:number\s*)?(\d{3,8})", flat, re.I)}, key=int)
    sec = sorted(set(re.findall(r"\b(8(?:01)?-\d{4,6})\b", flat)))
    docket = sorted(set(re.findall(r"\b(12\.06-\d{6}J|\d{2}-\d{3,5}|TSD\s?No\.?\s?[\w-]+)\b", flat)))[:10]
    return {"pages": pages, "textChars": len(flat), "crdPrinted": crd, "secFileNumbersPrinted": sec, "docketLikePrinted": docket}


IAPD = ROOT / "data/raw/sec/form-adv/iapd-compilation-2026-09-17"
FEEDS = {"STATE": "IA_FIRM_STATE_Feed_09_17_2026.xml.gz", "SEC": "IA_FIRM_SEC_Feed_09_17_2026.xml.gz"}


def iapd_firms() -> dict[str, dict]:
    """Firm CRD -> feeds and names from the accepted 2026-09-17 IAPD compilation."""
    import gzip
    import html as h

    out: dict[str, dict] = {}
    for feed, name in FEEDS.items():
        text = gzip.open(IAPD / name).read().decode("utf-8", "replace")
        for m in re.finditer(r"<Info\b([^>]*)>", text):
            attrs = dict(re.findall(r'(\w+)="([^"]*)"', m.group(1)))
            crd = attrs.get("FirmCrdNb")
            if not crd:
                continue
            rec = out.setdefault(crd, {"feeds": set(), "names": set()})
            rec["feeds"].add(feed)
            for k in ("BusNm", "LegalNm"):
                if attrs.get(k):
                    rec["names"].add(h.unescape(attrs[k]))
    return out


def norm(s: str) -> str:
    s = re.sub(r"[^a-z0-9 ]", " ", s.lower().replace("&", " and "))
    drop = {"llc", "inc", "the", "lp", "l", "p", "co", "corp", "company", "and", "ltd", "of"}
    return " ".join(w for w in s.split() if w not in drop)


def name_guard(names: set[str], caption: str) -> bool:
    """Guard only (never a join key): the IAPD firm name appears in the listed caption."""
    cap = norm(caption)
    return any(len(n) >= 6 and n in cap for n in (norm(x) for x in names))


def main() -> None:
    rows = listings()
    captions = {r["id"]: r["captionAsListed"] for r in rows}
    firms = iapd_firms()
    PDFS.mkdir(parents=True, exist_ok=True)
    if "--download" in sys.argv:
        asyncio.run(download(rows))
    out = []
    for r in rows:
        url = r["documents"][0]["url"]
        path = PDFS / (hashlib.sha256(url.encode()).hexdigest()[:16] + ".pdf")
        rec = {"listingId": r["id"], "archive": r["archive"], "documentUrl": url}
        if not path.exists():
            rec.update({"retrieved": False})
        else:
            data = path.read_bytes()
            rec.update({"retrieved": True, "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)})
            try:
                rec.update(identifiers(path))
            except Exception as e:
                rec.update({"parseError": type(e).__name__})
            if rec.get("textChars", 0) < 200:
                rec["imageOnlyNotOcrd"] = True
            printed = rec.pop("crdPrinted", [])
            iapd = [c for c in printed if c in firms]
            rec["crdPrintedCount"] = len(printed)
            rec["crdPrintedNotInIapdFirmFeeds"] = len(printed) - len(iapd)
            rec["iapdFirmCrdsPrinted"] = [
                {
                    "crd": c,
                    "iapdFeeds": sorted(firms[c]["feeds"]),
                    "iapdNameInCaption": name_guard(firms[c]["names"], captions[r["id"]]),
                }
                for c in iapd
            ]
        out.append(rec)
    OUT.write_text(
        json.dumps(
            {
                "version": "investor-tn-order-identifiers-v1",
                "window": list(WINDOW),
                "archives": list(ARCHIVES),
                "method": "first listed document per listing; printed CRD / SEC file numbers only; no OCR. Only CRDs that are firm CRDs in the accepted 2026-09-17 IAPD compilation are written; other printed CRDs (people, broker-dealers outside the IA feeds, withdrawn firms) are counted, not listed.",
                "extractedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "documents": out,
            },
            indent=1,
        )
        + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(len(out), "listings;", sum(1 for d in out if d.get("retrieved")), "retrieved;",
          sum(1 for d in out if d.get("crdPrintedCount")), "with CRD;", [(d["listingId"], d["iapdFirmCrdsPrinted"]) for d in out if d.get("iapdFirmCrdsPrinted")], sum(1 for d in out if d.get("imageOnlyNotOcrd")), "image-only")


if __name__ == "__main__":
    main()
