from __future__ import annotations

from collections import Counter

from ith_ingestion.errors import ValidationError
from ith_ingestion.sec_adv.models import NormalizedFirm, QuarantineItem


def evaluate_quality(
    *,
    ria_rows: int,
    era_rows: int,
    normalized: list[NormalizedFirm],
    quarantine: list[QuarantineItem],
    previous_total: int | None = None,
) -> list[str]:
    issues: list[str] = []
    if ria_rows + era_rows == 0:
        issues.append("source file is empty")
    valid_crds = {firm.crd for firm in normalized}
    if not valid_crds:
        issues.append("zero valid CRDs")
    current_total = ria_rows + era_rows
    if previous_total and previous_total > 0:
        if current_total < int(previous_total * 0.5):
            issues.append(
                f"extreme row-count collapse: {current_total} vs previous {previous_total}"
            )
        if current_total > int(previous_total * 2.0) and previous_total > 100:
            issues.append(
                f"unexpected massive row-count increase: {current_total} vs previous {previous_total}"
            )
    reasons = Counter(item.reason_code for item in quarantine)
    if reasons.get("duplicate_crd", 0) > max(50, int(current_total * 0.01)):
        issues.append("too many duplicate CRDs in source")
    if issues:
        raise ValidationError("quality gate failed", issues)
    return []


def distribution(normalized: list[NormalizedFirm]) -> dict[str, object]:
    by_kind = Counter(firm.dataset_kind for firm in normalized)
    by_state = Counter(
        (firm.main_office.get("region") or "").strip() or "UNKNOWN" for firm in normalized
    )
    usable_office = sum(
        1
        for firm in normalized
        if firm.main_office.get("city") and (firm.main_office.get("region") or firm.main_office.get("country"))
    )
    return {
        "firms_by_source_type": dict(by_kind),
        "top_states": by_state.most_common(15),
        "firms_with_usable_principal_office": usable_office,
        "firms_without_usable_principal_office": len(normalized) - usable_office,
    }
