"""Fail-closed cases for OR/AZ/WA IAPD state-IA productization. No database."""

from ith_ingestion.iapd_state_ia.normalize import SourceRow, normalize_observations

META = {
    "source_dataset_id": "iapd_state_ia_or_2026_09_10",
    "source_as_of": "2026-09-10",
    "retrieved_at": "2026-09-16T18:30:00Z",
}


def row(**overrides) -> SourceRow:
    base = dict(
        jurisdiction="OR",
        registration_class="state_ia",
        crd="159378",
        sec_file_number="801-132129",
        legal_name="Example Advisory LLC",
        business_name="",
        status="APPROVED",
        status_date="2022-09-06",
        **META,
    )
    base.update(overrides)
    return SourceRow(**base)


def test_exact_crd_match_stays_internal():
    ledger = normalize_observations([row()], existing_firm_crds={"159378"})
    obs = ledger.observations[0]
    assert obs.match_status == "EXACT_CRD"
    assert obs.public_eligibility == "internal_only"
    assert obs.disposition == "READY_INTERNAL"
    assert ledger.by_state["OR"]["exact_existing_firm_matches"] == 1


def test_missing_crd_is_excluded():
    ledger = normalize_observations([row(crd="")], existing_firm_crds=set())
    assert ledger.observations == []
    assert ledger.excluded[0]["reason"] == "missing_crd"
    assert ledger.by_state["OR"]["ready_for_productization"] == 0


def test_same_crd_conflicting_name_is_review():
    ledger = normalize_observations(
        [row(legal_name="Alpha LLC"), row(legal_name="Beta LLC", status_date="2024-01-01")],
        existing_firm_crds={"159378"},
    )
    assert all(obs.disposition == "REVIEW_REQUIRED" for obs in ledger.observations)
    assert ledger.by_state["OR"]["collisions"] == 1


def test_duplicate_same_state_row_collapses():
    ledger = normalize_observations([row(), row()], existing_firm_crds=set())
    assert len(ledger.observations) == 1
    assert ledger.by_state["OR"]["duplicates_collapsed"] >= 1


def test_same_firm_in_two_states_stays_separate():
    ledger = normalize_observations(
        [row(), row(jurisdiction="AZ", source_dataset_id="iapd_state_ia_az_2026_09_10")],
        existing_firm_crds=set(),
    )
    assert {obs.jurisdiction for obs in ledger.observations} == {"OR", "AZ"}
    assert ledger.by_state["OR"]["ready_for_productization"] == 1
    assert ledger.by_state["AZ"]["ready_for_productization"] == 1


def test_different_classes_are_not_summed_into_one_grain():
    ledger = normalize_observations(
        [
            row(),
            row(registration_class="notice_filing", status="FILED", source_dataset_id="iapd_notice_filing_or_2026_09_10"),
            row(registration_class="state_era", status="ACTIVE", source_dataset_id="iapd_state_era_or_2026_09_10"),
        ],
        existing_firm_crds=set(),
    )
    classes = {obs.registration_class for obs in ledger.observations}
    assert classes == {"state_ia", "state_era", "notice_filing"}
    assert ledger.by_state["OR"]["classes"]["state_ia"]["unique_crd"] == 1
    assert ledger.by_state["OR"]["classes"]["notice_filing"]["unique_crd"] == 1
    assert ledger.cross_state["label"].startswith("convenience sum")


def test_unknown_status_excluded():
    ledger = normalize_observations([row(status="MYSTERY")], existing_firm_crds=set())
    assert ledger.observations == []
    assert ledger.excluded[0]["reason"] == "unknown_status"


def test_malformed_jurisdiction_excluded():
    ledger = normalize_observations([row(jurisdiction="Oregon")], existing_firm_crds=set())
    assert ledger.observations == []
    assert ledger.excluded[0]["reason"] == "malformed_jurisdiction"


def test_unmatched_crd_does_not_create_a_firm():
    ledger = normalize_observations([row()], existing_firm_crds=set())
    assert ledger.observations[0].match_status == "UNMATCHED_NO_FIRM"
    assert ledger.by_state["OR"]["unmatched"] == 1
    assert ledger.by_state["OR"]["exact_existing_firm_matches"] == 0


def test_second_run_is_a_no_op():
    first = normalize_observations([row(), row(jurisdiction="WA", status="APPROVED")], existing_firm_crds={"159378"})
    second = normalize_observations([row(), row(jurisdiction="WA", status="APPROVED")], existing_firm_crds={"159378"})
    assert [obs.fingerprint for obs in first.observations] == [obs.fingerprint for obs in second.observations]
    assert first.by_state == second.by_state


def test_firm_match_not_evaluated_when_no_extract():
    ledger = normalize_observations([row()], existing_firm_crds=None)
    assert ledger.observations[0].match_status == "FIRM_MATCH_NOT_EVALUATED"
    assert ledger.by_state["OR"]["exact_existing_firm_matches"] is None
    assert ledger.by_state["OR"]["unmatched"] is None
