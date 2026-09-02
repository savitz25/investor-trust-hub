"""Acquire official NJ BOS / NJOAG public documents. No WAF bypass."""
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
DEST_PDF = ROOT / "data" / "raw" / "nj-bos" / "pdfs"
DEST_HTML = ROOT / "data" / "raw" / "nj-bos" / "html"
DEST_FORMS = ROOT / "data" / "raw" / "nj-bos" / "forms"
DEST_EXAM = ROOT / "data" / "raw" / "nj-bos" / "exam"
REPORT = ROOT / "data" / "reports" / "nj-inv-002" / "acquire.json"
UA = "InvestorTrustHub/NJ-INV-002 (research acquisition; +https://www.investortrusthub.com)"
CTX = ssl.create_default_context()

PDFS = [
    # 2026 annual exam package
    "https://www.njconsumeraffairs.gov/bos/bosforms/Sample-Investment-Adviser-Exam.pdf",
    "https://www.njconsumeraffairs.gov/bos/Documents/INVESTMENT-ADVISER-ALERT-031725.pdf",
    # issuer / exemption / crowdfunding forms
    "https://www.njconsumeraffairs.gov/bos/bosforms/Private-Placement-Report-Form-NJBOS-Form-1.pdf",
    "https://www.njconsumeraffairs.gov/bos/bosforms/Form-12-Investor-Certification-Form.pdf",
    "https://www.njconsumeraffairs.gov/bos/bosforms/Form-13-Investor-Legend-Form.pdf",
    "https://www.njconsumeraffairs.gov/bos/bosforms/Instructions3-Small-Corporate-Offering-Registration-SCOR.pdf",
    "https://www.njconsumeraffairs.gov/bos/bosforms/Instructions5-Investment-Company-Notice-Filing.pdf",
    "https://www.njconsumeraffairs.gov/bos/bosforms/Instructions6-Agent-of-the-Issuer-Registration.pdf",
    "https://www.njconsumeraffairs.gov/bos/bosforms/Instructions1-Rescission-Offer.pdf",
    "https://www.njconsumeraffairs.gov/bos/bosforms/Certification-and-Authorization-Form-For-a-Criminal-History-Background-Check-NJBOS-4.pdf",
    # newly discovered official enforcement PDFs (not in NJ-INV-001 seed)
    "https://www.njconsumeraffairs.gov/Actions/Wurdemann_RevOrder_3May2024.pdf",
    "https://www.njconsumeraffairs.gov/News/PressAttachments/10052018-press-attachment.pdf",
    "https://www.njoag.gov/wp-content/uploads/2026/02/2026-0225_Patel-and-Arya-International-Summary-Cease-and-Desist-Order.pdf",
]

HTML = {
    "njoag_bos_archive": "https://www.njoag.gov/category/division/bureau-of-securities/",
    "njoag_exam_2025": "https://www.njoag.gov/new-jersey-bureau-of-securities-announces-annual-examination-of-investment-advisers-is-underway/",
    "njoag_exam_2024": "https://www.njoag.gov/new-jersey-bureau-of-securities-announces-annual-examination-of-investment-advisers-is-underway-2024-0513/",
    "njoag_exam_2023": "https://www.njoag.gov/new-jersey-bureau-of-securities-announces-launch-of-annual-investment-adviser-examination/",
    "njoag_exam_2022": "https://www.njoag.gov/new-jersey-bureau-of-securities-announces-the-launch-of-the-annual-examination-of-investment-advisers/",
    "njoag_2024_highlights": "https://www.njoag.gov/ag-platkin-division-of-consumer-affairs-announce-2024-consumer-protection-enforcement-highlights/",
    "dca_exam_2025_news": "https://www.njconsumeraffairs.gov/News/Pages/060425.aspx",
    "bos_exam_landing": "https://www.njconsumeraffairs.gov/bos/Pages/Annual-Investment-Adviser-Exam.aspx",
    "bos_exam_2026": "https://www.njconsumeraffairs.gov/bos/Pages/Investment-Adviser-Written-Examination.aspx",
    "bos_glossary": "https://www.njconsumeraffairs.gov/bos/Pages/Glossary.aspx",
    "bos_industry": "https://www.njconsumeraffairs.gov/bos/Pages/industry.aspx",
    "bos_forms": "https://www.njconsumeraffairs.gov/bos/Pages/industryforms.aspx",
    "bos_exam_req": "https://www.njconsumeraffairs.gov/bos/Pages/examrequirements.aspx",
    "bos_iar_ce": "https://www.njconsumeraffairs.gov/bos/Pages/Webinar-FAQ.aspx",
    "bos_faq_industry": "https://www.njconsumeraffairs.gov/bos/Pages/FAQindustry.aspx",
    "dca_actions": "https://www.njconsumeraffairs.gov/Pages/actions.aspx",
}


def fetch(url: str) -> tuple[int | None, bytes, str | None]:
    req = Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    try:
        with urlopen(req, context=CTX, timeout=60) as resp:
            return resp.status, resp.read(), resp.headers.get("Content-Type")
    except HTTPError as exc:
        return exc.code, exc.read() if exc.fp else b"", None
    except (URLError, TimeoutError, OSError) as exc:
        return None, str(exc).encode(), None


def save_name(url: str) -> str:
    return unquote(urlparse(url).path.rstrip("/").rsplit("/", 1)[-1]) or "index.html"


def main() -> None:
    for path in (DEST_PDF, DEST_HTML, DEST_FORMS, DEST_EXAM, REPORT.parent):
        path.mkdir(parents=True, exist_ok=True)
    rows = []
    for url in PDFS:
        status, body, ctype = fetch(url)
        name = save_name(url)
        rec = {"url": url, "name": name, "status": status, "bytes": len(body), "ctype": ctype}
        pdf = body.startswith(b"%PDF")
        rec["pdf"] = pdf
        rec["sha256"] = hashlib.sha256(body).hexdigest() if body else None
        dest = DEST_EXAM if "Exam" in name or "ALERT" in name else DEST_FORMS if "/bosforms/" in url or "/bos/Documents/" in url else DEST_PDF
        if pdf:
            (dest / name).write_bytes(body)
            rec["saved"] = True
            rec["dest"] = str(dest.relative_to(ROOT).as_posix())
        else:
            rec["saved"] = False
        print(f"PDF {status} {len(body)} saved={rec['saved']} {name}")
        rows.append(rec)
        time.sleep(0.12)
    for key, url in HTML.items():
        status, body, ctype = fetch(url)
        rec = {
            "key": key,
            "url": url,
            "status": status,
            "bytes": len(body),
            "ctype": ctype,
            "sha256": hashlib.sha256(body).hexdigest() if body else None,
            "waf": len(body) < 500 or b"incapsula" in body.lower() or b"pardon our interruption" in body.lower(),
        }
        (DEST_HTML / f"{key}.html").write_bytes(body)
        rec["saved"] = True
        print(f"HTML {status} {len(body)} waf={rec['waf']} {key}")
        rows.append(rec)
        time.sleep(0.12)
    REPORT.write_text(json.dumps(rows, indent=2), encoding="utf-8")
    print("DONE", len(rows))


if __name__ == "__main__":
    main()
