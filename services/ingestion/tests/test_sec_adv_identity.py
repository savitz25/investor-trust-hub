from pathlib import Path

from ith_ingestion.sec_adv.fixtures import write_standard_fixtures
from ith_ingestion.sec_adv.normalize import normalize_rows
from ith_ingestion.sec_adv.parse import parse_csv
from ith_ingestion.sec_adv.pipeline import run_sec_adv
from ith_ingestion.sec_adv.store import MemoryCanonicalStore


def test_crd_match_updates_name_without_new_firm(tmp_path: Path) -> None:
    write_standard_fixtures(tmp_path)
    store = MemoryCanonicalStore()
    first = run_sec_adv(
        fixture_dir=tmp_path,
        archive_root=tmp_path / "archive",
        store=store,
        publish=True,
        dry_run=False,
        report_path=tmp_path / "r1.json",
    )
    assert first.publish["firms_inserted"] == 4
    # Same CRD, new legal name — must update, not insert.
    from ith_ingestion.sec_adv.fixtures import RIA_FIXTURE_ROWS, write_fixture_csv

    renamed = dict(RIA_FIXTURE_ROWS[0])
    renamed["Legal Name"] = "SYNTHETIC LEDGER ADVISERS RENAMED LLC"
    write_fixture_csv(tmp_path / "ria.csv", "ria", [renamed])
    write_fixture_csv(tmp_path / "era.csv", "era", [])
    # empty ERA file will fail parse; write one unchanged ERA
    from ith_ingestion.sec_adv.fixtures import ERA_FIXTURE_ROWS

    write_fixture_csv(tmp_path / "era.csv", "era", ERA_FIXTURE_ROWS[:1])
    store.published_keys.clear()
    second = run_sec_adv(
        fixture_dir=tmp_path,
        archive_root=tmp_path / "archive2",
        store=store,
        publish=True,
        dry_run=False,
        report_path=tmp_path / "r2.json",
    )
    assert store.firm_count() == 4
    assert store.firms["900000001"].legal_name == "SYNTHETIC LEDGER ADVISERS RENAMED LLC"
    assert second.publish["firms_inserted"] == 0


def test_no_fuzzy_name_merge(tmp_path: Path) -> None:
    write_standard_fixtures(tmp_path)
    store = MemoryCanonicalStore()
    run_sec_adv(
        fixture_dir=tmp_path,
        archive_root=tmp_path / "archive",
        store=store,
        publish=True,
        dry_run=False,
        report_path=tmp_path / "r.json",
    )
    assert "900000001" in store.firms
    assert store.firms["900000001"].crd != store.firms["900000002"].crd


def test_malformed_crd_is_quarantined(tmp_path: Path) -> None:
    write_standard_fixtures(tmp_path)
    _, rows = parse_csv(tmp_path / "ria.csv", "ria")
    normalized, quarantine = normalize_rows(rows)
    assert any(item.reason_code == "malformed_crd" for item in quarantine)
    assert all(firm.crd != "not-a-crd" for firm in normalized)
