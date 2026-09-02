"""State-RIA identity overlay. Same CRD is one firm. Name-only is rejected."""

from __future__ import annotations

from dataclasses import dataclass

from ith_ingestion.nj_bos.identity import match_party
from ith_ingestion.nj_bos.models import EventParty, KnownIdentity

NJ_STATE_REGISTERED = "NJ_STATE_REGISTERED"
SEC_REGISTERED_NOTICE_FILED = "SEC_REGISTERED_NOTICE_FILED"
REGISTRATION_PENDING = "REGISTRATION_PENDING"
REGISTRATION_TERMINATED = "REGISTRATION_TERMINATED"
REGISTRATION_WITHDRAWN = "REGISTRATION_WITHDRAWN"
REGISTRATION_STATUS_UNKNOWN = "REGISTRATION_STATUS_UNKNOWN"


@dataclass
class StateRiaRecord:
    legal_name: str
    crd: str | None = None
    sec_file_number: str | None = None
    dba: str | None = None
    address_key: str | None = None
    registration_class: str = "STATE_REGISTERED_RIA"
    registration_status: str = NJ_STATE_REGISTERED
    match_status: str = "UNRESOLVED"
    match_method: str | None = None
    firm_id: str | None = None
    notes: str = ""


def classify_registration(record: StateRiaRecord) -> str:
    if record.registration_class == "SEC_REGISTERED_RIA" or (record.sec_file_number or "").startswith("801-"):
        if record.registration_status == NJ_STATE_REGISTERED:
            return SEC_REGISTERED_NOTICE_FILED
        return record.registration_status or SEC_REGISTERED_NOTICE_FILED
    return record.registration_status or NJ_STATE_REGISTERED


def match_state_ria(record: StateRiaRecord, catalog: list[KnownIdentity]) -> StateRiaRecord:
    if record.dba and not record.crd and not record.sec_file_number:
        record.match_status = "REVIEW_REQUIRED"
        record.match_method = "dba_without_crd"
        record.firm_id = None
        return record
    party = EventParty(
        legal_name=record.legal_name,
        party_type="STATE_RIA" if record.registration_class == "STATE_REGISTERED_RIA" else "SEC_RIA",
        crd=record.crd,
        sec_file_number=record.sec_file_number,
        address_text=record.address_key,
    )
    match_party(party, catalog, context=record.dba or "")
    record.match_status = party.match_status
    record.match_method = party.match_method
    record.firm_id = party.firm_id
    record.notes = party.notes
    return record


def transition(from_status: str, to_status: str, crd: str, firm_id: str | None) -> dict:
    if from_status == NJ_STATE_REGISTERED and to_status == SEC_REGISTERED_NOTICE_FILED:
        klass = "STATE_TO_SEC"
    elif from_status == SEC_REGISTERED_NOTICE_FILED and to_status == NJ_STATE_REGISTERED:
        klass = "SEC_TO_STATE"
    elif to_status == REGISTRATION_WITHDRAWN:
        klass = "WITHDRAWAL"
    elif to_status == REGISTRATION_TERMINATED:
        klass = "TERMINATION"
    else:
        klass = "OTHER"
    return {
        "crd": crd,
        "firm_id": firm_id,
        "from_status": from_status,
        "to_status": to_status,
        "transition_class": klass,
        "same_firm": True,
    }
