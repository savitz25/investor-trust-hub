from ith_ingestion.errors import ValidationError
from ith_ingestion.memory import RequiredFieldValidator
from ith_ingestion.registry import get_registered_source
from ith_ingestion.types import ParsedRecord


def test_validator_rejects_empty_batch() -> None:
    validator = RequiredFieldValidator()
    try:
        validator.validate([ParsedRecord(source_record_identifier="", payload={})])
        raise AssertionError("expected ValidationError")
    except ValidationError as exc:
        assert exc.issues


def test_brokercheck_is_marked_non_prospecting() -> None:
    source = get_registered_source("brokercheck", "brokercheck_individuals")
    assert source is not None
    assert source.prospecting_prohibited is True
