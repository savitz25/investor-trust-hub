"""Parse NJ BOS action-index HTML and order/complaint text."""

from __future__ import annotations

import hashlib
import re
from html import unescape
from pathlib import Path

from ith_ingestion.nj_bos.classify import (
    classify_event_class,
    classify_party_type,
    classify_procedural_status,
    extract_crds,
    extract_docket,
    extract_monetary,
    extract_order_number,
    extract_sec_files,
    is_waf_block,
    nj_attribution_from_terms,
    normalize_source_url,
    sanction_flags,
)
from ith_ingestion.nj_bos.models import EventParty, RegulatoryEvent, SourceCoverage, SourceOccurrence

HREF_RE = re.compile(r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', re.I | re.S)
TAG_RE = re.compile(r"<[^>]+>")
CAPTION_BLOCK = re.compile(
    r"IN THE MATTER OF[:\s]+(.*?)(?:\n\s*Respondent|\n\s*BEFORE |\n\s*Pursuant to|"
    r"CONSENT ORDER|SUMMARY |ADMINISTRATIVE|FINAL (?:JUDGMENT|ORDER)|VERIFIED COMPLAINT|CEASE AND DESIST)",
    re.I | re.S,
)
DATE_IN_TEXT = re.compile(
    r"\b(?:this\s+)?(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+day of\s+"
    r"(January|February|March|April|May|June|July|August|September|October|November|December)"
    r"[,\s]+(\d{4})",
    re.I,
)
DATE_ISOISH = re.compile(
    r"\b(January|February|March|April|May|June|July|August|September|October|November|December)"
    r"\s+(\d{1,2}),\s+(\d{4})",
    re.I,
)
MONTHS = {
    "january": "01",
    "february": "02",
    "march": "03",
    "april": "04",
    "may": "05",
    "june": "06",
    "july": "07",
    "august": "08",
    "september": "09",
    "october": "10",
    "november": "11",
    "december": "12",
}
CRD_IN_NAME = re.compile(
    r"(?P<name>[A-Za-z0-9][A-Za-z0-9.,&'’\- ]+?)\s*(?:\((?:CRD\s*(?:No\.?|#)?\s*(?P<crd>\d{1,10}))\))?",
)


def parse_action_index(html: str, source_url: str) -> tuple[SourceCoverage, list[SourceOccurrence]]:
    """Parse the official alphabetical action index. WAF pages are ACCESS_BLOCKED, not zero."""
    normalized = normalize_source_url(source_url)
    digest = hashlib.sha256(html.encode("utf-8", errors="replace")).hexdigest()
    if is_waf_block(html):
        coverage = SourceCoverage(
            source_family="action_index",
            source_url=normalized,
            coverage_state="SOURCE_ACCESS_BLOCKED",
            source_hash=digest,
            notes="HTML index returned Incapsula/WAF interstitial. Not a zero-action finding.",
            raw_value={"bytes": len(html.encode("utf-8"))},
        )
        return coverage, []

    entries: list[SourceOccurrence] = []
    for index, match in enumerate(HREF_RE.finditer(html)):
        href = unescape(match.group(1).strip())
        caption = unescape(TAG_RE.sub(" ", match.group(2))).strip()
        caption = re.sub(r"\s+", " ", caption)
        if ".pdf" not in href.lower():
            continue
        if href.startswith("/"):
            document_url = f"https://www.njconsumeraffairs.gov{href}"
        else:
            document_url = href
        document_url = normalize_source_url(document_url)
        locator = f"index:{index}:{caption[:80]}"
        fingerprint = hashlib.sha256(f"{document_url}|{locator}|{caption.lower()}".encode()).hexdigest()
        entries.append(
            SourceOccurrence(
                source_url=normalized,
                locator=locator,
                respondent_caption=caption or document_url.rsplit("/", 1)[-1],
                document_url=document_url,
                order_number=None,
                action_date=None,
                acquisition_state="INDEX_ONLY",
                occurrence_fingerprint=fingerprint,
                raw_value={"href": href},
            )
        )

    coverage = SourceCoverage(
        source_family="action_index",
        source_url=normalized,
        coverage_state="ACQUIRED_PARTIAL_HISTORY" if entries else "SOURCE_UNVERIFIED",
        source_hash=digest,
        notes="Alphabetical index parsed. Ordering is not event identity.",
        raw_value={"entry_count": len(entries)},
    )
    return coverage, entries


def _date_from_text(text: str) -> str | None:
    match = DATE_IN_TEXT.search(text)
    if match:
        day, month, year = match.group(1), match.group(2).lower(), match.group(3)
        return f"{year}-{MONTHS[month]}-{int(day):02d}"
    match = DATE_ISOISH.search(text)
    if match:
        month, day, year = match.group(1).lower(), match.group(2), match.group(3)
        return f"{year}-{MONTHS[month]}-{int(day):02d}"
    return None


def _date_from_filename(filename: str) -> str | None:
    patterns = (
        re.compile(r"(20\d{2})(\d{2})(\d{2})"),
        re.compile(r"(\d{1,2})[A-Za-z]{3,}(20\d{2})"),
        re.compile(r"(\d{1,2})[._-](\d{1,2})[._-](20\d{2})"),
        re.compile(r"(20\d{2})"),
    )
    for cre in patterns:
        match = cre.search(filename)
        if not match:
            continue
        groups = match.groups()
        if len(groups) == 3 and len(groups[0]) == 4:
            return f"{groups[0]}-{groups[1]}-{groups[2]}"
        if len(groups) == 3 and len(groups[2]) == 4:
            return f"{groups[2]}-{int(groups[0]):02d}-{int(groups[1]):02d}"
        if len(groups) == 1:
            return f"{groups[0]}-01-01"
    return None


def parse_caption_parties(text: str) -> list[EventParty]:
    block_match = CAPTION_BLOCK.search(text)
    block = block_match.group(1) if block_match else text[:800]
    block = block[:1500]
    block = re.sub(r"\s+", " ", block)
    pieces = re.split(
        r"\s+and\s+|;\s*|(?:,\s+)(?!Inc\.?|LLC|L\.L\.C\.?|LLP|Ltd\.?|Corp\.?|Corporation|Co\.?|LP|L\.P\.?\b)",
        block,
    )
    parties: list[EventParty] = []
    for piece in pieces:
        piece = piece.strip(" :;,-")
        piece = re.sub(r"^(Respondent|Respondents)\.?\s*", "", piece, flags=re.I)
        if len(piece) < 3 or len(piece) > 160:
            continue
        if re.search(r"bureau of securities|state of new jersey|office of", piece, re.I):
            continue
        crd_match = re.search(r"CRD\s*(?:No\.?|#)?\s*(\d{1,10})", piece, re.I)
        name = re.sub(r"\s*\((?:CRD[^)]*)\)", "", piece, flags=re.I).strip()
        name = re.sub(r"\s+", " ", name)
        if not name or name.lower() in {"respondent", "respondents"}:
            continue
        if len(name.split()) > 8:
            continue
        if re.match(r"^(the|this|that|pursuant|whereas|before|office|state)\b", name, re.I):
            continue
        party_type = classify_party_type(name, text[:2500])
        parties.append(
            EventParty(
                legal_name=name,
                party_type=party_type,
                crd=crd_match.group(1) if crd_match else None,
                public_eligibility="internal_only",
            )
        )
    # Deduplicate by name+crd
    seen: set[tuple[str, str]] = set()
    unique: list[EventParty] = []
    for party in parties:
        key = (party.legal_name.lower(), party.crd or "")
        if key in seen:
            continue
        seen.add(key)
        unique.append(party)
    return unique


def stable_event_id(
    *,
    order_number: str | None,
    docket_number: str | None,
    content_hash: str | None,
    event_class: str,
    action_date: str | None,
    fingerprint: str,
) -> str:
    if order_number:
        return f"nj-bos:order:{re.sub(r'[^A-Za-z0-9]+', '', order_number).lower()}"
    if docket_number:
        return f"nj-bos:docket:{re.sub(r'[^A-Za-z0-9]+', '', docket_number).lower()}"
    if content_hash and event_class and action_date:
        return f"nj-bos:hash:{content_hash[:16]}:{event_class}:{action_date}"
    return f"nj-bos:fp:{fingerprint[:24]}"


def parse_document_text(
    text: str,
    *,
    source_url: str,
    content_hash: str,
    filename: str = "",
    fingerprint: str | None = None,
) -> RegulatoryEvent:
    filename = filename or Path(url_filename(source_url)).name
    event_class = classify_event_class(text, filename)
    procedural, hearing = classify_procedural_status(event_class, text)
    flags = sanction_flags(text)
    monetary = extract_monetary(text)
    parties = parse_caption_parties(text)
    crds = extract_crds(text)
    sec_files = extract_sec_files(text)
    if parties and crds:
        if len(parties) == 1 and not parties[0].crd:
            parties[0].crd = crds[0]
        if len(parties) == 1 and sec_files and not parties[0].sec_file_number:
            parties[0].sec_file_number = sec_files[0]
    order_number = extract_order_number(text)
    docket = extract_docket(text)
    action_date = _date_from_text(text) or _date_from_filename(filename)
    fp = fingerprint or hashlib.sha256(f"{normalize_source_url(source_url)}|{content_hash}".encode()).hexdigest()
    caption = parties[0].legal_name if parties else filename
    if len(parties) > 1:
        caption = "; ".join(p.legal_name for p in parties[:4])
    event = RegulatoryEvent(
        stable_event_id=stable_event_id(
            order_number=order_number,
            docket_number=docket,
            content_hash=content_hash,
            event_class=event_class,
            action_date=action_date,
            fingerprint=fp,
        ),
        event_class=event_class,
        procedural_status=procedural,
        caption=caption,
        order_number=order_number,
        docket_number=docket,
        action_date=action_date,
        source_url=normalize_source_url(source_url),
        content_hash=content_hash,
        parties=parties,
        monetary=monetary,
        hearing_rights_preserved=hearing,
        nj_monetary_attribution=nj_attribution_from_terms(monetary, text),
        public_eligibility="internal_only",
        monitoring_state="baseline_only",
        raw_value={"filename": filename, "sec_files": sec_files, "crds": crds},
        **flags,
    )
    if monetary:
        event.has_civil_penalty = event.has_civil_penalty or any(t.kind == "penalty" and t.amount for t in monetary)
        event.has_restitution = event.has_restitution or any(t.kind == "restitution" and t.amount for t in monetary)
        event.has_disgorgement = event.has_disgorgement or any(t.kind == "disgorgement" and t.amount for t in monetary)
    return event


def url_filename(url: str) -> str:
    return unquote_path(url.rstrip("/").rsplit("/", 1)[-1])


def unquote_path(value: str) -> str:
    from urllib.parse import unquote

    return unquote(value)


def occurrence_from_pdf_url(url: str, caption: str | None = None, locator: str | None = None) -> SourceOccurrence:
    normalized = normalize_source_url(url)
    name = url_filename(normalized)
    loc = locator or f"seed:{name}"
    cap = caption or name
    fingerprint = hashlib.sha256(f"{normalized}|{loc}|{cap.lower()}".encode()).hexdigest()
    return SourceOccurrence(
        source_url=normalized,
        locator=loc,
        respondent_caption=cap,
        document_url=normalized,
        order_number=None,
        action_date=_date_from_filename(name),
        acquisition_state="INDEX_ONLY",
        occurrence_fingerprint=fingerprint,
        raw_value={"seed": True},
    )
