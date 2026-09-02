"""NJ-INV-001 pipeline: acquire, parse, identity-match, baseline-only ingest."""

from __future__ import annotations

import hashlib
import json
import os
from collections import Counter
from dataclasses import asdict
from pathlib import Path
from typing import Any

from ith_ingestion.env import find_repo_root, load_local_env
from ith_ingestion.nj_bos.acquire import discover_indexes, download_pdfs, load_seed_urls
from ith_ingestion.nj_bos.identity import apply_publication_firewall, firm_attachment_allowed, match_party
from ith_ingestion.nj_bos.models import (
    KnownIdentity,
    PipelineReport,
    RegulatoryDocument,
    RegulatoryEvent,
    SourceCoverage,
    SourceOccurrence,
)
from ith_ingestion.nj_bos.parse import occurrence_from_pdf_url, parse_action_index, parse_document_text


class MemoryLedger:
    """Idempotent in-memory ledger used for dry-run, tests, and dormant execute."""

    def __init__(self) -> None:
        self.coverage: dict[str, SourceCoverage] = {}
        self.snapshots: dict[tuple[str, str], dict[str, Any]] = {}
        self.occurrences: dict[str, SourceOccurrence] = {}
        self.documents: dict[str, RegulatoryDocument] = {}
        self.events: dict[str, RegulatoryEvent] = {}
        self.parties: dict[tuple[str, str, str], Any] = {}
        self.identity: dict[tuple[str, str, str], Any] = {}
        self.firm_attachments: dict[tuple[str, str], dict[str, Any]] = {}
        self.monitoring: list[dict[str, Any]] = []

    def upsert_coverage(self, row: SourceCoverage) -> None:
        self.coverage[row.source_url] = row

    def upsert_snapshot(self, url: str, content_hash: str, meta: dict[str, Any]) -> None:
        self.snapshots[(url, content_hash)] = meta

    def upsert_occurrence(self, row: SourceOccurrence) -> bool:
        """Return True if this fingerprint already existed (last_seen update)."""
        existed = row.occurrence_fingerprint in self.occurrences
        self.occurrences[row.occurrence_fingerprint] = row
        return existed

    def upsert_document(self, row: RegulatoryDocument) -> bool:
        existed = row.content_hash in self.documents
        if not existed:
            self.documents[row.content_hash] = row
        return existed

    def upsert_event(self, row: RegulatoryEvent) -> bool:
        existed = row.stable_event_id in self.events
        self.events[row.stable_event_id] = row
        return existed

    def upsert_party(self, event_id: str, party) -> None:
        key = (event_id, party.legal_name, party.party_type)
        self.parties[key] = party
        self.identity[key] = {
            "match_status": party.match_status,
            "match_method": party.match_method,
            "firm_id": party.firm_id,
            "person_id": party.person_id,
            "crd": party.crd,
        }

    def attach_firm(self, event_id: str, firm_id: str, reason: str) -> None:
        self.firm_attachments[(event_id, firm_id)] = {"reason": reason}

    def counts(self) -> dict[str, int]:
        return {
            "coverage": len(self.coverage),
            "snapshots": len(self.snapshots),
            "occurrences": len(self.occurrences),
            "documents": len(self.documents),
            "events": len(self.events),
            "parties": len(self.parties),
            "identity": len(self.identity),
            "firm_attachments": len(self.firm_attachments),
            "monitoring": len(self.monitoring),
        }


def default_catalog() -> list[KnownIdentity]:
    """Synthetic catalog for tests and dry-run. Production overlay uses live CRD tables."""
    return [
        KnownIdentity(
            kind="firm",
            legal_name="Zenith Solutions, Inc.",
            crd="304732",
            registration_kind="STATE_REGISTERED_RIA",
            firm_id="firm-zenith",
            address_key="nj-07032",
        ),
        KnownIdentity(
            kind="firm",
            legal_name="Seaview Global Advisors LLC",
            crd="150337",
            registration_kind="STATE_REGISTERED_RIA",
            firm_id="firm-seaview",
        ),
        KnownIdentity(
            kind="person",
            legal_name="Steven Gluckstein",
            crd="2518385",
            person_id="person-gluckstein",
        ),
        KnownIdentity(
            kind="person",
            legal_name="Anthony Calascione",
            crd="2869991",
            person_id="person-calascione",
        ),
        KnownIdentity(
            kind="firm",
            legal_name="Garden State Securities, Inc.",
            crd="10083",
            registration_kind="BROKER_DEALER",
            firm_id="firm-gss",
        ),
        KnownIdentity(
            kind="firm",
            legal_name="Newbridge Securities Corporation",
            crd="113261",
            registration_kind="BROKER_DEALER",
            firm_id="firm-newbridge",
        ),
        KnownIdentity(
            kind="firm",
            legal_name="National Overlay Advisers LLC",
            crd="999001",
            sec_file_number="801-55555",
            registration_kind="SEC_REGISTERED_RIA",
            firm_id="firm-national-overlay",
            address_key="nj-07030",
        ),
        KnownIdentity(
            kind="firm",
            legal_name="AOS, Inc.",
            crd="128605",
            registration_kind="BROKER_DEALER",
            firm_id="firm-aos",
        ),
        KnownIdentity(
            kind="person",
            legal_name="Naman R. Patel",
            crd="placeholder-not-used",
            person_id="person-patel",
        ),
        KnownIdentity(
            kind="firm",
            legal_name="Volumetric Fund, Inc.",
            registration_kind=None,
            firm_id="firm-volumetric",
        ),
    ]


def ingest_parsed_event(
    ledger: MemoryLedger,
    event: RegulatoryEvent,
    catalog: list[KnownIdentity],
    *,
    context: str = "",
) -> None:
    for party in event.parties:
        match_party(party, catalog, context=context)
        apply_publication_firewall(party)
        ledger.upsert_party(event.stable_event_id, party)
        if firm_attachment_allowed(party) and party.firm_id:
            ledger.attach_firm(event.stable_event_id, party.firm_id, "firm_is_respondent")
    event.public_eligibility = "internal_only"
    event.monitoring_state = "baseline_only"
    ledger.upsert_event(event)


def ingest_document(
    ledger: MemoryLedger,
    document: RegulatoryDocument,
    catalog: list[KnownIdentity],
) -> RegulatoryEvent | None:
    existed = ledger.upsert_document(document)
    ledger.upsert_snapshot(document.source_url, document.content_hash, {"bytes": document.byte_length})
    text = document.extracted_text or ""
    if not text:
        return None
    event = parse_document_text(
        text,
        source_url=document.source_url,
        content_hash=document.content_hash,
        filename=document.source_url,
    )
    ingest_parsed_event(ledger, event, catalog, context=text[:4000])
    return event if not existed else event


def run_from_texts(
    texts: list[tuple[str, str, str]],
    catalog: list[KnownIdentity] | None = None,
    ledger: MemoryLedger | None = None,
) -> tuple[MemoryLedger, PipelineReport]:
    """texts: list of (source_url, text, content_hash)."""
    ledger = ledger or MemoryLedger()
    catalog = catalog or default_catalog()
    for url, text, digest in texts:
        digest = digest or hashlib.sha256(text.encode()).hexdigest()
        doc = RegulatoryDocument(
            canonical_document_id=f"nj-bos:{digest[:16]}",
            content_hash=digest,
            source_url=url,
            byte_length=len(text.encode()),
            text_extraction_state="EXTRACTED",
            extracted_text=text,
        )
        occ = occurrence_from_pdf_url(url)
        occ.acquisition_state = "DOCUMENT_DOWNLOADED"
        ledger.upsert_occurrence(occ)
        ingest_document(ledger, doc, catalog)
    return ledger, build_report(ledger, dry_run=True)


def build_report(ledger: MemoryLedger, *, dry_run: bool, blocker: str | None = None) -> PipelineReport:
    events = list(ledger.events.values())
    parties = list(ledger.parties.values())
    report = PipelineReport(
        dry_run=dry_run,
        baseline_only=True,
        coverage=[asdict(row) for row in ledger.coverage.values()],
        snapshots=len(ledger.snapshots),
        occurrences=len(ledger.occurrences),
        documents=len(ledger.documents),
        unique_hashes=len(ledger.documents),
        events=len(events),
        parties=len(parties),
        identity_rows=len(ledger.identity),
        firm_attachments=len(ledger.firm_attachments),
        monitoring_events=len(ledger.monitoring),
        skipped_existing_hash=sum(
            1 for occ in ledger.occurrences.values() if occ.acquisition_state == "SKIPPED_EXISTING_HASH"
        ),
        ocr_backlog=sum(1 for doc in ledger.documents.values() if doc.ocr_required),
        unavailable_documents=sum(
            1
            for occ in ledger.occurrences.values()
            if occ.acquisition_state in {"DOCUMENT_UNAVAILABLE", "HTTP_404"}
        ),
        event_class_counts=dict(Counter(e.event_class for e in events)),
        procedural_counts=dict(Counter(e.procedural_status for e in events)),
        party_type_counts=dict(Counter(p.party_type for p in parties)),
        match_status_counts=dict(Counter(p.match_status for p in parties)),
        production_blocker=blocker,
        notes=[
            "First corpus is baseline-only. Historical monitoring alerts must be zero.",
            "All NJ evidence is internal-only. Individuals are never public.",
        ],
    )
    return report


def authorized_database() -> tuple[bool, str | None]:
    load_local_env()
    url = os.environ.get("INGESTION_DATABASE_URL") or os.environ.get("DATABASE_URL")
    if not url:
        return False, "No authorized InvestorTrustHub DATABASE_URL in this worktree."
    return True, None


def run_nj_bos(
    *,
    dry_run: bool = True,
    fetch_live: bool = False,
    download: bool = False,
    skip_pdfs: bool = False,
    catalog: list[KnownIdentity] | None = None,
    ledger: MemoryLedger | None = None,
    root: Path | None = None,
) -> PipelineReport:
    root = root or find_repo_root()
    ledger = ledger or MemoryLedger()
    catalog = catalog or default_catalog()
    fixture_urls = root / "data" / "fixtures" / "nj-inv-001" / "official-pdf-urls.txt"
    html_dir = root / "data" / "raw" / "nj-bos" / "html"
    pdf_dir = root / "data" / "raw" / "nj-bos" / "pdfs"
    report_path = root / "data" / "reports" / "nj-inv-001" / "pipeline.json"

    for row in discover_indexes(html_dir if html_dir.exists() else html_dir, fetch_live=fetch_live):
        ledger.upsert_coverage(row)

    urls = load_seed_urls(fixture_urls) if fixture_urls.exists() else []
    if download and not skip_pdfs and urls:
        existing = set(ledger.documents)
        docs, occs, _stats = download_pdfs(urls, pdf_dir, existing_hashes=existing)
        for occ in occs:
            ledger.upsert_occurrence(occ)
        for doc in docs:
            ingest_document(ledger, doc, catalog)
    elif skip_pdfs:
        for url in urls:
            occ = occurrence_from_pdf_url(url)
            occ.acquisition_state = "INDEX_ONLY"
            ledger.upsert_occurrence(occ)
    else:
        # Local already-downloaded PDFs, if present.
        if pdf_dir.exists():
            for path in sorted(pdf_dir.glob("*.pdf")):
                data = path.read_bytes()
                digest = hashlib.sha256(data).hexdigest()
                from ith_ingestion.nj_bos.acquire import extract_pdf_text

                text, state, ocr = extract_pdf_text(data)
                url = f"https://www.njconsumeraffairs.gov/Actions/{path.name}"
                occ = occurrence_from_pdf_url(url)
                occ.acquisition_state = "DOCUMENT_DOWNLOADED"
                ledger.upsert_occurrence(occ)
                ingest_document(
                    ledger,
                    RegulatoryDocument(
                        canonical_document_id=f"nj-bos:{digest[:16]}",
                        content_hash=digest,
                        source_url=occ.source_url,
                        byte_length=len(data),
                        text_extraction_state=state,
                        ocr_required=ocr,
                        extracted_text=text,
                    ),
                    catalog,
                )

    db_ok, blocker = authorized_database()
    if not db_ok:
        blocker = blocker
    elif not dry_run:
        blocker = "Authorized URL present but production execute is operator-gated in the runbook."
    report = build_report(ledger, dry_run=dry_run, blocker=blocker)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report.as_dict(), indent=2), encoding="utf-8")
    return report


def parse_index_fixture(html: str, source_url: str, ledger: MemoryLedger | None = None) -> MemoryLedger:
    ledger = ledger or MemoryLedger()
    coverage, entries = parse_action_index(html, source_url)
    ledger.upsert_coverage(coverage)
    for occ in entries:
        ledger.upsert_occurrence(occ)
    return ledger
