"""MN-INV-001 — Minnesota partition of the accepted IAPD compilation.

No new ingestion pipeline: this reuses the OH-INV-001 parsers (scripts/ohio/census_iapd_oh.py).

  IA_FIRM_STATE  the byte-identical accepted 2026-09-17 feed (SHA-256 verified).
  IA_FIRM_SEC    the accepted 2026-09-17 SEC feed is no longer published by IAPD (S3 AccessDenied on 2026-09-25;
                 09-18 is the oldest SEC feed still served). The 2026-09-18 SEC feed is used for the notice and
                 principal-office lenses on its own clock. State and SEC lenses are never summed; the two
                 cross-feed overlaps are labelled as cross-clock diagnostics.

Lenses stay separate and are never summed:
  state IA        StateRgstn/Rgltr/@Cd=MN          (registration jurisdiction; status preserved)
  state ERA       ERA/Rgltr/@Cd=MN
  notice filing   NoticeFiled/States/@RgltrCd=MN    (SEC-registered or ERA firms; not state registration)
  principal office MainAddr/@State=MN               (geographic overlay; not registration)
Only aggregate counts and firm CRD numbers are written. Firm names are not written.
"""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "data" / "minnesota" / "mn-inv-001"
FORM_ADV = ROOT / "data" / "raw" / "sec" / "form-adv"

spec = importlib.util.spec_from_file_location("census_iapd_oh", ROOT / "scripts" / "ohio" / "census_iapd_oh.py")
oh = importlib.util.module_from_spec(spec)
spec.loader.exec_module(oh)
oh.CD = "MN"  # the Ohio parsers read the module-level jurisdiction code at call time

STATE_PATH = FORM_ADV / "iapd-compilation-2026-09-17" / oh.STATE_FEED
STATE_SHA = "5fa17c38ae2e812dbd4d58c359c4d624a54417e3f794a3287c3414ccfdaa6a02"
SEC_NAME = "IA_FIRM_SEC_Feed_09_18_2026.xml.gz"
SEC_PATH = FORM_ADV / "iapd-compilation-2026-09-18" / SEC_NAME
SEC_SHA = "de4c1d4c8f2fd2e301413e955b13ccc3aa9b01be7a43f23d7937c126af132f34"
SEC_META = {
    "filename": SEC_NAME,
    "url": f"https://reports.adviserinfo.sec.gov/reports/CompilationReports/{SEC_NAME}",
    "sourceAsOf": "2026-09-18",
    "publishedAt": "2026-09-18",
    "lastModified": "2026-09-18T09:28:00Z",
    "retrievedAt": "2026-09-25T18:53:55Z",
    "acceptedFeedUnavailable": {
        "filename": oh.SEC_FEED,
        "sha256": "f01d6b17a7ed631125e76d3c1e5965f178235273eea6699c15400473cb2f1f22",
        "result": "HTTP 403 AccessDenied on 2026-09-25; not retrievable from IAPD. Oldest SEC feed still served: 2026-09-18.",
    },
}


def main() -> None:
    for path, sha in ((STATE_PATH, STATE_SHA), (SEC_PATH, SEC_SHA)):
        if not path.is_file():
            raise SystemExit(f"missing {path}")
        got = oh.sha256_file(path)
        if got != sha:
            raise SystemExit(f"{path.name} is not the expected feed ({got})")
    state = oh.parse_state(STATE_PATH)
    sec = {**oh.parse_sec(SEC_PATH), **SEC_META}
    state["filter"] = "Rgltr/@Cd=MN (registration jurisdiction). Address is recorded only for overlap diagnostics."

    ia, ia_approved, ia_current = set(state["_ia_crds"]), set(state["_ia_approved"]), set(state["_ia_current"])
    era, era_active = set(state["_era_crds"]), set(state["_era_active"])
    principal, filed, notice_all = set(sec["_principal"]), set(sec["_filed_set"]), set(sec["_notice_all"])

    def rename(d: dict) -> dict:
        return {k.replace("co_", "mn_", 1) if k.startswith("co_") else k.replace("_co_", "_mn_"): v
                for k, v in d.items() if not str(k).startswith("_")}

    census = {
        "contract": "investor-mn-iapd-census-v1",
        "ticket": "MN-INV-001",
        "reuse": "OH-INV-001 parsers. IA_FIRM_STATE: the byte-identical accepted 2026-09-17 feed (SHA-256 verified). "
                 "IA_FIRM_SEC: the accepted 2026-09-17 feed is no longer served by IAPD, so the 2026-09-18 feed "
                 "(SHA-256 recorded) carries the notice and principal-office lenses on its own clock.",
        "filterLogic": "Minnesota selected by IAPD registration/notice jurisdiction fields (StateRgstn/Rgltr/@Cd, ERA/Rgltr/@Cd, NoticeFiled/States/@RgltrCd). Principal-office MainAddr/@State=MN is a separate overlay and is not a registration denominator.",
        "clocks": {"state_ia_and_era": "2026-09-17", "notice_and_principal_office": "2026-09-18", "unified": None},
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
            "state_address_without_mn_jurisdiction": state["address_co_without_co_jurisdiction"],
        },
        "overlaps": {
            "state_ia_and_state_era": len(ia & era),
            "notice_filed_and_principal_office": len(filed & principal),
            "principal_office_not_notice_filed": len(principal - filed),
        },
        "crossClockDiagnostics": {
            "note": "State feed 2026-09-17 x SEC feed 2026-09-18. Diagnostics only; never published as a count.",
            "state_ia_approved_and_notice_filed": len(ia_approved & filed),
            "state_ia_and_principal_office_sec_feed": len(ia & principal),
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
    (OUT_DIR / "iapd-mn-census.json").write_text(json.dumps(census, indent=2) + "\n", encoding="utf-8", newline="\n")
    (OUT_DIR / "iapd-mn-firm-crds.json").write_text(json.dumps({
        "source": "accepted IAPD STATE compilation 2026-09-17; IAPD SEC compilation 2026-09-18",
        "state_ia_approved": sorted(ia_approved),
        "state_ia_current": sorted(ia_current),
        "state_era_active": sorted(era_active),
        "notice_filed": sorted(filed),
        "principal_office_sec_feed": sorted(principal),
    }, indent=1) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({**census["lenses"], **census["overlaps"], **census["crossClockDiagnostics"]}, indent=1))


if __name__ == "__main__":
    main()
