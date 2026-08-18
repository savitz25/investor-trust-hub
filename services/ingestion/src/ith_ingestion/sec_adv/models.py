from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any, Literal

DatasetKind = Literal["ria", "era"]


@dataclass(frozen=True)
class DiscoveredFile:
    dataset_kind: DatasetKind
    dataset_id: str
    title: str
    url: str
    filename: str
    published_on: date
    release_label: str


@dataclass
class ReleaseFile:
    discovered: DiscoveredFile
    local_zip: str
    local_csv: str
    csv_filename: str
    zip_bytes: int
    csv_bytes: int
    zip_sha256: str
    csv_sha256: str
    retrieved_at: datetime


@dataclass
class ParsedRow:
    dataset_kind: DatasetKind
    row_number: int
    values: dict[str, str]


@dataclass
class NormalizedFirm:
    dataset_kind: DatasetKind
    crd: str
    sec_file_number: str | None
    legal_name: str
    display_name: str
    firm_type_source: str
    sec_current_status_text: str
    registration_type: str
    registration_status: str
    sec_status_effective_date: date | None
    latest_adv_filing_date: date | None
    form_version: str | None
    website: str | None
    organization_form: str | None
    fiscal_year_end: str | None
    main_office: dict[str, str | None]
    raum_amount: str | None
    raum_discretionary_amount: str | None
    raum_nondiscretionary_amount: str | None
    disclosure_indicator: str | None
    cik: str | None
    raw: dict[str, str]
    source_record_identifier: str


@dataclass
class QuarantineItem:
    dataset_kind: DatasetKind
    row_number: int
    reason_code: str
    detail: str
    source_record_identifier: str | None
    raw: dict[str, Any]


@dataclass
class ReleaseReport:
    release_label: str
    transform_version: str
    retrieved_at: str
    source: dict[str, Any]
    records: dict[str, Any]
    publish: dict[str, Any]
    quality: dict[str, Any]
    distribution: dict[str, Any]
    performance: dict[str, Any] = field(default_factory=dict)
    already_published: bool = False
    dry_run: bool = True

    def as_dict(self) -> dict[str, Any]:
        return {
            "release_label": self.release_label,
            "transform_version": self.transform_version,
            "retrieved_at": self.retrieved_at,
            "already_published": self.already_published,
            "dry_run": self.dry_run,
            "source": self.source,
            "records": self.records,
            "publish": self.publish,
            "quality": self.quality,
            "distribution": self.distribution,
            "performance": self.performance,
        }
