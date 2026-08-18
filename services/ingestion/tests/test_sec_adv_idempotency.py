from pathlib import Path

from ith_ingestion.sec_adv.fixtures import (
    ERA_FIXTURE_ROWS,
    RIA_FIXTURE_ROWS,
    write_fixture_csv,
    write_standard_fixtures,
)
from ith_ingestion.sec_adv.pipeline import idempotency_key, run_sec_adv
from ith_ingestion.sec_adv.store import MemoryCanonicalStore


def test_exact_rerun_does_not_duplicate(tmp_path: Path) -> None:
    write_standard_fixtures(tmp_path)
    store = MemoryCanonicalStore()
    first = run_sec_adv(
        fixture_dir=tmp_path,
        archive_root=tmp_path / "archive",
        store=store,
        publish=True,
        dry_run=False,
        report_path=tmp_path / "first.json",
    )
    second = run_sec_adv(
        fixture_dir=tmp_path,
        archive_root=tmp_path / "archive",
        store=store,
        publish=True,
        dry_run=False,
        report_path=tmp_path / "second.json",
    )
    assert first.already_published is False
    assert second.already_published is True
    assert store.firm_count() == 4
    assert store.identifier_count() == store.identifier_count()
    assert len(store.snapshots) == 4
    assert idempotency_key("fixture-task-002") in store.published_keys


def test_newer_release_updates_address_and_preserves_identity(tmp_path: Path) -> None:
    write_standard_fixtures(tmp_path)
    store = MemoryCanonicalStore()
    run_sec_adv(
        fixture_dir=tmp_path,
        archive_root=tmp_path / "a1",
        store=store,
        publish=True,
        dry_run=False,
        report_path=tmp_path / "r1.json",
    )
    moved = dict(RIA_FIXTURE_ROWS[0])
    moved["Main Office City"] = "SEATTLE"
    moved["Main Office State"] = "WA"
    write_fixture_csv(tmp_path / "ria.csv", "ria", [moved])
    write_fixture_csv(tmp_path / "era.csv", "era", ERA_FIXTURE_ROWS[:1])
    store.published_keys.clear()
    run_sec_adv(
        fixture_dir=tmp_path,
        archive_root=tmp_path / "a2",
        store=store,
        publish=True,
        dry_run=False,
        report_path=tmp_path / "r2.json",
    )
    assert store.firm_count() == 4
    assert ("900000001", "sec-adv-main-office") in store.locations


def test_disappeared_firm_is_not_deleted_or_terminated(tmp_path: Path) -> None:
    write_standard_fixtures(tmp_path)
    store = MemoryCanonicalStore()
    run_sec_adv(
        fixture_dir=tmp_path,
        archive_root=tmp_path / "a1",
        store=store,
        publish=True,
        dry_run=False,
        report_path=tmp_path / "r1.json",
    )
    write_fixture_csv(tmp_path / "ria.csv", "ria", [RIA_FIXTURE_ROWS[0]])
    write_fixture_csv(tmp_path / "era.csv", "era", ERA_FIXTURE_ROWS[:1])
    store.published_keys.clear()
    report = run_sec_adv(
        fixture_dir=tmp_path,
        archive_root=tmp_path / "a2",
        store=store,
        publish=True,
        dry_run=False,
        report_path=tmp_path / "r2.json",
    )
    assert store.firm_count() == 4
    assert "900000002" in store.firms
    assert store.registrations[("900000002", "registered_investment_adviser")] != "terminated"
    assert report.publish["not_observed"] >= 1
