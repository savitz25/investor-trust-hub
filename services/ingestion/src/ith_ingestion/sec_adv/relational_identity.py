"""INV-NAT-002A identity and currentness contract. No production writes."""

from __future__ import annotations

import hashlib
import re
from typing import Literal

IdentityConfidence = Literal[
    "CONFIRMED",
    "HIGH_CONFIDENCE",
    "REVIEW_REQUIRED",
    "UNRESOLVED",
]

OwnerKind = Literal["PERSON", "ORGANIZATION", "UNKNOWN"]

FUND_ID_RE = re.compile(r"^805-?\d+$", re.IGNORECASE)
CRD_RE = re.compile(r"^\d{1,10}$")
FILING_ID_RE = re.compile(r"^\d+$")


def normalize_name(value: str | None) -> str:
    return " ".join((value or "").split()).strip()


def classify_de_fe_i(value: str | None) -> OwnerKind:
    token = (value or "").strip().upper()
    if token == "I":
        return "PERSON"
    if token in {"DE", "FE"}:
        return "ORGANIZATION"
    return "UNKNOWN"


def classify_schedule(value: str | None) -> str | None:
    token = (value or "").strip().upper().replace("SCHEDULE", "").strip()
    if token in {"A", "SCH A", "SCHA"}:
        return "A"
    if token in {"B", "SCH B", "SCHB"}:
        return "B"
    return None


def owner_identity_confidence(*, owner_id: str | None, name: str | None, kind: OwnerKind) -> IdentityConfidence:
    oid = (owner_id or "").strip()
    nm = normalize_name(name)
    if kind == "UNKNOWN" and not oid and not nm:
        return "UNRESOLVED"
    if oid and nm:
        return "HIGH_CONFIDENCE"
    if oid:
        return "HIGH_CONFIDENCE"
    if nm:
        return "REVIEW_REQUIRED"
    return "UNRESOLVED"


def firm_identity_confidence(crd: str | None) -> IdentityConfidence:
    if crd and CRD_RE.match(crd.strip()):
        return "CONFIRMED"
    return "UNRESOLVED"


def fund_identity_confidence(*, fund_id: str | None, fund_name: str | None) -> IdentityConfidence:
    fid = (fund_id or "").strip().replace(" ", "")
    name = normalize_name(fund_name)
    if fid and FUND_ID_RE.match(fid):
        return "CONFIRMED"
    if fid:
        return "HIGH_CONFIDENCE"
    if name:
        return "REVIEW_REQUIRED"
    return "UNRESOLVED"


def named_party_identity_confidence(*, name: str | None, crd: str | None, sec_number: str | None = None, lei: str | None = None) -> IdentityConfidence:
    if crd and CRD_RE.match(crd.strip()):
        return "CONFIRMED"
    if (sec_number or "").strip() or (lei or "").strip():
        return "HIGH_CONFIDENCE" if normalize_name(name) else "HIGH_CONFIDENCE"
    if normalize_name(name):
        return "REVIEW_REQUIRED"
    return "UNRESOLVED"


def filing_identity_key(filing_id: str) -> str:
    token = (filing_id or "").strip()
    if not token or not FILING_ID_RE.match(token):
        raise ValueError("FilingID is required and must be the official IARD numeric key")
    return token


def source_row_digest(*parts: str | None) -> str:
    payload = "\u001f".join((p or "").strip() for p in parts)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def office_source_key(
    *,
    street_1: str | None,
    city: str | None,
    region: str | None,
    postal_code: str | None,
    country: str | None,
    branch_number: str | None,
) -> str:
    return "|".join(
        [
            normalize_name(street_1).lower(),
            normalize_name(city).lower(),
            (region or "").strip().upper(),
            (postal_code or "").strip(),
            (country or "").strip().upper(),
            (branch_number or "").strip(),
        ]
    )


def edge_is_current(
    *,
    crd_on_current_roster: bool,
    filing_is_latest_for_crd: bool,
    source_is_current_snapshot: bool,
) -> bool:
    """Fail-closed: historical filings are not current unless all three gates pass."""
    return bool(crd_on_current_roster and filing_is_latest_for_crd and source_is_current_snapshot)


def historical_firm_publication_allowed(crd_on_current_roster: bool) -> bool:
    return bool(crd_on_current_roster)
