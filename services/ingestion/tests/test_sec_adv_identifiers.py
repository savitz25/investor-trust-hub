from ith_ingestion.sec_adv.identifiers import (
    firm_slug_for_crd,
    is_valid_crd,
    is_valid_sec_file_number,
    normalize_crd,
    normalize_sec_file_number,
)


def test_crd_whitespace_and_validity() -> None:
    assert normalize_crd("  110882  ") == "110882"
    assert is_valid_crd("110882")
    assert is_valid_crd(" 900000001 ")
    assert not is_valid_crd(None)
    assert not is_valid_crd("")
    assert not is_valid_crd("   ")
    assert not is_valid_crd("not-a-crd")
    assert not is_valid_crd("12 34 abc")


def test_sec_file_number_ria_and_era() -> None:
    assert normalize_sec_file_number(" 801-60597 ") == "801-60597"
    assert is_valid_sec_file_number("801-60597")
    assert is_valid_sec_file_number("802-136595")
    assert not is_valid_sec_file_number("not-a-file")
    assert not is_valid_sec_file_number(None)
    assert not is_valid_sec_file_number("")


def test_slug_is_crd_not_name() -> None:
    assert firm_slug_for_crd("110882") == "sec-crd-110882"
