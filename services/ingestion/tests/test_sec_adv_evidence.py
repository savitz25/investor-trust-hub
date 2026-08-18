from pathlib import Path

from ith_ingestion.sec_adv.fixtures import write_standard_fixtures
from ith_ingestion.sec_adv.pipeline import run_sec_adv
from ith_ingestion.sec_adv.store import MemoryCanonicalStore


def test_provenance_and_raw_snapshot_are_preserved(tmp_path: Path) -> None:
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
    assert any(item[1] == "crd" for item in store.evidence)
    assert any(item[1] == "legal_name" for item in store.evidence)
    assert any(item[1] == "main_office" for item in store.evidence)
    assert ("900000001", "fixture-task-002") in store.snapshots
    assert ("crd", "900000001") in store.identifiers
    assert ("sec_file_number", "801-9000001") in store.identifiers
