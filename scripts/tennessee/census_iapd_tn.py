"""TN-INV-001 — Tennessee partition of the accepted IAPD compilation (2026-09-17).

No new ingestion pipeline: this reuses the OH-INV-001 parsers (scripts/ohio/census_iapd_oh.py)
on the byte-identical IA_FIRM_STATE / IA_FIRM_SEC feeds, filtered to registration jurisdiction TN.

Lenses stay separate and are never summed:
  state IA        StateRgstn/Rgltr/@Cd=TN          (registration jurisdiction; status preserved)
  state ERA       ERA/Rgltr/@Cd=TN
  notice filing   NoticeFiled/States/@RgltrCd=TN    (SEC-registered or ERA firms; not state registration)
  principal office MainAddr/@State=TN               (geographic overlay; not registration)
Only aggregate counts and firm CRD numbers are written. Firm names are not written.
"""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "data" / "tennessee" / "tn-inv-001"

spec = importlib.util.spec_from_file_location("census_iapd_oh", ROOT / "scripts" / "ohio" / "census_iapd_oh.py")
oh = importlib.util.module_from_spec(spec)
spec.loader.exec_module(oh)
oh.CD = "TN"  # the Ohio parsers read the module-level jurisdiction code at call time
oh.COMP_CANDIDATES.insert(0, ROOT / "data" / "raw" / "sec" / "form-adv" / "iapd-compilation-2026-09-17")
ACCEPTED = {
    oh.STATE_FEED: "5fa17c38ae2e812dbd4d58c359c4d624a54417e3f794a3287c3414ccfdaa6a02",
    oh.SEC_FEED: "f01d6b17a7ed631125e76d3c1e5965f178235273eea6699c15400473cb2f1f22",
}


def main() -> None:
    comp = oh.find_comp()
    for name, sha in ACCEPTED.items():
        got = oh.sha256_file(comp / name)
        if got != sha:
            raise SystemExit(f"{name} is not the accepted OH-INV-001 feed ({got})")
    state = oh.parse_state(comp / oh.STATE_FEED)
    sec = oh.parse_sec(comp / oh.SEC_FEED)

    ia, ia_approved, ia_current = set(state["_ia_crds"]), set(state["_ia_approved"]), set(state["_ia_current"])
    era, era_active = set(state["_era_crds"]), set(state["_era_active"])
    principal, filed, notice_all = set(sec["_principal"]), set(sec["_filed_set"]), set(sec["_notice_all"])

    def rename(d: dict) -> dict:
        return {k.replace("co_", "tn_", 1) if k.startswith("co_") else k.replace("_co_", "_tn_"): v
                for k, v in d.items() if not str(k).startswith("_")}

    census = {
        "contract": "investor-tn-iapd-census-v1",
        "ticket": "TN-INV-001",
        "reuse": "OH-INV-001 parsers on the byte-identical accepted 2026-09-17 IAPD compilation (SHA-256 verified).",
        "filterLogic": "Tennessee selected by IAPD registration/notice jurisdiction fields (StateRgstn/Rgltr/@Cd, ERA/Rgltr/@Cd, NoticeFiled/States/@RgltrCd). Principal-office MainAddr/@State=TN is a separate overlay and is not a registration denominator.",
        "state": rename(state),
        "sec": rename(sec),
        "lenses": {
            "state_ia_registration_rows": state["co_state_ia_registration_rows"],
            "state_ia_distinct_crd": len(ia),
            "state_ia_approved_distinct_crd": len(ia_approved),
            "state_ia_current_distinct_crd": len(ia_current),
            "state_ia_termrequest_distinct_crd": state["co_state_ia_termrequest_distinct_crd"],
            "state_ia_status_rows": state["status_ia"],
            "state_era_registration_rows": state["co_state_era_registration_rows"],
            "state_era_distinct_crd": len(era),
            "state_era_active_distinct_crd": len(era_active),
            "state_era_status_rows": state["status_era"],
            "notice_rows": sec["co_notice_rows"],
            "notice_any_status_distinct_crd": len(notice_all),
            "notice_filed_distinct_crd": len(filed),
            "notice_status_rows": sec["notice_status"],
            "notice_filed_firm_type": sec["co_notice_filed_firm_type"],
            "principal_office_sec_feed_distinct_crd": len(principal),
            "principal_office_among_state_ia": state["principal_office_co_among_state_ia"],
            "state_address_without_tn_jurisdiction": state["address_co_without_co_jurisdiction"],
        },
        "overlaps": {
            "state_ia_and_state_era": len(ia & era),
            "state_ia_approved_and_notice_filed": len(ia_approved & filed),
            "state_ia_and_principal_office_sec_feed": len(ia & principal),
            "notice_filed_and_principal_office": len(filed & principal),
            "principal_office_not_notice_filed": len(principal - filed),
            "state_era_and_notice_filed": len(era & filed),
        },
        "semanticGrainRules": {
            "STATE_RIA_IS_DISTINCT_CREDENTIAL_FROM_SEC_RIA": True,
            "STATE_RIA_IS_DISTINCT_CREDENTIAL_FROM_NOTICE_FILING": True,
            "STATE_RIA_IS_DISTINCT_CREDENTIAL_FROM_STATE_ERA": True,
            "PRINCIPAL_OFFICE_IS_NOT_REGISTRATION": True,
            "REGISTRATION_ROW_IS_DISTINCT_GRAIN_FROM_DISTINCT_FIRM_CRD": True,
            "LENSES_ARE_NEVER_SUMMED": True,
        },
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "iapd-tn-census.json").write_text(json.dumps(census, indent=2) + "\n", encoding="utf-8", newline="\n")
    (OUT_DIR / "iapd-tn-firm-crds.json").write_text(json.dumps({
        "source": "accepted IAPD compilation 2026-09-17",
        "state_ia_approved": sorted(ia_approved),
        "state_ia_current": sorted(ia_current),
        "state_era_active": sorted(era_active),
        "notice_filed": sorted(filed),
        "principal_office_sec_feed": sorted(principal),
    }, indent=1) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({**census["lenses"], **census["overlaps"]}, indent=1))


if __name__ == "__main__":
    main()
