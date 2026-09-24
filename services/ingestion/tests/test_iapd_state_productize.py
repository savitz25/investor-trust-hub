"""Fail-closed cases for OR/AZ/WA IAPD state-IA productization. No database."""

import subprocess
import sys
from pathlib import Path

from ith_ingestion.iapd_state_ia.normalize import CLASSES, STATES, SourceRow, normalize_observations, proposed_source_dataset_id

REPO = Path(__file__).resolve().parents[3]
SCRIPT = REPO / "scripts" / "iapd_state_ia_productize.py"

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


def test_compilation_flag_is_required_and_has_no_machine_default():
    text = SCRIPT.read_text(encoding="utf-8")
    assert "C:\\Users" not in text
    assert "investor-trust-hub-or-inv-001" not in text
    missing = subprocess.run([sys.executable, str(SCRIPT), "--check"], capture_output=True, text=True)
    assert missing.returncode == 2
    assert "--compilation is required" in missing.stderr
    refused = subprocess.run([sys.executable, str(SCRIPT), "--apply"], capture_output=True, text=True)
    assert refused.returncode == 2
    assert "REFUSED" in refused.stderr


def test_proposed_dataset_ids_are_not_in_the_applied_registry():
    applied = []
    for folder in (REPO / "database" / "migrations", REPO / "database" / "seed"):
        for path in folder.glob("*.sql"):
            applied.append(path.read_text(encoding="utf-8"))
    applied_sql = "\n".join(applied)
    proposal = (REPO / "database" / "proposals" / "UNAPPLIED_iapd_state_jurisdiction_datasets.sql").read_text(encoding="utf-8")
    assert "DO NOT" in proposal or "UNAPPLIED" in proposal
    assert "ON CONFLICT (id) DO UPDATE" in proposal
    assert proposal.count("('iapd_") == 9
    for state in STATES:
        for reg_class in CLASSES:
            dataset_id = proposed_source_dataset_id(state, reg_class)
            assert dataset_id not in applied_sql
            assert dataset_id in proposal
    assert "('sec_ia_ria'" not in proposal
    assert "('sec_ia_era'" not in proposal
    assert "('sec_ia_iapd_compilation'" not in proposal
    assert "'iapd'" in proposal


def test_firm_match_not_evaluated_when_no_extract():
    ledger = normalize_observations([row()], existing_firm_crds=None)
    assert ledger.observations[0].match_status == "FIRM_MATCH_NOT_EVALUATED"
    assert ledger.by_state["OR"]["exact_existing_firm_matches"] is None
    assert ledger.by_state["OR"]["unmatched"] is None
