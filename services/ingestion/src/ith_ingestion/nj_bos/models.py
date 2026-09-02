"""Dataclasses for NJ BOS enforcement ingest."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

EVENT_CLASSES = (
    "CONSENT_ORDER",
    "CEASE_AND_DESIST",
    "SUMMARY_REVOCATION",
    "REVOCATION",
    "SUSPENSION",
    "BAR",
    "FINAL_ORDER",
    "FILED_COMPLAINT",
    "CIVIL_COMPLAINT",
    "SETTLEMENT",
    "AMENDED_ORDER",
    "OTHER",
    "UNCLASSIFIED",
)

PROCEDURAL_STATUSES = ("FINAL", "PENDING", "ALLEGATION", "UNKNOWN")

PARTY_TYPES = (
    "RIA_FIRM",
    "STATE_RIA",
    "SEC_RIA",
    "BROKER_DEALER",
    "IAR",
    "AGENT",
    "ISSUER",
    "INDIVIDUAL",
    "UNREGISTERED_ENTITY",
    "OTHER",
)

MATCH_STATUSES = (
    "EXACT_CRD_FIRM",
    "EXACT_CRD_INDIVIDUAL",
    "EXACT_SEC_FILE",
    "HIGH_CONFIDENCE",
    "REVIEW_REQUIRED",
    "CONFLICT",
    "UNRESOLVED",
    "UNSAFE_REJECTED",
)


@dataclass
class MonetaryTerm:
    kind: str  # penalty | restitution | disgorgement
    amount: float | None
    nj_attribution: str = "unspecified"
    raw: str = ""


@dataclass
class EventParty:
    legal_name: str
    party_type: str
    role_in_order: str = "respondent"
    crd: str | None = None
    sec_file_number: str | None = None
    address_text: str | None = None
    match_status: str = "UNRESOLVED"
    match_method: str | None = None
    firm_id: str | None = None
    person_id: str | None = None
    public_eligibility: str = "internal_only"
    notes: str = ""
    raw_value: dict[str, Any] = field(default_factory=dict)


@dataclass
class RegulatoryEvent:
    stable_event_id: str
    event_class: str
    procedural_status: str
    caption: str
    order_number: str | None = None
    docket_number: str | None = None
    action_date: str | None = None
    source_url: str | None = None
    content_hash: str | None = None
    parties: list[EventParty] = field(default_factory=list)
    monetary: list[MonetaryTerm] = field(default_factory=list)
    has_civil_penalty: bool = False
    has_restitution: bool = False
    has_disgorgement: bool = False
    has_bar: bool = False
    has_revocation: bool = False
    has_suspension: bool = False
    has_cease_and_desist: bool = False
    hearing_rights_preserved: bool = False
    nj_monetary_attribution: str = "unspecified"
    public_eligibility: str = "internal_only"
    monitoring_state: str = "baseline_only"
    raw_value: dict[str, Any] = field(default_factory=dict)


@dataclass
class SourceOccurrence:
    source_url: str
    locator: str | None
    respondent_caption: str
    document_url: str | None
    order_number: str | None
    action_date: str | None
    acquisition_state: str
    occurrence_fingerprint: str
    raw_value: dict[str, Any] = field(default_factory=dict)


@dataclass
class RegulatoryDocument:
    canonical_document_id: str
    content_hash: str
    source_url: str
    byte_length: int
    order_number: str | None = None
    document_type: str | None = None
    text_extraction_state: str = "NOT_ATTEMPTED"
    ocr_required: bool = False
    extracted_text: str = ""
    public_eligibility: str = "internal_only"
    monitoring_state: str = "baseline_only"
    raw_metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class SourceCoverage:
    source_family: str
    source_url: str
    coverage_state: str
    source_hash: str | None = None
    notes: str = ""
    raw_value: dict[str, Any] = field(default_factory=dict)


@dataclass
class KnownIdentity:
    kind: str  # firm | person
    legal_name: str
    crd: str | None = None
    sec_file_number: str | None = None
    address_key: str | None = None
    registration_kind: str | None = None
    firm_id: str | None = None
    person_id: str | None = None
    successor_of_crd: str | None = None
    predecessor_crd: str | None = None


@dataclass
class PipelineReport:
    dry_run: bool
    baseline_only: bool
    coverage: list[dict[str, Any]] = field(default_factory=list)
    snapshots: int = 0
    occurrences: int = 0
    documents: int = 0
    unique_hashes: int = 0
    events: int = 0
    parties: int = 0
    identity_rows: int = 0
    firm_attachments: int = 0
    monitoring_events: int = 0
    skipped_existing_hash: int = 0
    duplicate_occurrence_preserved: int = 0
    ocr_backlog: int = 0
    unavailable_documents: int = 0
    event_class_counts: dict[str, int] = field(default_factory=dict)
    procedural_counts: dict[str, int] = field(default_factory=dict)
    party_type_counts: dict[str, int] = field(default_factory=dict)
    match_status_counts: dict[str, int] = field(default_factory=dict)
    production_blocker: str | None = None
    notes: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)
