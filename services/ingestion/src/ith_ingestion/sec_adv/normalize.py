from __future__ import annotations

import re
from datetime import date, datetime

from ith_ingestion.sec_adv.identifiers import (
    is_valid_crd,
    is_valid_sec_file_number,
    normalize_crd,
    normalize_sec_file_number,
)
from ith_ingestion.sec_adv.models import NormalizedFirm, ParsedRow, QuarantineItem

DATE_FORMATS = ("%m/%d/%Y", "%Y-%m-%d", "%m-%d-%Y")
MONEY_RE = re.compile(r"[^0-9.\-]")


def parse_date(value: str | None) -> date | None:
    if not value:
        return None
    text = value.strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def parse_money(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = MONEY_RE.sub("", value.strip())
    if cleaned in {"", ".", "-", "-."}:
        return None
    try:
        number = float(cleaned)
    except ValueError:
        return None
    return f"{number:.2f}"


def classify(row: ParsedRow) -> tuple[str, str, str] | QuarantineItem:
    firm_type = row.values.get("Firm Type", "").strip()
    status_text = row.values.get("SEC Current Status", "").strip()
    if row.dataset_kind == "ria":
        if firm_type and firm_type.lower() != "registered":
            return QuarantineItem(
                dataset_kind=row.dataset_kind,
                row_number=row.row_number,
                reason_code="unsupported_firm_type",
                detail=f"RIA file contained Firm Type={firm_type!r}",
                source_record_identifier=normalize_crd(row.values.get("Organization CRD#")),
                raw=row.values,
            )
        if status_text.lower() == "120-day approval":
            return "registered_investment_adviser", "pending", status_text
        return "registered_investment_adviser", "registered", status_text
    if firm_type and firm_type.upper() != "ERA":
        return QuarantineItem(
            dataset_kind=row.dataset_kind,
            row_number=row.row_number,
            reason_code="unsupported_firm_type",
            detail=f"ERA file contained Firm Type={firm_type!r}",
            source_record_identifier=normalize_crd(row.values.get("Organization CRD#")),
            raw=row.values,
        )
    return "exempt_reporting_adviser", "reporting", status_text


def normalize_row(row: ParsedRow) -> NormalizedFirm | QuarantineItem:
    crd = normalize_crd(row.values.get("Organization CRD#"))
    if not crd:
        return QuarantineItem(
            row.dataset_kind,
            row.row_number,
            "missing_crd",
            "Organization CRD# is empty",
            None,
            row.values,
        )
    if not is_valid_crd(crd):
        return QuarantineItem(
            row.dataset_kind,
            row.row_number,
            "malformed_crd",
            f"invalid CRD {crd!r}",
            crd,
            row.values,
        )
    legal = (row.values.get("Legal Name") or "").strip()
    display = (row.values.get("Primary Business Name") or legal).strip()
    if not legal and not display:
        return QuarantineItem(
            row.dataset_kind,
            row.row_number,
            "missing_name",
            "Legal Name and Primary Business Name are empty",
            crd,
            row.values,
        )
    classified = classify(row)
    if isinstance(classified, QuarantineItem):
        return classified
    registration_type, registration_status, status_text = classified
    sec_raw = row.values.get("SEC#")
    sec_number = normalize_sec_file_number(sec_raw) if sec_raw else None
    if sec_number and not is_valid_sec_file_number(sec_number):
        sec_number = None
    return NormalizedFirm(
        dataset_kind=row.dataset_kind,
        crd=crd,
        sec_file_number=sec_number,
        legal_name=legal or display,
        display_name=display or legal,
        firm_type_source=row.values.get("Firm Type", ""),
        sec_current_status_text=status_text,
        registration_type=registration_type,
        registration_status=registration_status,
        sec_status_effective_date=parse_date(row.values.get("SEC Status Effective Date")),
        latest_adv_filing_date=parse_date(row.values.get("Latest ADV Filing Date")),
        form_version=row.values.get("Form Version") or None,
        website=row.values.get("Website Address") or None,
        organization_form=row.values.get("3A") or None,
        fiscal_year_end=row.values.get("3B") or None,
        main_office={
            "line1": row.values.get("Main Office Street Address 1") or None,
            "line2": row.values.get("Main Office Street Address 2") or None,
            "city": row.values.get("Main Office City") or None,
            "region": row.values.get("Main Office State") or None,
            "country": row.values.get("Main Office Country") or None,
            "postal_code": row.values.get("Main Office Postal Code") or None,
        },
        raum_amount=parse_money(row.values.get("5F(2)(c)")) if row.dataset_kind == "ria" else None,
        raum_discretionary_amount=parse_money(row.values.get("5F(2)(a)"))
        if row.dataset_kind == "ria"
        else None,
        raum_nondiscretionary_amount=parse_money(row.values.get("5F(2)(b)"))
        if row.dataset_kind == "ria"
        else None,
        disclosure_indicator=row.values.get("11") or None,
        cik=(row.values.get("CIK#") or "").strip() or None,
        raw=row.values,
        source_record_identifier=crd,
    )


def normalize_rows(rows: list[ParsedRow]) -> tuple[list[NormalizedFirm], list[QuarantineItem]]:
    normalized: list[NormalizedFirm] = []
    quarantined: list[QuarantineItem] = []
    seen: dict[tuple[str, str], int] = {}
    for row in rows:
        result = normalize_row(row)
        if isinstance(result, QuarantineItem):
            quarantined.append(result)
            continue
        key = (result.dataset_kind, result.crd)
        if key in seen:
            quarantined.append(
                QuarantineItem(
                    result.dataset_kind,
                    row.row_number,
                    "duplicate_crd",
                    f"duplicate CRD {result.crd} also seen on row {seen[key]}",
                    result.crd,
                    row.values,
                )
            )
            continue
        seen[key] = row.row_number
        normalized.append(result)
    return normalized, quarantined
