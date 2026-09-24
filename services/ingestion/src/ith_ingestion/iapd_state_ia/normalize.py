"""Map IAPD jurisdiction rows onto state_registration_observations semantics.

Grain stays separate: state IA registration, state ERA, and notice filing
are never added together. Identity is exact firm CRD. Names are labels only.
"""

from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from dataclasses import asdict, dataclass

STATES = ("OR", "AZ", "WA")
CLASSES = ("state_ia", "state_era", "notice_filing")

# Status strings observed on the acquired IAPD compilations or named by the
# existing census parser. Anything else is review-required, not coerced.
KNOWN_STATUSES = {
    "state_ia": frozenset({"APPROVED", "TERMREQUEST", "CONDREST", "LIMITED", "ACTIVE", "PENDING"}),
    "state_era": frozenset({"ACTIVE", "APPROVED", "TERMREQUEST"}),
    "notice_filing": frozenset({"FILED"}),
}

CLASS_LABEL = {
    "state_ia": "state-registered investment adviser firm",
    "state_era": "exempt reporting adviser",
    "notice_filing": "notice-filed federally covered adviser",
}


@dataclass(frozen=True)
class SourceRow:
    jurisdiction: str
    registration_class: str
    crd: str
    sec_file_number: str
    legal_name: str
    business_name: str
    status: str
    status_date: str
    source_dataset_id: str
    source_as_of: str
    retrieved_at: str


@dataclass(frozen=True)
class Observation:
    jurisdiction: str
    registration_class: str
    crd: str
    sec_file_number: str
    legal_name: str
    status: str
    status_date: str
    source_dataset_id: str
    source_as_of: str
    retrieved_at: str
    fingerprint: str
    match_status: str
    public_eligibility: str
    disposition: str


def _digits(value: str) -> str:
    return "".join(ch for ch in (value or "") if ch.isdigit())


def observation_fingerprint(row: SourceRow, crd: str, status: str, status_date: str) -> str:
    payload = {
        "class": row.registration_class,
        "crd": crd,
        "date": status_date or None,
        "jurisdiction": row.jurisdiction,
        "source_as_of": row.source_as_of,
        "source_dataset_id": row.source_dataset_id,
        "status": status,
    }
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(raw).hexdigest()


@dataclass
class ProductizeLedger:
    by_state: dict
    cross_state: dict
    observations: list[Observation]
    excluded: list[dict]

    def as_dict(self) -> dict:
        return {
            "by_state": self.by_state,
            "cross_state": self.cross_state,
            "ready_observation_count": sum(1 for row in self.observations if row.disposition == "READY_INTERNAL"),
            "excluded": self.excluded,
        }


def normalize_observations(
    rows: list[SourceRow],
    *,
    existing_firm_crds: set[str] | None = None,
) -> ProductizeLedger:
    """existing_firm_crds is an optional local extract. None means not evaluated.

    Passing a set never creates firms. Unmatched CRDs stay firm_id-null.
    """
    excluded: list[dict] = []
    accepted: list[tuple[SourceRow, str, str, str]] = []
    seen_fp: dict[str, int] = defaultdict(int)
    names_by_crd: dict[str, set[str]] = defaultdict(set)

    for row in rows:
        jurisdiction = (row.jurisdiction or "").strip().upper()
        reg_class = (row.registration_class or "").strip().lower()
        crd = _digits(row.crd)
        status = (row.status or "").strip().upper()
        status_date = (row.status_date or "").strip()
        legal = (row.legal_name or "").strip() or (row.business_name or "").strip()

        if jurisdiction not in STATES or len(jurisdiction) != 2:
            excluded.append({"reason": "malformed_jurisdiction", "jurisdiction": row.jurisdiction, "crd": crd or None})
            continue
        if reg_class not in CLASSES:
            excluded.append({"reason": "unmapped_class", "jurisdiction": jurisdiction, "class": row.registration_class, "crd": crd or None})
            continue
        if not crd:
            excluded.append({"reason": "missing_crd", "jurisdiction": jurisdiction, "class": reg_class})
            continue
        if not legal:
            excluded.append({"reason": "missing_legal_name", "jurisdiction": jurisdiction, "class": reg_class, "crd": crd})
            continue
        if status not in KNOWN_STATUSES[reg_class]:
            excluded.append({"reason": "unknown_status", "jurisdiction": jurisdiction, "class": reg_class, "crd": crd, "status": status or None})
            continue
        names_by_crd[crd].add(legal.casefold())
        fp = observation_fingerprint(row, crd, status, status_date)
        seen_fp[fp] += 1
        accepted.append((row, crd, status, status_date))

    colliding_crds = {crd for crd, names in names_by_crd.items() if len(names) > 1}
    observations: list[Observation] = []
    emitted: set[str] = set()
    for row, crd, status, status_date in accepted:
        fp = observation_fingerprint(row, crd, status, status_date)
        if fp in emitted:
            continue
        emitted.add(fp)
        if crd in colliding_crds:
            disposition = "REVIEW_REQUIRED"
            match_status = "COLLISION"
        elif existing_firm_crds is None:
            disposition = "READY_INTERNAL"
            match_status = "FIRM_MATCH_NOT_EVALUATED"
        elif crd in existing_firm_crds:
            disposition = "READY_INTERNAL"
            match_status = "EXACT_CRD"
        else:
            disposition = "READY_INTERNAL"
            match_status = "UNMATCHED_NO_FIRM"
        legal = (row.legal_name or "").strip() or (row.business_name or "").strip()
        observations.append(
            Observation(
                jurisdiction=row.jurisdiction.strip().upper(),
                registration_class=row.registration_class.strip().lower(),
                crd=crd,
                sec_file_number=(row.sec_file_number or "").strip(),
                legal_name=legal,
                status=status,
                status_date=status_date,
                source_dataset_id=row.source_dataset_id,
                source_as_of=row.source_as_of,
                retrieved_at=row.retrieved_at,
                fingerprint=fp,
                match_status=match_status,
                public_eligibility="internal_only",
                disposition=disposition,
            )
        )

    by_state: dict[str, dict] = {}
    for state in STATES:
        state_rows = [row for row in rows if (row.jurisdiction or "").strip().upper() == state]
        state_obs = [obs for obs in observations if obs.jurisdiction == state]
        raw = len(state_rows)
        classes: dict[str, dict] = {}
        for reg_class in CLASSES:
            class_rows = [row for row in state_rows if (row.registration_class or "").strip().lower() == reg_class]
            class_obs = [obs for obs in state_obs if obs.registration_class == reg_class]
            crds = [_digits(row.crd) for row in class_rows if _digits(row.crd)]
            unique = set(crds)
            fingerprints = {
                observation_fingerprint(
                    row,
                    _digits(row.crd),
                    (row.status or "").strip().upper(),
                    (row.status_date or "").strip(),
                )
                for row in class_rows
                if _digits(row.crd)
            }
            classes[reg_class] = {
                "raw_rows": len(class_rows),
                "unique_crd": len(unique),
                "duplicate_collapsed": max(0, len(crds) - len(fingerprints)),
                "ready_internal": sum(1 for obs in class_obs if obs.disposition == "READY_INTERNAL"),
                "review_required": sum(1 for obs in class_obs if obs.disposition == "REVIEW_REQUIRED"),
                "duplicate_extra_rows": sum(1 for obs in class_obs if seen_fp[obs.fingerprint] > 1),
            }
        excluded_state = [item for item in excluded if item.get("jurisdiction") in {state, state.lower()}]
        # malformed jurisdictions are not attributed
        ready = [obs for obs in state_obs if obs.disposition == "READY_INTERNAL"]
        review = [obs for obs in state_obs if obs.disposition == "REVIEW_REQUIRED"]
        exact = sum(1 for obs in ready if obs.match_status == "EXACT_CRD")
        unmatched = sum(1 for obs in ready if obs.match_status == "UNMATCHED_NO_FIRM")
        not_evaluated = sum(1 for obs in ready if obs.match_status == "FIRM_MATCH_NOT_EVALUATED")
        by_state[state] = {
            "raw_rows": raw,
            "classes": classes,
            "unique_crd_any_class": len({obs.crd for obs in state_obs}),
            "duplicates_collapsed": sum(classes[c]["duplicate_collapsed"] for c in CLASSES),
            "collisions": len({obs.crd for obs in review if obs.match_status == "COLLISION"}),
            "review_required": len(review) + len(excluded_state),
            "excluded": len(excluded_state),
            "ready_for_productization": len(ready),
            "exact_existing_firm_matches": exact if existing_firm_crds is not None else None,
            "unmatched": unmatched if existing_firm_crds is not None else None,
            "firm_match_not_evaluated": not_evaluated if existing_firm_crds is None else 0,
            "expected_destination_writes": len(ready) + len(review),
            "expected_no_ops_on_second_run": len(ready) + len(review),
            "public_eligibility": "internal_only",
        }

    convenience = {
        "label": "convenience sum of three state feeds, not one Investor identity count",
        "raw_rows": sum(by_state[s]["raw_rows"] for s in STATES),
        "ready_internal_observations": sum(by_state[s]["ready_for_productization"] for s in STATES),
    }
    return ProductizeLedger(by_state=by_state, cross_state=convenience, observations=observations, excluded=excluded)


def ledger_public_dict(ledger: ProductizeLedger) -> dict:
    payload = ledger.as_dict()
    payload["observations"] = [asdict(row) for row in ledger.observations if row.disposition != "READY_INTERNAL"][:50]
    payload["note"] = "Ready rows are omitted from this preview. Counts are authoritative. public_eligibility stays internal_only."
    return payload
