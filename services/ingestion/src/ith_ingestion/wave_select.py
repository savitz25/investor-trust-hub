"""Deterministic, non-ranking Firm Trust Report indexing waves."""

from __future__ import annotations

import hashlib
from collections import Counter
from typing import Any

ALGORITHM_VERSION = "crd-sha256-v1"
WAVE_1_ID = "wave-1"
WAVE_1_SIZE = 1000


def wave_sort_key(crd: str, release_label: str, algorithm: str = ALGORITHM_VERSION) -> str:
    material = f"{crd.strip()}\0{(release_label or '').strip()}\0{algorithm}".encode()
    return hashlib.sha256(material).hexdigest()


def select_wave(
    eligible: list[dict[str, Any]],
    size: int,
    *,
    algorithm: str = ALGORITHM_VERSION,
) -> list[dict[str, Any]]:
    """Return a stable sample. Does not use RAUM, name, fame, or paid status."""
    if size < 0:
        raise ValueError("wave size must be >= 0")
    ranked = sorted(
        eligible,
        key=lambda item: (
            wave_sort_key(str(item.get("crd") or ""), str(item.get("release_label") or ""), algorithm),
            str(item.get("crd") or ""),
        ),
    )
    return ranked[:size]


def summarize_wave(selected: list[dict[str, Any]]) -> dict[str, Any]:
    crds = [str(item.get("crd") or "") for item in selected]
    classes = Counter(str(item.get("classification") or "unknown") for item in selected)
    states = Counter()
    missing_state = 0
    for item in selected:
        region = str(item.get("region") or "").strip().upper()
        if region:
            states[region] += 1
        else:
            missing_state += 1
    duplicates = len(crds) - len(set(crds))
    return {
        "selected_count": len(selected),
        "classes": dict(classes),
        "state_distribution": dict(states.most_common()),
        "missing_state": missing_state,
        "duplicate_crds": duplicates,
        "crds": crds,
    }


def sample_crds_for_qa(selected: list[dict[str, Any]], count: int = 30) -> list[str]:
    """Deterministic QA slice covering class variety, then hash order."""
    if not selected:
        return []
    picked: list[str] = []
    seen: set[str] = set()
    for class_name in ("reported_as_registered", "pending_120_day", "exempt_reporting_adviser"):
        for item in selected:
            crd = str(item.get("crd") or "")
            if item.get("classification") == class_name and crd and crd not in seen:
                picked.append(crd)
                seen.add(crd)
                break
    for item in selected:
        crd = str(item.get("crd") or "")
        if crd and crd not in seen:
            picked.append(crd)
            seen.add(crd)
        if len(picked) >= count:
            break
    return picked[:count]
