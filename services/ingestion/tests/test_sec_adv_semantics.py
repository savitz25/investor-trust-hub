from ith_ingestion.sec_adv.models import ParsedRow
from ith_ingestion.sec_adv.normalize import normalize_row


def _row(kind: str, values: dict[str, str], number: int = 2) -> ParsedRow:
    return ParsedRow(dataset_kind=kind, row_number=number, values=values)  # type: ignore[arg-type]


def test_ria_is_not_labeled_sec_approved() -> None:
    result = normalize_row(
        _row(
            "ria",
            {
                "Organization CRD#": "110882",
                "SEC#": "801-60597",
                "Firm Type": "Registered",
                "Legal Name": "Example RIA LLC",
                "Primary Business Name": "Example RIA",
                "SEC Current Status": "Approved",
            },
        )
    )
    assert result.registration_type == "registered_investment_adviser"
    assert result.registration_status == "registered"
    assert result.sec_current_status_text == "Approved"
    assert "approved" not in result.registration_status


def test_era_is_never_sec_registered() -> None:
    result = normalize_row(
        _row(
            "era",
            {
                "Organization CRD#": "342972",
                "SEC#": "802-136595",
                "Firm Type": "ERA",
                "Legal Name": "Example ERA LP",
                "Primary Business Name": "Example ERA",
                "SEC Current Status": "ERA - Active",
            },
        )
    )
    assert result.registration_type == "exempt_reporting_adviser"
    assert result.registration_status == "reporting"
    assert result.registration_type != "registered_investment_adviser"
    assert result.registration_status != "registered"


def test_pending_120_day_is_not_good_standing() -> None:
    result = normalize_row(
        _row(
            "ria",
            {
                "Organization CRD#": "2002",
                "SEC#": "801-2002",
                "Firm Type": "Registered",
                "Legal Name": "Pending Firm",
                "Primary Business Name": "Pending Firm",
                "SEC Current Status": "120-Day Approval",
            },
        )
    )
    assert result.registration_status == "pending"
