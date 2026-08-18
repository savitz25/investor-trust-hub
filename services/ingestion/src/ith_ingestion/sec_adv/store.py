from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from ith_ingestion.sec_adv.identifiers import firm_slug_for_crd
from ith_ingestion.sec_adv.models import NormalizedFirm, QuarantineItem


@dataclass
class PublishCounts:
    firms_inserted: int = 0
    firms_updated: int = 0
    firms_noop: int = 0
    identifiers_created: int = 0
    registrations_upserted: int = 0
    locations_upserted: int = 0
    evidence_created: int = 0
    snapshots_created: int = 0
    observations_created: int = 0
    facts_upserted: int = 0
    search_documents_upserted: int = 0
    not_observed: int = 0
    quarantined: int = 0

    def as_dict(self) -> dict[str, int]:
        return self.__dict__.copy()


class CanonicalStore(Protocol):
    def already_published(self, idempotency_key: str) -> bool: ...

    def mark_published(self, idempotency_key: str) -> None: ...

    def publish(
        self,
        *,
        release_label: str,
        firms: list[NormalizedFirm],
        quarantine: list[QuarantineItem],
        synthetic: bool,
    ) -> PublishCounts: ...

    def rollback(self, idempotency_key: str) -> None: ...

    def firm_count(self) -> int: ...

    def identifier_count(self) -> int: ...

    def snapshot_count(self) -> int: ...


@dataclass
class _StoredFirm:
    crd: str
    legal_name: str
    display_name: str
    kinds: set[str]
    last_release: str


class MemoryCanonicalStore:
    """In-memory canonical store used by tests and dry-run planning."""

    def __init__(self) -> None:
        self.published_keys: set[str] = set()
        self.firms: dict[str, _StoredFirm] = {}
        self.identifiers: set[tuple[str, str]] = set()
        self.registrations: dict[tuple[str, str], str] = {}
        self.locations: set[tuple[str, str]] = set()
        self.evidence: set[tuple[str, str, str, str]] = set()
        self.snapshots: set[tuple[str, str]] = set()
        self.observations: set[tuple[str, str, str]] = set()
        self.facts: set[tuple[str, str, str]] = set()
        self.search: set[str] = set()
        self.quarantine: list[QuarantineItem] = []
        self.history: dict[str, PublishCounts] = {}
        self._backup: dict[str, object] | None = None

    def already_published(self, idempotency_key: str) -> bool:
        return idempotency_key in self.published_keys

    def mark_published(self, idempotency_key: str) -> None:
        self.published_keys.add(idempotency_key)

    def firm_count(self) -> int:
        return len(self.firms)

    def identifier_count(self) -> int:
        return len(self.identifiers)

    def snapshot_count(self) -> int:
        return len(self.snapshots)

    def _snapshot_state(self) -> dict[str, object]:
        return {
            "firms": {key: _StoredFirm(**value.__dict__) for key, value in self.firms.items()},
            "identifiers": set(self.identifiers),
            "registrations": dict(self.registrations),
            "locations": set(self.locations),
            "evidence": set(self.evidence),
            "snapshots": set(self.snapshots),
            "observations": set(self.observations),
            "facts": set(self.facts),
            "search": set(self.search),
            "quarantine": list(self.quarantine),
            "published_keys": set(self.published_keys),
        }

    def rollback(self, idempotency_key: str) -> None:
        if self._backup is None:
            self.published_keys.discard(idempotency_key)
            return
        state = self._backup
        self.firms = state["firms"]  # type: ignore[assignment]
        self.identifiers = state["identifiers"]  # type: ignore[assignment]
        self.registrations = state["registrations"]  # type: ignore[assignment]
        self.locations = state["locations"]  # type: ignore[assignment]
        self.evidence = state["evidence"]  # type: ignore[assignment]
        self.snapshots = state["snapshots"]  # type: ignore[assignment]
        self.observations = state["observations"]  # type: ignore[assignment]
        self.facts = state["facts"]  # type: ignore[assignment]
        self.search = state["search"]  # type: ignore[assignment]
        self.quarantine = state["quarantine"]  # type: ignore[assignment]
        self.published_keys = state["published_keys"]  # type: ignore[assignment]
        self.published_keys.discard(idempotency_key)

    def publish(
        self,
        *,
        release_label: str,
        firms: list[NormalizedFirm],
        quarantine: list[QuarantineItem],
        synthetic: bool,
    ) -> PublishCounts:
        del synthetic
        self._backup = self._snapshot_state()
        counts = PublishCounts(quarantined=len(quarantine))
        previous = {
            crd
            for crd, firm in self.firms.items()
            if any(kind in firm.kinds for kind in ("registered_investment_adviser", "exempt_reporting_adviser"))
        }
        observed: set[str] = set()
        for firm in firms:
            observed.add(firm.crd)
            existing = self.firms.get(firm.crd)
            if existing is None:
                self.firms[firm.crd] = _StoredFirm(
                    crd=firm.crd,
                    legal_name=firm.legal_name,
                    display_name=firm.display_name,
                    kinds={firm.registration_type},
                    last_release=release_label,
                )
                counts.firms_inserted += 1
            else:
                changed = (
                    existing.legal_name != firm.legal_name
                    or existing.display_name != firm.display_name
                    or firm.registration_type not in existing.kinds
                )
                existing.legal_name = firm.legal_name
                existing.display_name = firm.display_name
                existing.kinds.add(firm.registration_type)
                existing.last_release = release_label
                if changed:
                    counts.firms_updated += 1
                else:
                    counts.firms_noop += 1
            slug = firm_slug_for_crd(firm.crd)
            if ("crd", firm.crd) not in self.identifiers:
                self.identifiers.add(("crd", firm.crd))
                counts.identifiers_created += 1
            if firm.sec_file_number and ("sec_file_number", firm.sec_file_number) not in self.identifiers:
                self.identifiers.add(("sec_file_number", firm.sec_file_number))
                counts.identifiers_created += 1
            reg_key = (firm.crd, firm.registration_type)
            if self.registrations.get(reg_key) != firm.registration_status:
                counts.registrations_upserted += 1
            self.registrations[reg_key] = firm.registration_status
            loc_key = (firm.crd, "sec-adv-main-office")
            if loc_key not in self.locations:
                counts.locations_upserted += 1
            self.locations.add(loc_key)
            for field_name in (
                "identity",
                "legal_name",
                "crd",
                "sec_file_number",
                "classification",
                "registration_status",
                "main_office",
            ):
                ev_key = (firm.crd, field_name, release_label, firm.dataset_kind)
                if ev_key not in self.evidence:
                    self.evidence.add(ev_key)
                    counts.evidence_created += 1
            snap_key = (firm.crd, release_label)
            if snap_key not in self.snapshots:
                self.snapshots.add(snap_key)
                counts.snapshots_created += 1
            fact_key = (firm.crd, release_label, firm.dataset_kind)
            if fact_key not in self.facts:
                counts.facts_upserted += 1
            self.facts.add(fact_key)
            obs_key = (firm.crd, firm.dataset_kind, release_label)
            if obs_key not in self.observations:
                counts.observations_created += 1
            self.observations.add(obs_key)
            self.search.add(slug)
            counts.search_documents_upserted += 1
        for crd in previous - observed:
            obs_key = (crd, "missing", release_label)
            if obs_key not in self.observations:
                self.observations.add(obs_key)
                counts.not_observed += 1
                counts.observations_created += 1
        self.quarantine.extend(quarantine)
        return counts
