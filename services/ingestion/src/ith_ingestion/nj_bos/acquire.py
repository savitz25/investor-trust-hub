"""Acquire official NJ BOS PDFs. Do not scrape around WAF/CAPTCHA."""

from __future__ import annotations

import hashlib
import json
import ssl
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from ith_ingestion.nj_bos.classify import is_waf_block, normalize_source_url
from ith_ingestion.nj_bos.models import RegulatoryDocument, SourceCoverage, SourceOccurrence
from ith_ingestion.nj_bos.parse import occurrence_from_pdf_url, parse_action_index, url_filename

UA = "InvestorTrustHub/NJ-INV-001 (research acquisition; +https://www.investortrusthub.com)"
CTX = ssl.create_default_context()

INDEX_URLS = {
    "bos_home": "https://www.njconsumeraffairs.gov/bos/",
    "bos_faq": "https://www.njconsumeraffairs.gov/bos/Pages/FAQinvestor.aspx",
    "bos_news": "https://www.njconsumeraffairs.gov/bos/Pages/news.aspx",
    "bos_forms": "https://www.njconsumeraffairs.gov/bos/Pages/industryforms.aspx",
    "dca_actions": "https://www.njconsumeraffairs.gov/Pages/actions.aspx",
    "orders_filed": "https://www.njconsumeraffairs.gov/bos/Pages/OrdersandFiledComplaints.aspx",
    "actions_lib": "https://www.njconsumeraffairs.gov/Actions/Pages/default.aspx",
}


def fetch_bytes(url: str, timeout: int = 60) -> tuple[int | None, bytes, str | None]:
    req = Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    try:
        with urlopen(req, context=CTX, timeout=timeout) as resp:
            body = resp.read()
            return resp.status, body, resp.headers.get("Content-Type")
    except HTTPError as exc:
        body = exc.read() if exc.fp else b""
        return exc.code, body, None
    except (URLError, TimeoutError, OSError):
        return None, b"", None


def load_seed_urls(path: Path) -> list[str]:
    urls: list[str] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        text = line.strip()
        if not text or text.startswith("#"):
            continue
        urls.append(normalize_source_url(text))
    return list(dict.fromkeys(urls))


def discover_indexes(html_dir: Path | None = None, fetch_live: bool = False) -> list[SourceCoverage]:
    rows: list[SourceCoverage] = []
    for key, url in INDEX_URLS.items():
        body = b""
        status = None
        if html_dir and (html_dir / f"{key}.html").exists():
            body = (html_dir / f"{key}.html").read_bytes()
            status = 200
        elif fetch_live:
            status, body, _ = fetch_bytes(url)
            if html_dir is not None and body:
                html_dir.mkdir(parents=True, exist_ok=True)
                (html_dir / f"{key}.html").write_bytes(body)
            time.sleep(0.15)
        text = body.decode("utf-8", errors="replace") if body else ""
        if not body or is_waf_block(text, len(body)):
            state = "SOURCE_ACCESS_BLOCKED"
            notes = "Official HTML index is WAF-gated. Not a zero-action finding."
        elif status == 404:
            state = "SOURCE_NOT_ACQUIRED"
            notes = "HTTP 404. Period is unavailable, not zero."
        else:
            _, entries = parse_action_index(text, url)
            state = "ACQUIRED_PARTIAL_HISTORY" if entries else "ACQUIRED_CURRENT_SNAPSHOT"
            notes = f"Parsed {len(entries)} index hrefs."
        rows.append(
            SourceCoverage(
                source_family=key,
                source_url=normalize_source_url(url),
                coverage_state=state,
                source_hash=hashlib.sha256(body).hexdigest() if body else None,
                notes=notes,
                raw_value={"status": status, "bytes": len(body)},
            )
        )
    rows.append(
        SourceCoverage(
            source_family="form2_crd_iard",
            source_url="https://www.njconsumeraffairs.gov/bos/Pages/industryforms.aspx",
            coverage_state="SOURCE_AVAILABLE_BY_REQUEST",
            notes="NJBOS Form 2 is the official CRD/IARD request path. No public bulk NJ state-RIA roster.",
        )
    )
    return rows


def extract_pdf_text(data: bytes) -> tuple[str, str, bool]:
    """Return (text, extraction_state, ocr_required)."""
    try:
        import io

        from pypdf import PdfReader  # type: ignore

        reader = PdfReader(io.BytesIO(data))
        pages = []
        for page in reader.pages:
            pages.append(page.extract_text() or "")
        text = "\n".join(pages).strip()
        if len(text) < 80:
            return text, "OCR_REQUIRED", True
        return text, "EXTRACTED", False
    except Exception:
        # Uncompressed literal strings as a last resort.
        chunks = []
        for match in re_literals(data):
            chunks.append(match)
        text = "\n".join(chunks).strip()
        if len(text) < 80:
            return text, "OCR_REQUIRED", True
        return text, "CRUDE_EXTRACT", False


def re_literals(data: bytes) -> list[str]:
    import re

    out: list[str] = []
    for match in re.finditer(rb"\((?:\\.|[^\\)]){6,}\)", data):
        raw = match.group(0)[1:-1]
        try:
            text = raw.decode("latin-1")
        except UnicodeDecodeError:
            continue
        text = text.replace("\\n", " ").replace("\\r", " ").replace("\\t", " ")
        if sum(ch.isalpha() for ch in text) > 8:
            out.append(text)
    return out[:400]


def download_pdfs(
    urls: list[str],
    dest: Path,
    existing_hashes: set[str] | None = None,
) -> tuple[list[RegulatoryDocument], list[SourceOccurrence], dict[str, int]]:
    dest.mkdir(parents=True, exist_ok=True)
    existing_hashes = existing_hashes or set()
    documents: list[RegulatoryDocument] = []
    occurrences: list[SourceOccurrence] = []
    stats = {
        "downloaded": 0,
        "skipped_existing_hash": 0,
        "unavailable": 0,
        "duplicate_groups": 0,
    }
    hash_to_id: dict[str, str] = {}
    for url in urls:
        occ = occurrence_from_pdf_url(url)
        status, body, content_type = fetch_bytes(url)
        time.sleep(0.12)
        if status != 200 or not body or not (content_type or "").lower().startswith("application/pdf") and not body.startswith(b"%PDF"):
            occ.acquisition_state = "HTTP_404" if status == 404 else "DOCUMENT_UNAVAILABLE"
            occ.raw_value["status"] = status
            occurrences.append(occ)
            stats["unavailable"] += 1
            continue
        digest = hashlib.sha256(body).hexdigest()
        if digest in existing_hashes or digest in hash_to_id:
            occ.acquisition_state = "SKIPPED_EXISTING_HASH"
            occ.raw_value["content_hash"] = digest
            occurrences.append(occ)
            stats["skipped_existing_hash"] += 1
            if digest in hash_to_id:
                stats["duplicate_groups"] += 1
            continue
        name = url_filename(url)
        path = dest / name
        path.write_bytes(body)
        text, extract_state, ocr = extract_pdf_text(body)
        canonical = f"nj-bos:{digest[:16]}"
        hash_to_id[digest] = canonical
        existing_hashes.add(digest)
        documents.append(
            RegulatoryDocument(
                canonical_document_id=canonical,
                content_hash=digest,
                source_url=normalize_source_url(url),
                byte_length=len(body),
                document_type="pdf",
                text_extraction_state=extract_state,
                ocr_required=ocr,
                extracted_text=text,
                public_eligibility="internal_only",
                monitoring_state="baseline_only",
                raw_metadata={"path": str(path), "content_type": content_type},
            )
        )
        occ.acquisition_state = "DOCUMENT_DOWNLOADED"
        occ.raw_value["content_hash"] = digest
        occurrences.append(occ)
        stats["downloaded"] += 1
    return documents, occurrences, stats


def write_manifest(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
