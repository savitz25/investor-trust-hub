"""Orders of general application and IAR CE policy. Not firm enforcement."""

from __future__ import annotations

from dataclasses import asdict, dataclass

GENERAL_ORDER = "GENERAL_ORDER"
FIRM_ENFORCEMENT = "FIRM_ENFORCEMENT"


@dataclass
class GeneralOrder:
    policy_key: str
    title: str
    effective_on: str | None
    rescinded_on: str | None
    superseded_by_key: str | None
    affected_classes: list[str]
    source_url: str | None
    current_status: str
    document_class: str = GENERAL_ORDER

    def as_dict(self) -> dict:
        return asdict(self)


def is_firm_enforcement(document_class: str) -> bool:
    return document_class == FIRM_ENFORCEMENT


def parse_affected_classes(text: str) -> list[str]:
    mapping = (
        ("investment adviser representative", "IAR"),
        ("investment adviser", "INVESTMENT_ADVISER"),
        ("broker-dealer", "BROKER_DEALER"),
        ("issuer agent", "ISSUER_AGENT"),
        ("agent", "AGENT"),
    )
    low = (text or "").lower()
    found = []
    for needle, label in mapping:
        if needle in low and label not in found:
            found.append(label)
    return found or ["UNSPECIFIED"]


def iar_ce_observation() -> dict:
    """Policy layer only. Not person evidence."""
    return {
        "policy_key": "nj-iar-ce-2025",
        "observation_class": "REGULATORY_POLICY_OBSERVATION",
        "effective_year": 2025,
        "required_credits": 12,
        "ethics_professional_responsibility_credits": 6,
        "ethics_hours_minimum": 3,
        "products_practice_credits": 6,
        "inactive_term": "CE Inactive",
        "deficient_term": "CE deficient for two consecutive years will fail to renew on January 1st",
        "source_url": "https://www.njconsumeraffairs.gov/bos/Pages/Webinar-FAQ.aspx",
        "person_evidence": False,
        "public_directory": False,
    }


def known_general_orders() -> list[GeneralOrder]:
    """HTML industry library is WAF-gated. Seed only officially described policy instruments."""
    return [
        GeneralOrder(
            policy_key="iar-ce-2025-rule",
            title="IAR continuing education requirement effective January 1, 2025",
            effective_on="2025-01-01",
            rescinded_on=None,
            superseded_by_key=None,
            affected_classes=["IAR"],
            source_url="https://www.njconsumeraffairs.gov/bos/Pages/Webinar-FAQ.aspx",
            current_status="CURRENT",
        ),
        GeneralOrder(
            policy_key="exam-waiver-iar-designations",
            title="IAR examination waiver for CFP, ChFC, PFS, CFA, and CIC designations",
            effective_on=None,
            rescinded_on=None,
            superseded_by_key=None,
            affected_classes=["IAR"],
            source_url="https://www.njconsumeraffairs.gov/bos/Pages/examrequirements.aspx",
            current_status="CURRENT",
        ),
    ]
