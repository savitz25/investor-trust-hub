from __future__ import annotations

import json
from functools import lru_cache
from importlib.resources import files

REQUIRED_SHARED_HEADERS = (
    "Organization CRD#",
    "SEC#",
    "Firm Type",
    "Primary Business Name",
    "Legal Name",
    "Main Office Street Address 1",
    "Main Office Street Address 2",
    "Main Office City",
    "Main Office State",
    "Main Office Country",
    "Main Office Postal Code",
    "SEC Current Status",
    "SEC Status Effective Date",
    "Latest ADV Filing Date",
    "Form Version",
    "Website Address",
    "3A",
    "3B",
    "11",
)

REQUIRED_RIA_HEADERS = REQUIRED_SHARED_HEADERS + (
    "5F(1)",
    "5F(2)(a)",
    "5F(2)(b)",
    "5F(2)(c)",
    "CIK#",
)

REQUIRED_ERA_HEADERS = REQUIRED_SHARED_HEADERS + (
    "2B(1)",
    "2B(2)",
    "2B(3)",
    "CIK#",
)


@lru_cache(maxsize=2)
def official_headers(dataset_kind: str) -> tuple[str, ...]:
    name = "ria_headers.json" if dataset_kind == "ria" else "era_headers.json"
    payload = files("ith_ingestion.sec_adv").joinpath(name).read_text(encoding="utf-8")
    return tuple(json.loads(payload))


def required_headers(dataset_kind: str) -> tuple[str, ...]:
    return REQUIRED_RIA_HEADERS if dataset_kind == "ria" else REQUIRED_ERA_HEADERS


def validate_headers(dataset_kind: str, observed: list[str]) -> list[str]:
    """Return blocking issues. Extra columns are allowed; missing required columns are not."""
    issues: list[str] = []
    observed_set = set(observed)
    for header in required_headers(dataset_kind):
        if header not in observed_set:
            issues.append(f"missing required header: {header}")
    official = official_headers(dataset_kind)
    missing_official = [header for header in official if header not in observed_set]
    if len(missing_official) > 25:
        issues.append(
            f"major unexpected header change: {len(missing_official)} official columns missing"
        )
    return issues
