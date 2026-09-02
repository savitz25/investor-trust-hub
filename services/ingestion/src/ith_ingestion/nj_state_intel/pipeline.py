"""NJ-INV-002 pipeline: coverage, exam intel, filings, policy, snapshot. Baseline-only."""

from __future__ import annotations

import hashlib
import json
import os
from dataclasses import asdict, dataclass, field
from datetime import date
from pathlib import Path
from typing import Any

from ith_ingestion.env import find_repo_root, load_local_env
from ith_ingestion.nj_bos.acquire import extract_pdf_text, load_seed_urls
from ith_ingestion.nj_state_intel.coverage import (
    DISCOVERY_DIRECT,
    DISCOVERY_NEWS,
    DISCOVERY_OAG,
    DISCOVERY_PREVIOUS,
    CoverageRow,
    coverage_state_for_html,
    row_from_pdf_url,
    write_csv,
)
from ith_ingestion.nj_state_intel.exam import (
    ExamPackage,
    parse_deadline,
    parse_questions,
    topic_timeline,
)
from ith_ingestion.nj_state_intel.filings import inventory
from ith_ingestion.nj_state_intel.policy import iar_ce_observation, known_general_orders

NEW_ENFORCEMENT = {
    "https://www.njconsumeraffairs.gov/Actions/Wurdemann_RevOrder_3May2024.pdf": DISCOVERY_DIRECT,
    "https://www.njconsumeraffairs.gov/News/PressAttachments/10052018-press-attachment.pdf": DISCOVERY_NEWS,
    "https://www.njoag.gov/wp-content/uploads/2026/02/2026-0225_Patel-and-Arya-International-Summary-Cease-and-Desist-Order.pdf": DISCOVERY_OAG,
}


@dataclass
class IntelReport:
    dry_run: bool
    baseline_only: bool
    coverage_rows: int = 0
    unique_enforcement_documents: int = 0
    newly_discovered: int = 0
    exam_years: list[int] = field(default_factory=list)
    exam_questions: int = 0
    filing_classes: int = 0
    general_orders: int = 0
    state_ria_rows: int = 0
    monitoring_events: int = 0
    coverage_states: dict[str, str] = field(default_factory=dict)
    production_blocker: str | None = None
    notes: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


def _hash_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build_enforcement_coverage(root: Path) -> list[CoverageRow]:
    seed = load_seed_urls(root / "data" / "fixtures" / "nj-inv-001" / "official-pdf-urls.txt")
    pdf_dir = root / "data" / "raw" / "nj-bos" / "pdfs"
    hashes: dict[str, str] = {}
    if pdf_dir.exists():
        for path in pdf_dir.glob("*.pdf"):
            hashes[path.name] = _hash_file(path)
    rows: list[CoverageRow] = []
    seen_url: set[str] = set()
    for url in seed:
        name = url.rstrip("/").rsplit("/", 1)[-1]
        from urllib.parse import unquote

        name = unquote(name)
        digest = hashes.get(name)
        rows.append(
            row_from_pdf_url(
                url,
                discovery=DISCOVERY_PREVIOUS,
                sha256=digest,
                document_class="ENFORCEMENT",
            )
        )
        seen_url.add(url.split("?")[0])
    for url, method in NEW_ENFORCEMENT.items():
        name = url.rstrip("/").rsplit("/", 1)[-1]
        digest = hashes.get(name)
        alt = root / "data" / "raw" / "nj-bos" / "pdfs" / name
        if alt.exists():
            digest = _hash_file(alt)
        rows.append(
            row_from_pdf_url(
                url,
                discovery=method,
                family="enforcement_supplement",
                sha256=digest,
                document_class="ENFORCEMENT",
            )
        )
    return rows


def historical_exam_packages() -> list[ExamPackage]:
    """Official NJOAG/DCA announcements. Do not invent historical question sets."""
    return [
        ExamPackage(
            exam_year=2022,
            release_date="2022-06-15",
            deadline=None,
            sample_exam_url=None,
            sample_exam_hash=None,
            announcement_url="https://www.njoag.gov/new-jersey-bureau-of-securities-announces-the-launch-of-the-annual-examination-of-investment-advisers/",
            firm_population_source_text=None,
            coverage_state="ACQUIRED_PARTIAL_HISTORY",
            topics=["NFT", "CRYPTOCURRENCY", "DIGITAL_ASSETS", "COMPLIANCE_POLICIES"],
            notes=["Announcement only. Historical question set not reconstructed."],
        ),
        ExamPackage(
            exam_year=2023,
            release_date="2023-06-14",
            deadline="2023-07-13",
            sample_exam_url=None,
            sample_exam_hash=None,
            announcement_url="https://www.njoag.gov/new-jersey-bureau-of-securities-announces-launch-of-annual-investment-adviser-examination/",
            firm_population_source_text=None,
            coverage_state="ACQUIRED_PARTIAL_HISTORY",
            topics=["FIRM_ORGANIZATION"],
            notes=["Announcement describes risk identification; no public sample exam acquired."],
        ),
        ExamPackage(
            exam_year=2024,
            release_date="2024-05-13",
            deadline="2024-06-17",
            sample_exam_url=None,
            sample_exam_hash=None,
            announcement_url="https://www.njoag.gov/new-jersey-bureau-of-securities-announces-annual-examination-of-investment-advisers-is-underway-2024-0513/",
            firm_population_source_text="nearly 900",
            coverage_state="ACQUIRED_PARTIAL_HISTORY",
            topics=["ARTIFICIAL_INTELLIGENCE", "ADVERTISING_MARKETING", "FIRM_ORGANIZATION", "INVESTMENT_CONCENTRATION"],
            notes=["AI added per official announcement. Rounded population is not a denominator."],
        ),
        ExamPackage(
            exam_year=2025,
            release_date="2025-06-04",
            deadline="2025-06-18",
            sample_exam_url="https://www.njconsumeraffairs.gov/bos/Pages/Investment-Adviser-Written-Examination.aspx",
            sample_exam_hash=None,
            announcement_url="https://www.njoag.gov/new-jersey-bureau-of-securities-announces-annual-examination-of-investment-advisers-is-underway/",
            firm_population_source_text="nearly 800",
            coverage_state="ACQUIRED_PARTIAL_HISTORY",
            topics=["OUTSIDE_BUSINESS_ACTIVITIES", "CONFLICTS_OF_INTEREST", "FIRM_ORGANIZATION", "REPRESENTATIVE_OVERSIGHT"],
            notes=["OBA emphasis per official announcement. Rounded population is not a denominator."],
        ),
    ]


def load_2026_exam(root: Path) -> ExamPackage:
    fixture = root / "data" / "fixtures" / "nj-inv-002" / "exam-2026-sample.txt"
    exam_pdf = root / "data" / "raw" / "nj-bos" / "exam" / "Sample-Investment-Adviser-Exam.pdf"
    text = ""
    digest = None
    source_doc = "fixture"
    if exam_pdf.exists():
        extracted, _state, _ocr = extract_pdf_text(exam_pdf.read_bytes())
        if len(extracted) >= 80:
            text = extracted
            digest = _hash_file(exam_pdf)
            source_doc = exam_pdf.name
    if not text and fixture.exists():
        fixture_text = fixture.read_text(encoding="utf-8")
        text = fixture_text
        source_doc = fixture.name
        digest = hashlib.sha256(fixture_text.encode()).hexdigest()
    questions = parse_questions(text, 2026, source_document=source_doc, source_hash=digest)
    topics = sorted({q.topic for q in questions}) or ["FIRM_ORGANIZATION", "AUM_OR_ASSETS", "CUSTODY", "OUTSIDE_BUSINESS_ACTIVITIES"]
    return ExamPackage(
        exam_year=2026,
        release_date="2026-06-08",
        deadline=parse_deadline(text) or "2026-06-30",
        sample_exam_url="https://www.njconsumeraffairs.gov/bos/bosforms/Sample-Investment-Adviser-Exam.pdf",
        sample_exam_hash=digest,
        announcement_url="https://www.njconsumeraffairs.gov/bos/Pages/Investment-Adviser-Written-Examination.aspx",
        firm_population_source_text=None,
        coverage_state="ACQUIRED_CURRENT_SNAPSHOT",
        questions=questions,
        topics=topics,
        notes=["Public sample examination. Firm answers are not acquired. Not a pass/fail credential."],
    )


def source_coverage_map(root: Path) -> dict[str, str]:
    html_dir = root / "data" / "raw" / "nj-bos" / "html"
    mapping = {
        "bos_html_indexes": "SOURCE_ACCESS_BLOCKED",
        "enforcement_pdfs": "ACQUIRED_PARTIAL_HISTORY",
        "njoag_press": "ACQUIRED_PARTIAL_HISTORY",
        "annual_ia_exam_2026": "ACQUIRED_CURRENT_SNAPSHOT",
        "annual_ia_exam_history": "ACQUIRED_PARTIAL_HISTORY",
        "state_ria_roster": "SOURCE_AVAILABLE_BY_REQUEST",
        "iapd_bulk_nj_only": "SOURCE_AVAILABLE_BY_REQUEST",
        "general_orders_library": "SOURCE_ACCESS_BLOCKED",
        "issuer_filing_index": "SOURCE_AVAILABLE_BY_REQUEST",
        "crowdfunding_iso_registry": "SOURCE_AVAILABLE_BY_REQUEST",
        "firm_exam_answers": "SOURCE_NOT_PUBLIC_AT_FIRM_GRAIN",
        "onsite_exam_reports": "SOURCE_NOT_PUBLIC_AT_FIRM_GRAIN",
        "iar_directory": "SOURCE_AVAILABLE_BY_REQUEST",
    }
    if html_dir.exists():
        for path in html_dir.glob("*.html"):
            body = path.read_bytes()
            mapping[path.stem] = coverage_state_for_html(body.decode("utf-8", errors="replace"), len(body))
    return mapping


def build_snapshot(root: Path, coverage: list[CoverageRow], exams: list[ExamPackage]) -> dict[str, Any]:
    filings = inventory()
    orders = known_general_orders()
    ce = iar_ce_observation()
    timeline = topic_timeline(exams)
    q2026 = next((p for p in exams if p.exam_year == 2026), None)
    unique_hashes = {r.content_sha256 for r in coverage if r.content_sha256}
    return {
        "ticket": "NJ-INV-002",
        "as_of": date.today().isoformat(),
        "public_eligibility": "internal_only",
        "publication_gate": "OFF",
        "baseline_only": True,
        "historical_alerts": 0,
        "identity": {
            "current_nj_state_ria_firms": None,
            "denominator_status": "BLOCKED_NO_AUTHORITATIVE_ROSTER",
            "rounded_press_context_only": [p.firm_population_source_text for p in exams if p.firm_population_source_text],
            "state_vs_sec": "STATE_REGISTERED_RIA != SEC_REGISTERED_RIA",
            "transition_model": "same CRD remains one firm",
        },
        "enforcement": {
            "acquired_documents": len({r.official_pdf_url for r in coverage}),
            "unique_hashes": len(unique_hashes),
            "coverage": "ACQUIRED_PARTIAL_HISTORY",
            "complete_years": [],
            "earliest": min((r.document_date for r in coverage if r.document_date), default=None),
            "latest": max((r.document_date for r in coverage if r.document_date), default=None),
            "enforcement_rate": "BLOCKED_NO_DENOMINATOR",
        },
        "annual_exam": {
            "years": [p.exam_year for p in exams],
            "current_year": 2026,
            "deadline": q2026.deadline if q2026 else None,
            "question_count_2026": len(q2026.questions) if q2026 else 0,
            "topic_timeline": timeline,
            "pass_fail_metric": False,
            "firm_results": "SOURCE_NOT_PUBLIC_AT_FIRM_GRAIN",
        },
        "general_orders": {
            "modeled_current": len([o for o in orders if o.current_status == "CURRENT"]),
            "library_coverage": "SOURCE_ACCESS_BLOCKED",
            "is_firm_enforcement": False,
        },
        "issuer_exemption": {
            "filing_classes": [f.filing_class for f in filings],
            "public_index": False,
            "exemption_is_endorsement": False,
            "form_d_join": "EXACT_SEC_IDENTIFIER_ONLY",
        },
        "iar_ce_policy": ce,
        "blocked_metrics": [
            "enforcement_rate_per_state_ria",
            "exam_pass_rate",
            "trust_score",
            "adviser_ranking",
            "crowdfunding_performance",
        ],
        "approved_internal_metrics": [
            "acquired_enforcement_document_count",
            "exam_years_with_public_package_or_announcement",
            "exam_topic_families_by_year",
            "issuer_filing_class_inventory",
            "coverage_state_by_source_family",
        ],
    }


def run_nj_intel(*, dry_run: bool = True, root: Path | None = None) -> IntelReport:
    root = root or find_repo_root()
    load_local_env()
    coverage = build_enforcement_coverage(root)
    write_csv(root / "artifacts" / "nj-inv-001c-enforcement-coverage.csv", coverage)
    exams = historical_exam_packages() + [load_2026_exam(root)]
    snapshot = build_snapshot(root, coverage, exams)
    snap_path = root / "artifacts" / "nj-inv-002-audited-state-snapshot.json"
    snap_path.parent.mkdir(parents=True, exist_ok=True)
    snap_path.write_text(json.dumps(snapshot, indent=2), encoding="utf-8")
    report_path = root / "data" / "reports" / "nj-inv-002" / "pipeline.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    db = os.environ.get("INGESTION_DATABASE_URL") or os.environ.get("DATABASE_URL")
    blocker = None if db else "No authorized InvestorTrustHub DATABASE_URL in this worktree."
    report = IntelReport(
        dry_run=dry_run,
        baseline_only=True,
        coverage_rows=len(coverage),
        unique_enforcement_documents=len({r.official_pdf_url for r in coverage}),
        newly_discovered=sum(1 for r in coverage if r.original_discovery_method != DISCOVERY_PREVIOUS),
        exam_years=[p.exam_year for p in exams],
        exam_questions=sum(len(p.questions) for p in exams),
        filing_classes=len(inventory()),
        general_orders=len(known_general_orders()),
        state_ria_rows=0,
        monitoring_events=0,
        coverage_states=source_coverage_map(root),
        production_blocker=blocker,
        notes=[
            "First observations are baseline-only. Historical alerts must be zero.",
            "Annual exam is not a firm pass/fail credential.",
            "No public NJ route.",
        ],
    )
    report_path.write_text(json.dumps(report.as_dict(), indent=2), encoding="utf-8")
    return report


def formatting_only_change_creates_event(before_hash: str, after_hash: str, semantic_equal: bool) -> bool:
    if semantic_equal:
        return False
    return before_hash != after_hash
