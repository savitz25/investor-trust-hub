"""Deterministic Form ADV Part 1 flag/count extraction.

Reads an official IARD FOIA row (already stored in source_snapshots.payload).
Does not infer fee-only, risk, conflicts, or successor from names/addresses.
"""
from __future__ import annotations

from typing import Any

COMPENSATION_FIELDS = {
    "5E(1)": "percentage_of_assets",
    "5E(2)": "hourly_charges",
    "5E(3)": "subscription_fees",
    "5E(4)": "fixed_fees",
    "5E(5)": "commissions",
    "5E(6)": "performance_based_fees",
    "5E(7)": "other_compensation",
}

OTHER_BUSINESS_FIELDS = {
    "6A(1)": "broker_dealer",
    "6A(2)": "registered_representative_of_broker_dealer",
    "6A(3)": "commodity_pool_operator_or_cta",
    "6A(4)": "futures_commission_merchant",
    "6A(5)": "real_estate_broker_dealer_or_agent",
    "6A(6)": "insurance_broker_or_agent",
    "6A(7)": "bank",
    "6A(8)": "trust_company",
    "6A(9)": "accountant_or_accounting_firm",
    "6A(10)": "lawyer_or_law_firm",
    "6A(11)": "other_financial_product_salesperson",
    "6A(12)": "other",
}

AFFILIATION_FIELDS = {
    "7A(1)": "broker_dealer",
    "7A(2)": "other_investment_adviser",
    "7A(3)": "registered_municipal_advisor",
    "7A(4)": "registered_security_based_swap_dealer",
    "7A(5)": "major_security_based_swap_participant",
    "7A(6)": "commodity_pool_operator_or_cta",
    "7A(7)": "futures_commission_merchant",
    "7A(8)": "banking_or_thrift_institution",
    "7A(9)": "trust_company",
    "7A(10)": "accountant_or_accounting_firm",
    "7A(11)": "lawyer_or_law_firm",
    "7A(12)": "insurance_company_or_agency",
    "7A(13)": "pension_consultant",
    "7A(14)": "real_estate_broker_or_dealer",
    "7A(15)": "sponsor_or_syndicator_of_limited_partnerships",
    "7A(16)": "other",
}

DISCLOSURE_FIELDS = {
    "11A(1)": "criminal_felony",
    "11A(2)": "criminal_misdemeanor",
    "11B(1)": "sec_cftc_found_willful_violation",
    "11B(2)": "other_sec_cftc_regulatory",
    "11C(1)": "other_federal_regulatory",
    "11C(2)": "state_regulatory",
    "11C(3)": "foreign_financial_regulatory",
    "11C(4)": "sro",
    "11C(5)": "commodity_exchange_or_cftc",
    "11D(1)": "authorization_denied_or_suspended",
    "11D(2)": "authorization_revoked_or_withdrawn",
    "11D(3)": "barred",
    "11D(4)": "cease_and_desist",
    "11D(5)": "civil_money_penalty",
    "11E(1)": "court_enjoined",
    "11E(2)": "court_found_violation",
    "11E(3)": "court_dismissed",
    "11E(4)": "civil_proceeding",
    "11F": "bonded",
    "11G": "judgments_unsatisfied",
    "11H(1)(a)": "arbitration_award",
    "11H(1)(b)": "civil_judicial_finding",
    "11H(1)(c)": "other_civil",
    "11H(2)": "other_disclosure",
}


def yn(row: dict[str, Any], field: str) -> str | None:
    raw = str(row.get(field) or "").strip().upper()
    if raw in {"Y", "N"}:
        return raw
    return None


def yes_labels(row: dict[str, Any], mapping: dict[str, str]) -> list[str]:
    return [label for field, label in mapping.items() if yn(row, field) == "Y"]


def number(row: dict[str, Any], field: str) -> str | None:
    raw = str(row.get(field) or "").replace("$", "").replace(",", "").strip()
    if not raw:
        return None
    try:
        float(raw)
    except ValueError:
        return None
    return raw


def extract_enrichment(row: dict[str, Any], *, dataset_kind: str) -> dict[str, Any]:
    crd = str(row.get("Organization CRD#") or "").strip()
    acquired = str(row.get("Acquired Firm CRD#") or "").strip()
    successor_ok = yn(row, "4A") == "Y" and bool(acquired) and acquired != crd
    compensation = yes_labels(row, COMPENSATION_FIELDS) if dataset_kind == "ria" else []
    return {
        "crd": crd,
        "dataset_kind": dataset_kind,
        "compensation_methods": compensation,
        "fee_only_inferred": False,
        "other_business_activities": yes_labels(row, OTHER_BUSINESS_FIELDS),
        "affiliation_types": yes_labels(row, AFFILIATION_FIELDS),
        "custody_cash_reported": yn(row, "9A(1)(a)") == "Y" if dataset_kind == "ria" else None,
        "custody_securities_reported": yn(row, "9A(1)(b)") == "Y" if dataset_kind == "ria" else None,
        "related_person_custody_cash": yn(row, "9B(1)(a)") == "Y" if dataset_kind == "ria" else None,
        "related_person_custody_securities": yn(row, "9B(1)(b)") == "Y" if dataset_kind == "ria" else None,
        "custody_amount": number(row, "Total Custody Amount") if dataset_kind == "ria" else None,
        "custody_risk_score": None,
        "control_persons_reported": yn(row, "10A") == "Y",
        "control_person_public_company_count": number(row, "Count of Control person Public Reporting Company"),
        "disclosure_indicator": yn(row, "11"),
        "disclosure_categories": yes_labels(row, DISCLOSURE_FIELDS),
        "private_funds_reported": yn(row, "7B") == "Y",
        "private_fund_count_7b1": number(row, "Count of Private Funds - 7B(1)"),
        "private_fund_gross_assets": number(row, "Total Gross Assets of Private Funds"),
        "employees_5a": number(row, "5A") if dataset_kind == "ria" else None,
        "advisory_personnel_5b1": number(row, "5B(1)") if dataset_kind == "ria" else None,
        "clients_5c1": number(row, "5C(1)") if dataset_kind == "ria" else None,
        "raum_discretionary": number(row, "5F(2)(a)") if dataset_kind == "ria" else None,
        "raum_nondiscretionary": number(row, "5F(2)(b)") if dataset_kind == "ria" else None,
        "raum_total": number(row, "5F(2)(c)") if dataset_kind == "ria" else None,
        "successor_reported": yn(row, "4A") == "Y" if dataset_kind == "ria" else False,
        "successor_acquired_crd": acquired if successor_ok else None,
        "named_schedule_d_funds": [],
        "conflict_finding": False,
        "trust_score": None,
    }
