"""NJ-INV-001C enforcement coverage manifest. Search listings are not evidence."""

from __future__ import annotations

import csv
import hashlib
from dataclasses import asdict, dataclass
from pathlib import Path

from ith_ingestion.nj_bos.classify import is_waf_block, normalize_source_url
from ith_ingestion.nj_bos.parse import occurrence_from_pdf_url, url_filename

DISCOVERY_PREVIOUS = "PREVIOUSLY_ACQUIRED_OFFICIAL_PDF"
DISCOVERY_DIRECT = "OFFICIAL_DIRECT_DOCUMENT_REFERENCE"
DISCOVERY_OAG = "OFFICIAL_OAG_RELEASE"
DISCOVERY_NEWS = "OFFICIAL_NEWS_PAGE"
DISCOVERY_INDEX = "OFFICIAL_INDEX"


@dataclass
class CoverageRow:
    source_occurrence_id: str
    official_source_family: str
    official_source_page: str
    official_pdf_url: str
    original_discovery_method: str
    respondent_caption: str
    document_title: str
    document_date: str | None
    order_number: str | None
    docket_reference_number: str | None
    document_class: str
    content_sha256: str | None
    canonical_document_id: str | None
    acquisition_status: str
    first_seen: str
    last_seen: str
    source_year: str | None
    corpus_coverage_status: str
    crd_numbers_printed: str
    sec_identifiers_printed: str
    identity_status: str
    baseline_only: str
    notes: str

    def as_dict(self) -> dict:
        return asdict(self)


def coverage_state_for_html(html: str, byte_length: int | None = None) -> str:
    if is_waf_block(html, byte_length):
        return "SOURCE_ACCESS_BLOCKED"
    return "ACQUIRED_CURRENT_SNAPSHOT"


def never_zero_from_block(state: str) -> bool:
    return state != "ACQUIRED_COMPLETE"


def row_from_pdf_url(
    url: str,
    *,
    discovery: str,
    family: str = "dca_actions_pdf",
    source_page: str = "https://www.njconsumeraffairs.gov/Actions/",
    sha256: str | None = None,
    document_class: str = "UNKNOWN",
    date: str | None = None,
) -> CoverageRow:
    occ = occurrence_from_pdf_url(url)
    name = url_filename(url)
    year = (date or occ.action_date or "")[:4] or None
    digest = sha256
    canonical = f"nj-bos:{digest[:16]}" if digest else None
    return CoverageRow(
        source_occurrence_id=occ.occurrence_fingerprint,
        official_source_family=family,
        official_source_page=source_page,
        official_pdf_url=normalize_source_url(url),
        original_discovery_method=discovery,
        respondent_caption=name,
        document_title=name,
        document_date=date or occ.action_date,
        order_number=None,
        docket_reference_number=None,
        document_class=document_class,
        content_sha256=digest,
        canonical_document_id=canonical,
        acquisition_status="DOCUMENT_DOWNLOADED" if digest else "INDEX_ONLY",
        first_seen="2026-09-02",
        last_seen="2026-09-02",
        source_year=year,
        corpus_coverage_status="ACQUIRED_PARTIAL_HISTORY",
        crd_numbers_printed="",
        sec_identifiers_printed="",
        identity_status="UNRESOLVED",
        baseline_only="yes",
        notes="Official Bureau-hosted PDF. Search-engine listing is not evidence.",
    )


def write_csv(path: Path, rows: list[CoverageRow]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = list(CoverageRow.__dataclass_fields__.keys())
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row.as_dict())


def fingerprint(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()
