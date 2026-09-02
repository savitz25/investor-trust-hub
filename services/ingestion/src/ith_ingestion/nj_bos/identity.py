"""Conservative identity matching. CRD/SEC exact keys. Name-only is rejected."""

from __future__ import annotations

import re

from ith_ingestion.nj_bos.classify import needs_successor_review
from ith_ingestion.nj_bos.models import EventParty, KnownIdentity

_WS = re.compile(r"[^a-z0-9]+")


def _norm_name(value: str) -> str:
    return _WS.sub(" ", (value or "").lower()).strip()


def _norm_addr(value: str | None) -> str:
    return _WS.sub("", (value or "").lower())


def _same_crd(left: str | None, right: str | None) -> bool:
    if not left or not right:
        return False
    return re.sub(r"\D", "", left) == re.sub(r"\D", "", right) and bool(re.sub(r"\D", "", left))


def _same_sec(left: str | None, right: str | None) -> bool:
    if not left or not right:
        return False
    return left.replace(" ", "").upper() == right.replace(" ", "").upper()


def match_party(party: EventParty, catalog: list[KnownIdentity], context: str = "") -> EventParty:
    """Attach only on exact CRD, exact SEC file, or legal-name+address high confidence."""
    firm_crd = [row for row in catalog if row.kind == "firm" and _same_crd(row.crd, party.crd)]
    person_crd = [row for row in catalog if row.kind == "person" and _same_crd(row.crd, party.crd)]
    firm_sec = [row for row in catalog if row.kind == "firm" and _same_sec(row.sec_file_number, party.sec_file_number)]

    individualish = party.party_type in {"INDIVIDUAL", "IAR", "AGENT"}
    firmish = party.party_type in {
        "RIA_FIRM",
        "STATE_RIA",
        "SEC_RIA",
        "BROKER_DEALER",
        "ISSUER",
        "UNREGISTERED_ENTITY",
        "OTHER",
    }

    if party.crd and firm_crd and person_crd:
        party.match_status = "CONFLICT"
        party.match_method = "crd_present_on_firm_and_person"
        party.notes = "CRD collides across firm and person catalogs"
        return party

    if party.crd and individualish and person_crd:
        hit = person_crd[0]
        party.match_status = "EXACT_CRD_INDIVIDUAL"
        party.match_method = "exact_crd"
        party.person_id = hit.person_id
        party.firm_id = None
        party.public_eligibility = "internal_only"
        return party

    if party.crd and firmish and firm_crd:
        hit = firm_crd[0]
        party.match_status = "EXACT_CRD_FIRM"
        party.match_method = "exact_crd"
        party.firm_id = hit.firm_id
        party.person_id = None
        _overlay_registration(party, hit)
        return party

    if party.crd and not individualish and person_crd and not firm_crd:
        party.match_status = "CONFLICT"
        party.match_method = "crd_kind_mismatch"
        return party

    if party.crd and individualish and firm_crd and not person_crd:
        party.match_status = "CONFLICT"
        party.match_method = "crd_kind_mismatch"
        return party

    if party.sec_file_number and firm_sec:
        hit = firm_sec[0]
        party.match_status = "EXACT_SEC_FILE"
        party.match_method = "exact_sec_file_number"
        party.firm_id = hit.firm_id
        _overlay_registration(party, hit)
        return party

    if needs_successor_review(context) or needs_successor_review(party.legal_name):
        party.match_status = "REVIEW_REQUIRED"
        party.match_method = "successor_predecessor_language"
        party.firm_id = None
        party.person_id = None
        return party

    addr = _norm_addr(party.address_text)
    name = _norm_name(party.legal_name)
    name_addr_hits = [
        row
        for row in catalog
        if row.kind == "firm"
        and _norm_name(row.legal_name) == name
        and addr
        and row.address_key
        and _norm_addr(row.address_key) == addr
    ]
    if len(name_addr_hits) == 1:
        hit = name_addr_hits[0]
        party.match_status = "HIGH_CONFIDENCE"
        party.match_method = "legal_name_and_address"
        party.firm_id = hit.firm_id
        _overlay_registration(party, hit)
        return party
    if len(name_addr_hits) > 1:
        party.match_status = "CONFLICT"
        party.match_method = "name_address_collision"
        return party

    name_only = [row for row in catalog if _norm_name(row.legal_name) == name]
    if name_only and not party.crd and not party.sec_file_number:
        party.match_status = "UNSAFE_REJECTED"
        party.match_method = "name_only"
        party.firm_id = None
        party.person_id = None
        party.notes = "Name-only match is never auto-attached"
        return party

    party.match_status = "UNRESOLVED"
    party.match_method = "no_exact_key"
    return party


def _overlay_registration(party: EventParty, hit: KnownIdentity) -> None:
    """State RIA vs SEC RIA is a status overlay, not a new firm."""
    if hit.registration_kind == "SEC_REGISTERED_RIA" and party.party_type == "STATE_RIA":
        party.party_type = "SEC_RIA"
        party.notes = (party.notes + " state_to_sec_overlay_same_crd").strip()
        party.raw_value = {
            **party.raw_value,
            "transition": "STATE_TO_SEC",
            "same_firm_id": hit.firm_id,
        }
    elif hit.registration_kind == "STATE_REGISTERED_RIA" and party.party_type == "SEC_RIA":
        party.notes = (party.notes + " sec_to_state_overlay_same_crd").strip()
        party.raw_value = {
            **party.raw_value,
            "transition": "SEC_TO_STATE",
            "same_firm_id": hit.firm_id,
        }


def apply_publication_firewall(party: EventParty) -> EventParty:
    """Individuals stay internal-only. This ticket keeps all NJ evidence internal-only."""
    if party.party_type in {"INDIVIDUAL", "IAR", "AGENT"}:
        party.public_eligibility = "internal_only"
        party.firm_id = party.firm_id if party.party_type not in {"INDIVIDUAL", "IAR", "AGENT"} else party.firm_id
    if party.party_type in {"INDIVIDUAL", "IAR", "AGENT"}:
        # Never attach an individual respondent as a firm.
        party.firm_id = None
    party.public_eligibility = "internal_only"
    return party


def firm_attachment_allowed(party: EventParty) -> bool:
    """Copy to a firm only when that firm is itself a respondent with a safe match."""
    if party.party_type in {"INDIVIDUAL", "IAR", "AGENT"}:
        return False
    if party.match_status in {"UNSAFE_REJECTED", "CONFLICT", "UNRESOLVED", "REVIEW_REQUIRED"}:
        return False
    return bool(party.firm_id)
