from pathlib import Path

import pytest

from ith_ingestion.errors import ValidationError
from ith_ingestion.sec_adv.fixtures import write_standard_fixtures
from ith_ingestion.sec_adv.pipeline import run_sec_adv
from ith_ingestion.sec_adv.store import MemoryCanonicalStore


def test_failed_validation_does_not_publish(tmp_path: Path) -> None:
    (tmp_path / "ria.csv").write_text("not-headers\n", encoding="utf-8")
    (tmp_path / "era.csv").write_text("not-headers\n", encoding="utf-8")
    store = MemoryCanonicalStore()
    with pytest.raises(ValidationError):
        run_sec_adv(
            fixture_dir=tmp_path,
            archive_root=tmp_path / "archive",
            store=store,
            publish=True,
            dry_run=False,
            report_path=tmp_path / "r.json",
        )
    assert store.firm_count() == 0


def test_failed_publish_rolls_back(tmp_path: Path) -> None:
    write_standard_fixtures(tmp_path)
    store = MemoryCanonicalStore()

    def boom(**kwargs):
        raise RuntimeError("forced publish failure")

    store.publish = boom  # type: ignore[method-assign]
    with pytest.raises(RuntimeError, match="forced publish failure"):
        run_sec_adv(
            fixture_dir=tmp_path,
            archive_root=tmp_path / "archive",
            store=store,
            publish=True,
            dry_run=False,
            report_path=tmp_path / "r.json",
        )
    assert store.firm_count() == 0


def test_dry_run_does_not_write_canonical(tmp_path: Path) -> None:
    write_standard_fixtures(tmp_path)
    store = MemoryCanonicalStore()
    report = run_sec_adv(
        fixture_dir=tmp_path,
        archive_root=tmp_path / "archive",
        store=store,
        publish=False,
        dry_run=True,
        report_path=tmp_path / "r.json",
    )
    assert report.dry_run is True
    assert store.firm_count() == 0
    assert report.records["unique_crds"] == 4
