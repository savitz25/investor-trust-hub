"""Issuer / exemption / crowdfunding / ISO filing classes. ISSUER != ADVISER."""

from __future__ import annotations

from dataclasses import asdict, dataclass

AVAILABLE_PUBLIC_DOWNLOAD = "AVAILABLE_PUBLIC_DOWNLOAD"
AVAILABLE_BY_REQUEST = "AVAILABLE_BY_REQUEST"
CURRENT = "CURRENT"
UNKNOWN = "UNKNOWN"

FILING_CLASSES: list[dict] = [
    {
        "filing_class": "PRIVATE_PLACEMENT_REPORT",
        "form_code": "NJBOS-1",
        "title": "Private Placement Report of Sale",
        "availability": AVAILABLE_PUBLIC_DOWNLOAD,
        "statutory_basis": "N.J.S.A. 49:3-50(b)(12)",
        "source_url": "https://www.njconsumeraffairs.gov/bos/bosforms/Private-Placement-Report-Form-NJBOS-Form-1.pdf",
        "endorsement": False,
    },
    {
        "filing_class": "SCOR_REGISTRATION",
        "form_code": "U-7",
        "title": "Small Corporate Offering Registration (SCOR)",
        "availability": AVAILABLE_PUBLIC_DOWNLOAD,
        "statutory_basis": "N.J.S.A. 49:3-61",
        "source_url": "https://www.njconsumeraffairs.gov/bos/bosforms/Instructions3-Small-Corporate-Offering-Registration-SCOR.pdf",
        "related_forms": ["U-1", "U-2", "U-2A", "NJBOS-3"],
    },
    {
        "filing_class": "INVESTMENT_COMPANY_NOTICE",
        "form_code": "NF",
        "title": "Investment Company Notice Filing",
        "availability": AVAILABLE_PUBLIC_DOWNLOAD,
        "statutory_basis": "N.J.S.A. 49:3-60.1",
        "source_url": "https://www.njconsumeraffairs.gov/bos/bosforms/Instructions5-Investment-Company-Notice-Filing.pdf",
        "covered_security": True,
    },
    {
        "filing_class": "FORM_D_NOTICE",
        "form_code": "Form D",
        "title": "Federal Form D copy filed with NJ private placement report when applicable",
        "availability": AVAILABLE_BY_REQUEST,
        "statutory_basis": "N.J.S.A. 49:3-50(b)(12) (copy of filed Form D if applicable)",
        "source_url": "https://www.njconsumeraffairs.gov/bos/bosforms/Private-Placement-Report-Form-NJBOS-Form-1.pdf",
        "join_rule": "EXACT_SEC_IDENTIFIER_ONLY",
    },
    {
        "filing_class": "CROWDFUNDING_EXEMPTION",
        "form_code": "NJBOS-9",
        "title": "NJ Intrastate Crowdfunding Exemption",
        "availability": AVAILABLE_BY_REQUEST,
        "statutory_basis": "New Jersey intrastate crowdfunding exemption",
        "source_url": "https://www.njconsumeraffairs.gov/bos/Pages/industryforms.aspx",
        "related_forms": ["NJBOS-12", "NJBOS-13"],
    },
    {
        "filing_class": "CROWDFUNDING_INVESTOR_CERTIFICATION",
        "form_code": "NJBOS-12",
        "title": "Intrastate Offering (Crowdfunding) Investor Certification Form",
        "availability": AVAILABLE_PUBLIC_DOWNLOAD,
        "statutory_basis": "NJ intrastate crowdfunding",
        "source_url": "https://www.njconsumeraffairs.gov/bos/bosforms/Form-12-Investor-Certification-Form.pdf",
        "contains_investor_pii_fields": True,
        "ingest_pii": False,
    },
    {
        "filing_class": "CROWDFUNDING_INVESTOR_LEGEND",
        "form_code": "NJBOS-13",
        "title": "Investor Legend Form",
        "availability": AVAILABLE_PUBLIC_DOWNLOAD,
        "source_url": "https://www.njconsumeraffairs.gov/bos/bosforms/Form-13-Investor-Legend-Form.pdf",
    },
    {
        "filing_class": "INTERNET_SITE_OPERATOR",
        "form_code": "NJBOS-10",
        "title": "Internet Site Operator Registration",
        "availability": AVAILABLE_BY_REQUEST,
        "source_url": "https://www.njconsumeraffairs.gov/bos/Pages/industryforms.aspx",
        "related_forms": ["NJBOS-11"],
    },
    {
        "filing_class": "ISO_AMENDMENT",
        "form_code": "NJBOS-11",
        "title": "Internet Site Operator amendment",
        "availability": AVAILABLE_BY_REQUEST,
        "source_url": "https://www.njconsumeraffairs.gov/bos/Pages/industryforms.aspx",
    },
    {
        "filing_class": "ISSUER_AGENT_REGISTRATION",
        "form_code": "U4+NJBOS-4",
        "title": "Agent of the Issuer Registration",
        "availability": AVAILABLE_PUBLIC_DOWNLOAD,
        "statutory_basis": "N.J.S.A. 49:3-56",
        "source_url": "https://www.njconsumeraffairs.gov/bos/bosforms/Instructions6-Agent-of-the-Issuer-Registration.pdf",
        "person_grain": True,
        "public_directory": False,
    },
    {
        "filing_class": "RESCISSION_OFFER",
        "form_code": "Instruction-1",
        "title": "Rescission offer procedure",
        "availability": AVAILABLE_PUBLIC_DOWNLOAD,
        "statutory_basis": "N.J.S.A. 49:3-71(g)",
        "source_url": "https://www.njconsumeraffairs.gov/bos/bosforms/Instructions1-Rescission-Offer.pdf",
    },
    {
        "filing_class": "SECURITIES_REGISTRATION_U1",
        "form_code": "U-1",
        "title": "Uniform Application to Register Securities",
        "availability": AVAILABLE_BY_REQUEST,
        "source_url": "https://www.njconsumeraffairs.gov/bos/Pages/industryforms.aspx",
    },
]


@dataclass
class FilingClass:
    filing_class: str
    form_code: str | None
    title: str
    availability: str
    statutory_basis: str | None = None
    source_url: str | None = None
    endorsement: bool = False
    covered_security: bool = False
    join_rule: str = "NO_NAME_ONLY_RIA_ATTACH"

    def as_dict(self) -> dict:
        return asdict(self)


def inventory() -> list[FilingClass]:
    rows = []
    for item in FILING_CLASSES:
        rows.append(
            FilingClass(
                filing_class=item["filing_class"],
                form_code=item.get("form_code"),
                title=item["title"],
                availability=item["availability"],
                statutory_basis=item.get("statutory_basis"),
                source_url=item.get("source_url"),
                endorsement=bool(item.get("endorsement")),
                covered_security=bool(item.get("covered_security")),
                join_rule=item.get("join_rule", "NO_NAME_ONLY_RIA_ATTACH"),
            )
        )
    return rows


def form_d_join_allowed(sec_identifier: str | None, legal_name: str | None, ria_name: str | None) -> str:
    if sec_identifier:
        return "EXACT_JOIN"
    if legal_name and ria_name and legal_name.strip().lower() == ria_name.strip().lower():
        return "UNSAFE_REJECTED"
    return "NO_JOIN"


def exemption_is_endorsement(_filing_class: str) -> bool:
    return False
