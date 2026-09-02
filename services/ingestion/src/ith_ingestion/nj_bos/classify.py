"""Classify NJ Bureau of Securities instruments. Do not flatten as fraud."""

from __future__ import annotations

import re
from urllib.parse import unquote, urlparse, urlunparse

from ith_ingestion.nj_bos.models import MonetaryTerm

ENTITY_HINT = re.compile(
    r"\b(llc|l\.l\.c\.?|inc\.?|corp\.?|corporation|ltd\.?|l\.p\.?|lp|llp|plc|"
    r"company|co\.|partners|partnership|advisors?|advisers?|advisory|"
    r"securities|capital|fund|group|holdings?|management|investments?|"
    r"trust|bank|associates|enterprises|services)\b",
    re.I,
)
PERSON_NAME = re.compile(r"^[A-Z][a-zA-Z'.\-]+(?:\s+[A-Z][a-zA-Z'.\-]+){0,3}$")
CRD_RE = re.compile(r"\bCRD\s*(?:No\.?|#)?\s*(\d{1,10})\b", re.I)
SEC_FILE_RE = re.compile(r"\b(?:SEC\s+)?File\s+(?:No\.?|Number)\s*(801|802|8|803)-\s*(\d{1,8})\b", re.I)
DOCKET_RE = re.compile(r"\bDocket\s+No\.?\s*([A-Z]{2,5}\s*\d[\w\-]+)", re.I)
ORDER_NO_RE = re.compile(r"\b(?:Order|Administrative\s+Order)\s+No\.?\s*([\w\-]+)", re.I)
HEARING_RIGHTS = re.compile(
    r"notice of right to hearing|may request a hearing|written application to lift|"
    r"right to a hearing|request for a hearing must",
    re.I,
)
MULTI_STATE = re.compile(r"\b(multi-?state|nasaa|participating states|other states)\b", re.I)
NJ_ALLOC = re.compile(r"new jersey.{0,80}(share|portion|allocation|allocated)", re.I)
SUCCESSOR = re.compile(r"\b(successor to|predecessor|formerly known as|f/?k/?a|d/?b/?a)\b", re.I)

MONEY = re.compile(
    r"\$\s*([\d,]+(?:\.\d{1,2})?)|"
    r"\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|"
    r"thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million)[\w\s\-]*"
    r"dollars?\s*(?:\((?:\$\s*)?([\d,]+(?:\.\d{1,2})?)\))?",
    re.I,
)


def normalize_source_url(url: str) -> str:
    parsed = urlparse((url or "").strip())
    path = unquote(parsed.path or "")
    netloc = (parsed.netloc or "").lower()
    scheme = (parsed.scheme or "https").lower()
    return urlunparse((scheme, netloc, path, "", "", ""))


def is_waf_block(html: str | bytes, byte_length: int | None = None) -> bool:
    if isinstance(html, bytes):
        text = html.decode("utf-8", errors="replace")
        byte_length = byte_length if byte_length is not None else len(html)
    else:
        text = html or ""
        byte_length = byte_length if byte_length is not None else len(text.encode("utf-8"))
    low = text.lower()
    if byte_length < 500:
        return True
    return any(token in low for token in ("incapsula", "pardon our interruption", "request unsuccessful", "_incap_"))


def classify_event_class(text: str, filename: str = "") -> str:
    blob = f"{filename}\n{text[:4000]}"
    head = blob.lower()
    if re.search(r"verified complaint|civil action\s+verified|filed complaint", head) and not re.search(
        r"consent order|final (?:order|judgment)", head
    ):
        if re.search(r"superior court|chancery|civil action", head):
            return "CIVIL_COMPLAINT"
        return "FILED_COMPLAINT"
    if re.search(r"administrative complaint", head) and not re.search(r"consent order|final order", head):
        return "FILED_COMPLAINT"
    if re.search(r"amended.{0,40}(cease.?and.?desist|c\s*&\s*d|order)|amended order", head):
        return "AMENDED_ORDER"
    if re.search(r"summary.{0,40}revok|summary revocation|summary denial and rev", head):
        return "SUMMARY_REVOCATION"
    if re.search(r"final judgment", head):
        return "FINAL_ORDER"
    if re.search(r"consent order|administrative consent|_consent[_.]|consent[_-]?order", head):
        return "CONSENT_ORDER"
    if re.search(r"final order", head):
        return "FINAL_ORDER"
    if re.search(r"summary.{0,40}(cease.?and.?desist|c\s*&\s*d)|cease.?and.?desist", head) and not re.search(
        r"consent order", head
    ):
        return "CEASE_AND_DESIST"
    if re.search(r"\bbarred\b|\bpermanent bar\b|\bbar from\b", head) and not re.search(r"consent order", head):
        return "BAR"
    if re.search(r"\bsuspension order\b|\bis suspended\b", head) and not re.search(r"consent|revok", head):
        return "SUSPENSION"
    if re.search(r"\brevocation order\b|\bis revoked\b", head):
        return "REVOCATION"
    if re.search(r"\bsettlement\b", head):
        return "SETTLEMENT"
    if re.search(r"\border\b", head):
        return "OTHER"
    return "UNCLASSIFIED"


def classify_procedural_status(event_class: str, text: str) -> tuple[str, bool]:
    """Return (status, hearing_rights_preserved). Filed complaints stay allegations."""
    head = text[:6000]
    hearing = bool(HEARING_RIGHTS.search(head))
    if event_class in {"FILED_COMPLAINT", "CIVIL_COMPLAINT"}:
        return "ALLEGATION", hearing
    if event_class == "SUMMARY_REVOCATION":
        return ("PENDING" if hearing or "summary" in head.lower() else "UNKNOWN"), True
    if event_class == "CEASE_AND_DESIST" and re.search(r"\bsummary\b", head, re.I):
        return ("PENDING" if hearing else "UNKNOWN"), hearing
    if event_class in {"CONSENT_ORDER", "FINAL_ORDER", "SETTLEMENT"}:
        return "FINAL", False
    if event_class in {"REVOCATION", "BAR"} and not hearing:
        return "FINAL", False
    if event_class == "AMENDED_ORDER":
        if hearing:
            return "PENDING", True
        return "FINAL", False
    if hearing:
        return "PENDING", True
    return "UNKNOWN", False


def sanction_flags(text: str) -> dict[str, bool]:
    low = text.lower()
    return {
        "has_bar": bool(re.search(r"\b(permanently )?barr(?:ed|ing)\b|\bbar from\b", low)),
        "has_revocation": bool(re.search(r"\brevok(?:ed|ing|e)\b|\brevoc", low)),
        "has_suspension": bool(re.search(r"\bsuspend(?:ed|ing)?\b|\bsuspension\b", low)),
        "has_cease_and_desist": bool(re.search(r"cease and desist|cease.?and.?desist", low)),
        "has_civil_penalty": bool(re.search(r"civil (?:monetary )?penalt", low)),
        "has_restitution": bool(re.search(r"\brestitution\b", low)),
        "has_disgorgement": bool(re.search(r"\bdisgorg", low)),
    }


def _amount(token: str | None) -> float | None:
    if not token:
        return None
    try:
        return float(token.replace(",", ""))
    except ValueError:
        return None


def extract_monetary(text: str) -> list[MonetaryTerm]:
    terms: list[MonetaryTerm] = []
    attribution = "multistate_unallocated" if MULTI_STATE.search(text) and not NJ_ALLOC.search(text) else "unspecified"
    if MULTI_STATE.search(text) and NJ_ALLOC.search(text):
        attribution = "nj_allocated"
    keyword_res = (
        ("penalty", re.compile(r"civil (?:monetary )?penalt(?:y|ies)", re.I)),
        ("restitution", re.compile(r"restitution", re.I)),
        ("disgorgement", re.compile(r"disgorg(?:ement|e)", re.I)),
    )
    seen: set[tuple[str, float | None]] = set()
    for kind, cre in keyword_res:
        for match in cre.finditer(text):
            chunk = text[match.start() : match.end() + 160]
            if kind == "penalty" and re.search(r"notice filing|registration fees?", chunk, re.I) and not re.search(
                r"penalt", chunk, re.I
            ):
                continue
            money = re.search(r"\$\s*([\d,]+(?:\.\d{1,2})?)", chunk)
            if not money:
                money = re.search(r"\((?:\$\s*)?([\d,]+(?:\.\d{1,2})?)\)", chunk)
            amount = _amount(money.group(1) if money else None)
            key = (kind, amount)
            if key in seen:
                continue
            seen.add(key)
            nj = attribution if amount else "none"
            terms.append(MonetaryTerm(kind=kind, amount=amount, nj_attribution=nj, raw=chunk[:240]))
    return terms


def nj_attribution_from_terms(terms: list[MonetaryTerm], text: str) -> str:
    if any(t.nj_attribution == "multistate_unallocated" for t in terms):
        return "multistate_unallocated"
    if any(t.nj_attribution == "nj_allocated" for t in terms):
        return "nj_allocated"
    if MULTI_STATE.search(text) and not NJ_ALLOC.search(text):
        return "multistate_unallocated"
    if terms:
        return "nj_only"
    return "none"


def classify_party_type(name: str, context: str = "") -> str:
    blob = f"{name}\n{context}"
    low = blob.lower()
    entity = bool(ENTITY_HINT.search(name))
    if re.search(r"\bunregistered\b", low) and entity:
        return "UNREGISTERED_ENTITY"
    if re.search(r"investment adviser representative|\biar\b", low) and not entity:
        return "IAR"
    if re.search(r"\bagent of\b|\bas an agent\b|registered.{0,40}as an agent", low) and not entity:
        return "AGENT"
    if entity and re.search(r"broker-?dealer|\bbd\b", low):
        return "BROKER_DEALER"
    if entity and re.search(r"\bissuer\b|open-end mutual fund|offering and selling securities", low):
        if not re.search(r"investment adviser registered|registered.{0,60}investment adviser", low):
            return "ISSUER"
    if entity and re.search(r"file no\.?\s*801-|registered with the (?:sec|commission)", low):
        return "SEC_RIA"
    ia_registered = bool(
        re.search(
            r"investment adviser registered|registered with the bureau.{0,40}adviser|registered as an investment adviser",
            low,
        )
    )
    if entity and ia_registered:
        if re.search(r"registered with the sec|sec-registered|file no\.?\s*801-", low):
            return "SEC_RIA"
        return "STATE_RIA"
    if entity and re.search(r"\badvisors?\b|\badvisers?\b", low):
        return "RIA_FIRM"
    if entity:
        if re.search(r"never been registered|not registered", low):
            return "UNREGISTERED_ENTITY"
        return "OTHER"
    if PERSON_NAME.match(name.strip()) or (not entity and re.search(r"[A-Za-z]+\s+[A-Za-z]+", name)):
        return "INDIVIDUAL"
    return "OTHER"


def needs_successor_review(text: str) -> bool:
    return bool(SUCCESSOR.search(text or ""))


def extract_crds(text: str) -> list[str]:
    return list(dict.fromkeys(CRD_RE.findall(text or "")))


def extract_sec_files(text: str) -> list[str]:
    out = []
    for prefix, num in SEC_FILE_RE.findall(text or ""):
        out.append(f"{prefix}-{num}")
    return list(dict.fromkeys(out))


def extract_docket(text: str) -> str | None:
    match = DOCKET_RE.search(text or "")
    if not match:
        return None
    return re.sub(r"\s+", "", match.group(1).upper())


def extract_order_number(text: str) -> str | None:
    match = ORDER_NO_RE.search(text or "")
    return match.group(1) if match else None
