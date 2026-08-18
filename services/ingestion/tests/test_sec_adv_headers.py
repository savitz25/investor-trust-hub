from pathlib import Path

import pytest

from ith_ingestion.errors import ValidationError
from ith_ingestion.sec_adv.fixtures import write_standard_fixtures
from ith_ingestion.sec_adv.headers import official_headers, required_headers, validate_headers
from ith_ingestion.sec_adv.parse import parse_csv


def test_official_header_snapshots_are_complete() -> None:
    assert len(official_headers("ria")) == 448
    assert len(official_headers("era")) == 171
    for header in required_headers("ria"):
        assert header in official_headers("ria")
    for header in required_headers("era"):
        assert header in official_headers("era")


def test_missing_required_header_fails() -> None:
    issues = validate_headers("ria", ["Primary Business Name"])
    assert any("Organization CRD#" in issue for issue in issues)


def test_fixture_csv_parses_official_structure(tmp_path: Path) -> None:
    write_standard_fixtures(tmp_path)
    headers, rows = parse_csv(tmp_path / "ria.csv", "ria")
    assert headers == list(official_headers("ria"))
    assert len(rows) == 3


def test_empty_file_fails(tmp_path: Path) -> None:
    empty = tmp_path / "empty.csv"
    empty.write_text("", encoding="utf-8")
    with pytest.raises(ValidationError, match="empty"):
        parse_csv(empty, "ria")
