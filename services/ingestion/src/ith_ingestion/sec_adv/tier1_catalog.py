"""INV-NAT-001B field catalog. Additive observations only. No invented entities."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

TRANSFORM_VERSION = "inv-nat-001b-adv-tier1-v1"
LOCKED_FINGERPRINT = "62ca2fe56c6a23b1a898bbe6fcdb63bcd9c88d3cdafdd9083ff34a07eac51847"

Kind = Literal["yn", "number", "text"]
Ready = Literal["READY_FOR_PUBLIC_PROFILE", "INTERNAL_ONLY", "NOT_READY"]


@dataclass(frozen=True)
class FieldSpec:
    field_name: str
    item: str
    label: str
    kind: Kind
    ria_only: bool
    readiness: Ready


def _yn(item: str, field: str, label: str, *, ria_only: bool, ready: Ready) -> FieldSpec:
    return FieldSpec(field, item, label, "yn", ria_only, ready)


def _num(item: str, field: str, label: str, *, ria_only: bool, ready: Ready) -> FieldSpec:
    return FieldSpec(field, item, label, "number", ria_only, ready)


def _txt(item: str, field: str, label: str, *, ria_only: bool, ready: Ready) -> FieldSpec:
    return FieldSpec(field, item, label, "text", ria_only, ready)


R = "READY_FOR_PUBLIC_PROFILE"
I = "INTERNAL_ONLY"

FIELDS: tuple[FieldSpec, ...] = (
    # Item 1
    _txt("1", "Main Office Telephone Number", "principal_office_telephone", ria_only=False, ready=R),
    _txt("1", "Main Office Facsimile Number", "principal_office_fax", ria_only=False, ready=I),
    _yn("1", "Main Office Private Residence Flag", "principal_office_private_residence", ria_only=False, ready=I),
    _txt("1", "Mail Office Street Address 1", "mailing_street_1", ria_only=False, ready=R),
    _txt("1", "Mail Office Street Address 2", "mailing_street_2", ria_only=False, ready=R),
    _txt("1", "Mail Office City", "mailing_city", ria_only=False, ready=R),
    _txt("1", "Mail Office State", "mailing_state", ria_only=False, ready=R),
    _txt("1", "Mail Office Postal Code", "mailing_postal_code", ria_only=False, ready=R),
    _txt("1", "Mail Office Country", "mailing_country", ria_only=False, ready=R),
    _yn("1", "Mail Office Private Residence Flag", "mailing_private_residence", ria_only=False, ready=I),
    _num("1", "Total number of offices, other than your Principal Office and place of business", "other_office_count", ria_only=False, ready=R),
    _yn("1", "1I", "item_1i_website_indicator", ria_only=False, ready=R),
    _txt("1", "Website Address", "website_address", ria_only=False, ready=R),
    _num("1", "Total Number of Website Addresses", "website_count", ria_only=False, ready=R),
    _txt("1", "Additional CRD Number", "additional_crd_number", ria_only=False, ready=I),
    _num("1", "Total number of additional CRD numbers", "additional_crd_count", ria_only=False, ready=I),
    _num("1", "Total number of relying advisers", "relying_adviser_count", ria_only=True, ready=I),
    _txt("1", "Umbrella Registration", "umbrella_registration", ria_only=True, ready=I),
    _txt("1", "Location of Books and Records Street Address 1", "books_records_street_1", ria_only=False, ready=I),
    _txt("1", "Location of Books and Records City", "books_records_city", ria_only=False, ready=I),
    _txt("1", "Location of Books and Records State", "books_records_state", ria_only=False, ready=I),
    _num("1", "Total Number of Books and Records Locations", "books_records_location_count", ria_only=False, ready=I),
    _yn("1", "1L", "item_1l", ria_only=True, ready=I),
    _yn("1", "1M", "item_1m", ria_only=False, ready=I),
    _yn("1", "1N", "item_1n", ria_only=False, ready=I),
    _yn("1", "1O", "item_1o", ria_only=False, ready=I),
    _txt("1", "1O - If yes, approx. amount of assets", "item_1o_assets", ria_only=False, ready=I),
    _txt("1", "1P", "item_1p", ria_only=False, ready=I),
    _txt("1", "CIK#", "cik_raw", ria_only=False, ready=I),
    # Item 4 succession
    _yn("4", "4A", "succession_item_4a", ria_only=True, ready=I),
    _txt("4", "4B", "succession_item_4b", ria_only=True, ready=I),
    _txt("4", "Acquired Firm", "acquired_firm_name", ria_only=True, ready=I),
    _txt("4", "Acquired Firm CRD#", "acquired_firm_crd", ria_only=True, ready=I),
    _txt("4", "Acquired Firm SEC#", "acquired_firm_sec_number", ria_only=True, ready=I),
    _num("4", "Total Number of Acquired Firms", "acquired_firm_count", ria_only=True, ready=I),
    # Item 5 scale / RAUM / compensation / activities
    _num("5A", "5A", "employee_count", ria_only=True, ready=R),
    _num("5B", "5B(1)", "advisory_personnel_count", ria_only=True, ready=R),
    _num("5B", "5B(2)", "item_5b2", ria_only=True, ready=I),
    _num("5B", "5B(3)", "item_5b3", ria_only=True, ready=I),
    _num("5C", "5C(1)", "client_count", ria_only=True, ready=R),
    _num("5C", "5C(1)-If more than 100, how many", "client_count_if_more_than_100", ria_only=True, ready=R),
    _num("5C", "5C(2)", "item_5c2", ria_only=True, ready=I),
    _yn("5D", "5D(1)(a)", "clients_individuals", ria_only=True, ready=R),
    _yn("5D", "5D(1)(b)", "clients_high_net_worth_individuals", ria_only=True, ready=R),
    _yn("5D", "5D(1)(c)", "clients_banking_or_thrift", ria_only=True, ready=R),
    _yn("5D", "5D(1)(d)", "clients_investment_companies", ria_only=True, ready=R),
    _yn("5D", "5D(1)(e)", "clients_business_development_companies", ria_only=True, ready=R),
    _yn("5D", "5D(1)(f)", "clients_pooled_investment_vehicles", ria_only=True, ready=R),
    _yn("5D", "5D(1)(g)", "clients_pension_profit_sharing", ria_only=True, ready=R),
    _yn("5D", "5D(1)(h)", "clients_charities", ria_only=True, ready=R),
    _yn("5D", "5D(1)(i)", "clients_state_or_municipal", ria_only=True, ready=R),
    _yn("5D", "5D(1)(j)", "clients_other_investment_advisers", ria_only=True, ready=R),
    _yn("5D", "5D(1)(k)", "clients_insurance_companies", ria_only=True, ready=R),
    _yn("5D", "5D(1)(l)", "clients_sovereigns", ria_only=True, ready=R),
    _yn("5D", "5D(1)(m)", "clients_other", ria_only=True, ready=R),
    _yn("5E", "5E(1)", "percentage_of_assets", ria_only=True, ready=R),
    _yn("5E", "5E(2)", "hourly_charges", ria_only=True, ready=R),
    _yn("5E", "5E(3)", "subscription_fees", ria_only=True, ready=R),
    _yn("5E", "5E(4)", "fixed_fees", ria_only=True, ready=R),
    _yn("5E", "5E(5)", "commissions", ria_only=True, ready=R),
    _yn("5E", "5E(6)", "performance_based_fees", ria_only=True, ready=R),
    _yn("5E", "5E(7)", "other_compensation", ria_only=True, ready=R),
    _txt("5E", "5E(7)-Other", "other_compensation_description", ria_only=True, ready=I),
    _yn("5F", "5F(1)", "reports_raum", ria_only=True, ready=R),
    _num("5F", "5F(2)(a)", "raum_discretionary", ria_only=True, ready=R),
    _num("5F", "5F(2)(b)", "raum_nondiscretionary", ria_only=True, ready=R),
    _num("5F", "5F(2)(c)", "raum_total", ria_only=True, ready=R),
    _yn("5G", "5G(1)", "activity_financial_planning", ria_only=True, ready=R),
    _yn("5G", "5G(2)", "activity_portfolio_management_individuals", ria_only=True, ready=R),
    _yn("5G", "5G(3)", "activity_portfolio_management_investment_companies", ria_only=True, ready=R),
    _yn("5G", "5G(4)", "activity_portfolio_management_pooled_vehicles", ria_only=True, ready=R),
    _yn("5G", "5G(5)", "activity_portfolio_management_institutional", ria_only=True, ready=R),
    _yn("5G", "5G(6)", "activity_pension_consulting", ria_only=True, ready=R),
    _yn("5G", "5G(7)", "activity_selection_of_other_advisers", ria_only=True, ready=R),
    _yn("5G", "5G(8)", "activity_publication_of_periodicals", ria_only=True, ready=I),
    _yn("5G", "5G(9)", "activity_security_ratings", ria_only=True, ready=I),
    _yn("5G", "5G(10)", "activity_market_timing", ria_only=True, ready=I),
    _yn("5G", "5G(11)", "activity_educational_seminars", ria_only=True, ready=I),
    _yn("5G", "5G(12)", "activity_other", ria_only=True, ready=I),
    _yn("5I", "5I(1)", "wrap_fee_programs", ria_only=True, ready=I),
    # Item 6
    _yn("6A", "6A(1)", "other_business_broker_dealer", ria_only=False, ready=R),
    _yn("6A", "6A(2)", "other_business_registered_representative", ria_only=False, ready=R),
    _yn("6A", "6A(3)", "other_business_cpo_or_cta", ria_only=False, ready=R),
    _yn("6A", "6A(4)", "other_business_futures_commission_merchant", ria_only=False, ready=R),
    _yn("6A", "6A(5)", "other_business_real_estate", ria_only=False, ready=R),
    _yn("6A", "6A(6)", "other_business_insurance", ria_only=False, ready=R),
    _yn("6A", "6A(7)", "other_business_bank", ria_only=False, ready=R),
    _yn("6A", "6A(8)", "other_business_trust_company", ria_only=False, ready=R),
    _yn("6A", "6A(9)", "other_business_accountant", ria_only=False, ready=R),
    _yn("6A", "6A(10)", "other_business_lawyer", ria_only=False, ready=R),
    _yn("6A", "6A(11)", "other_business_other_financial_salesperson", ria_only=False, ready=R),
    _yn("6A", "6A(12)", "other_business_6a12", ria_only=False, ready=R),
    _yn("6A", "6A(13)", "other_business_6a13", ria_only=False, ready=R),
    _yn("6A", "6A(14)", "other_business_other", ria_only=False, ready=R),
    _txt("6A", "6A(14)-Other", "other_business_other_description", ria_only=False, ready=I),
    _yn("6B", "6B(1)", "other_business_primary", ria_only=False, ready=I),
    _yn("6B", "6B(2)", "other_business_6b2", ria_only=False, ready=I),
    _yn("6B", "6B(3)", "other_business_6b3", ria_only=False, ready=I),
    # Item 7
    _yn("7A", "7A(1)", "affiliation_broker_dealer", ria_only=False, ready=R),
    _yn("7A", "7A(2)", "affiliation_other_investment_adviser", ria_only=False, ready=R),
    _yn("7A", "7A(3)", "affiliation_municipal_advisor", ria_only=False, ready=R),
    _yn("7A", "7A(4)", "affiliation_security_based_swap_dealer", ria_only=False, ready=R),
    _yn("7A", "7A(5)", "affiliation_major_security_based_swap_participant", ria_only=False, ready=R),
    _yn("7A", "7A(6)", "affiliation_cpo_or_cta", ria_only=False, ready=R),
    _yn("7A", "7A(7)", "affiliation_futures_commission_merchant", ria_only=False, ready=R),
    _yn("7A", "7A(8)", "affiliation_banking_or_thrift", ria_only=False, ready=R),
    _yn("7A", "7A(9)", "affiliation_trust_company", ria_only=False, ready=R),
    _yn("7A", "7A(10)", "affiliation_accountant", ria_only=False, ready=R),
    _yn("7A", "7A(11)", "affiliation_lawyer", ria_only=False, ready=R),
    _yn("7A", "7A(12)", "affiliation_insurance", ria_only=False, ready=R),
    _yn("7A", "7A(13)", "affiliation_pension_consultant", ria_only=False, ready=R),
    _yn("7A", "7A(14)", "affiliation_real_estate_broker", ria_only=False, ready=R),
    _yn("7A", "7A(15)", "affiliation_limited_partnership_sponsor", ria_only=False, ready=R),
    _yn("7A", "7A(16)", "affiliation_other", ria_only=False, ready=R),
    _num("7A", "Count of IA Affiliates", "count_ia_affiliates", ria_only=False, ready=R),
    _num("7A", "Count of IA/BD Affiliates", "count_ia_bd_affiliates", ria_only=False, ready=R),
    _num("7A", "Count of BD Affiliates", "count_bd_affiliates", ria_only=False, ready=R),
    _yn("7A", "Control/Controlled by Related Person", "control_by_related_person", ria_only=False, ready=I),
    _yn("7A", "Under Common Control", "under_common_control", ria_only=False, ready=I),
    _yn("7B", "7B", "reports_private_funds", ria_only=False, ready=R),
    _num("7B", "Count of Private Funds - 7B(1)", "private_fund_count_7b1", ria_only=False, ready=R),
    _num("7B", "Count of Private Funds - 7B(2)", "private_fund_count_7b2", ria_only=False, ready=R),
    _num("7B", "Total Gross Assets of Private Funds", "private_fund_gross_assets", ria_only=False, ready=R),
    _yn("7B", "Any PFs a Master", "private_funds_any_master", ria_only=False, ready=R),
    _yn("7B", "Any Hedge Funds", "private_funds_any_hedge", ria_only=False, ready=R),
    _num("7B", "Total number of Hedge funds", "private_fund_hedge_count", ria_only=False, ready=R),
    _yn("7B", "Any Liquidity Funds", "private_funds_any_liquidity", ria_only=False, ready=R),
    _num("7B", "Total number of Liquidity funds", "private_fund_liquidity_count", ria_only=False, ready=R),
    _yn("7B", "Any PE Funds", "private_funds_any_pe", ria_only=False, ready=R),
    _num("7B", "Total number of PE funds", "private_fund_pe_count", ria_only=False, ready=R),
    _yn("7B", "Any Real Estate Funds", "private_funds_any_real_estate", ria_only=False, ready=R),
    _num("7B", "Total number of Real Estate funds", "private_fund_real_estate_count", ria_only=False, ready=R),
    _yn("7B", "Any Securitized Funds", "private_funds_any_securitized", ria_only=False, ready=R),
    _num("7B", "Total number of Securitized funds", "private_fund_securitized_count", ria_only=False, ready=R),
    _yn("7B", "Any VC Funds", "private_funds_any_vc", ria_only=False, ready=R),
    _num("7B", "Total number of VC funds", "private_fund_vc_count", ria_only=False, ready=R),
    _yn("7B", "Any Other Funds", "private_funds_any_other", ria_only=False, ready=R),
    _num("7B", "Total number of Other funds", "private_fund_other_count", ria_only=False, ready=R),
    # Item 8
    _yn("8", "8A(1)", "item_8a1", ria_only=True, ready=I),
    _yn("8", "8A(2)", "item_8a2", ria_only=True, ready=I),
    _yn("8", "8A(3)", "item_8a3", ria_only=True, ready=I),
    _yn("8", "8B(1)", "item_8b1", ria_only=True, ready=I),
    _yn("8", "8B(2)", "item_8b2", ria_only=True, ready=I),
    _yn("8", "8B(3)", "item_8b3", ria_only=True, ready=I),
    _yn("8", "8C(1)", "item_8c1", ria_only=True, ready=I),
    _yn("8", "8D", "item_8d", ria_only=True, ready=I),
    _yn("8", "8E", "item_8e", ria_only=True, ready=I),
    _yn("8", "8G(1)", "item_8g1", ria_only=True, ready=I),
    _yn("8", "8H", "item_8h", ria_only=True, ready=I),
    _yn("8", "8I", "item_8i", ria_only=True, ready=I),
    # Item 9 custody
    _yn("9", "9A(1)(a)", "custody_cash", ria_only=True, ready=R),
    _yn("9", "9A(1)(b)", "custody_securities", ria_only=True, ready=R),
    _yn("9", "9A(2)(a)", "custody_9a2a", ria_only=True, ready=I),
    _yn("9", "9A(2)(b)", "custody_9a2b", ria_only=True, ready=I),
    _yn("9", "9B(1)(a)", "related_person_custody_cash", ria_only=True, ready=R),
    _yn("9", "9B(1)(b)", "related_person_custody_securities", ria_only=True, ready=R),
    _yn("9", "9B(2)(a)", "related_person_custody_9b2a", ria_only=True, ready=I),
    _yn("9", "9B(2)(b)", "related_person_custody_9b2b", ria_only=True, ready=I),
    _num("9", "Total Custody Amount", "total_custody_amount", ria_only=True, ready=I),
    _yn("9", "9C(1)", "custody_9c1", ria_only=True, ready=I),
    _yn("9", "9C(2)", "custody_9c2", ria_only=True, ready=I),
    _yn("9", "9C(3)", "custody_9c3", ria_only=True, ready=I),
    _yn("9", "9C(4)", "custody_9c4", ria_only=True, ready=I),
    _yn("9", "9D(1)", "custody_9d1", ria_only=True, ready=I),
    _yn("9", "9D(2)", "custody_9d2", ria_only=True, ready=I),
    _yn("9", "9E", "custody_9e", ria_only=True, ready=I),
    _yn("9", "9F", "custody_9f", ria_only=True, ready=I),
    # Item 10
    _yn("10", "10A", "control_person_public_reporting_company", ria_only=False, ready=I),
    _num("10", "Count of Control person Public Reporting Company", "control_person_public_company_count", ria_only=False, ready=I),
    # Item 11
    _yn("11", "11", "disclosure_indicator", ria_only=False, ready=I),
    _yn("11", "11A(1)", "disclosure_11a1_criminal_felony", ria_only=False, ready=I),
    _num("11", "Count of 11A(1) disclosures", "count_11a1", ria_only=False, ready=I),
    _yn("11", "11A(2)", "disclosure_11a2_criminal_misdemeanor", ria_only=False, ready=I),
    _num("11", "Count of 11A(2) disclosures", "count_11a2", ria_only=False, ready=I),
    _yn("11", "11B(1)", "disclosure_11b1", ria_only=False, ready=I),
    _num("11", "Count of 11B(1) disclosures", "count_11b1", ria_only=False, ready=I),
    _yn("11", "11B(2)", "disclosure_11b2", ria_only=False, ready=I),
    _num("11", "Count of 11B(2) disclosures", "count_11b2", ria_only=False, ready=I),
    _yn("11", "11C(1)", "disclosure_11c1", ria_only=False, ready=I),
    _num("11", "Count of 11C(1) disclosures", "count_11c1", ria_only=False, ready=I),
    _yn("11", "11C(2)", "disclosure_11c2", ria_only=False, ready=I),
    _num("11", "Count of 11C(2) disclosures", "count_11c2", ria_only=False, ready=I),
    _yn("11", "11C(3)", "disclosure_11c3", ria_only=False, ready=I),
    _num("11", "Count of 11C(3) disclosures", "count_11c3", ria_only=False, ready=I),
    _yn("11", "11C(4)", "disclosure_11c4", ria_only=False, ready=I),
    _num("11", "Count of 11C(4) disclosures", "count_11c4", ria_only=False, ready=I),
    _yn("11", "11C(5)", "disclosure_11c5", ria_only=False, ready=I),
    _num("11", "Count of 11C(5) disclosures", "count_11c5", ria_only=False, ready=I),
    _yn("11", "11D(1)", "disclosure_11d1", ria_only=False, ready=I),
    _num("11", "Count of 11D(1) disclosures", "count_11d1", ria_only=False, ready=I),
    _yn("11", "11D(2)", "disclosure_11d2", ria_only=False, ready=I),
    _num("11", "Count of 11D(2) disclosures", "count_11d2", ria_only=False, ready=I),
    _yn("11", "11D(3)", "disclosure_11d3", ria_only=False, ready=I),
    _num("11", "Count of 11D(3) disclosures", "count_11d3", ria_only=False, ready=I),
    _yn("11", "11D(4)", "disclosure_11d4", ria_only=False, ready=I),
    _num("11", "Count of 11D(4) disclosures", "count_11d4", ria_only=False, ready=I),
    _yn("11", "11D(5)", "disclosure_11d5", ria_only=False, ready=I),
    _num("11", "Count of 11D(5) disclosures", "count_11d5", ria_only=False, ready=I),
    _yn("11", "11E(1)", "disclosure_11e1", ria_only=False, ready=I),
    _num("11", "Count of 11E(1) disclosures", "count_11e1", ria_only=False, ready=I),
    _yn("11", "11E(2)", "disclosure_11e2", ria_only=False, ready=I),
    _num("11", "Count of 11E(2) disclosures", "count_11e2", ria_only=False, ready=I),
    _yn("11", "11E(3)", "disclosure_11e3", ria_only=False, ready=I),
    _num("11", "Count of 11E(3) disclosures", "count_11e3", ria_only=False, ready=I),
    _yn("11", "11E(4)", "disclosure_11e4", ria_only=False, ready=I),
    _num("11", "Count of 11E(4) disclosures", "count_11e4", ria_only=False, ready=I),
    _yn("11", "11F", "disclosure_11f", ria_only=False, ready=I),
    _num("11", "Count of 11F disclosures", "count_11f", ria_only=False, ready=I),
    _yn("11", "11G", "disclosure_11g", ria_only=False, ready=I),
    _num("11", "Count of 11G disclosures", "count_11g", ria_only=False, ready=I),
    _yn("11", "11H(1)(a)", "disclosure_11h1a", ria_only=False, ready=I),
    _num("11", "Count of 11H(1)(a) disclosures", "count_11h1a", ria_only=False, ready=I),
    _yn("11", "11H(1)(b)", "disclosure_11h1b", ria_only=False, ready=I),
    _num("11", "Count of 11H(1)(b) disclosures", "count_11h1b", ria_only=False, ready=I),
    _yn("11", "11H(1)(c)", "disclosure_11h1c", ria_only=False, ready=I),
    _num("11", "Count of 11H(1)(c) disclosures", "count_11h1c", ria_only=False, ready=I),
    _yn("11", "11H(2)", "disclosure_11h2", ria_only=False, ready=I),
    _num("11", "Count of 11H(2) disclosures", "count_11h2", ria_only=False, ready=I),
)

PUBLIC_COPY = {
    "5E": {
        "heading": "Reported compensation methods",
        "body": "These are compensation methods the firm reported on Form ADV Item 5.E in the cited IARD snapshot. This is not a finding that the firm is fee-only, fee-based, or conflicted.",
    },
    "9": {
        "heading": "Firm reports custody",
        "body": "Form ADV Item 9 reports whether the adviser or a related person has custody of client cash or securities as of the cited snapshot. This is not a custody risk score.",
    },
    "6A": {
        "heading": "Other business activities reported on Form ADV",
        "body": "These are other business activities the firm reported on Form ADV Item 6. They are not automatically conflicts or negative findings.",
    },
    "7A": {
        "heading": "Reported affiliations",
        "body": "These are financial-industry affiliation types the firm reported on Form ADV Item 7.A. Named related persons are not in this source. Affiliation is not ownership and is not a conflict finding.",
    },
    "7B": {
        "heading": "Firm reports advising private funds",
        "body": "Form ADV Item 7.B reports whether the firm advises private funds, with source counts and types. Named funds are not in this snapshot.",
    },
    "5A": {
        "heading": "Reported employees",
        "body": "Employee count as reported on Form ADV Item 5.A. Headcount is not a quality rating. A filed zero is a reported zero, not a missing value.",
    },
    "5C": {
        "heading": "Reported clients",
        "body": "Approximate client count as reported on Form ADV Item 5.C. A filed zero is a reported zero, not unknown.",
    },
    "5F": {
        "heading": "Regulatory assets under management",
        "body": "Regulatory AUM as reported on Form ADV Item 5.F. Not performance, popularity, or quality. A filed $0 is a reported zero, not missing.",
    },
    "1": {
        "heading": "Contact and office information as reported",
        "body": "Telephone, mailing, and office-count fields as reported on Form ADV Item 1. Other-office count is not a list of named branches.",
    },
    "11": {
        "heading": "Form ADV disclosure indicator",
        "body": "Item 11 is a Form ADV reported disclosure indicator from the cited snapshot. It is not a misconduct finding, disciplinary history, or a clean-record certificate. Detailed DRP narratives are not in this source.",
    },
    "10": {
        "heading": "Form ADV control-person indicator",
        "body": "Item 10 reports whether a control person is a public reporting company. Named control persons are not in this source.",
    },
}
