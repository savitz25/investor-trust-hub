"""IL-INV-001 — IAPD STATE/SEC census for Illinois.

Filter Illinois by registration/notice jurisdiction fields, never by address.
Does not scrape IAPD search. Reads the official compilation already acquired
for INV-NAT (checksum must match docs/inv-home-001-census.json).
"""
from __future__ import annotations

import gzip
import hashlib
import json
import sys
from collections import Counter
from pathlib import Path
from xml.etree.ElementTree import iterparse

ROOT = Path(__file__).resolve().parents[2]
COMP_CANDIDATES = [
    ROOT / "data" / "raw" / "sec" / "form-adv" / "iapd-compilation-2026-08-27",
    Path(r"C:\Users\Michael.Savitsky\investor-trust-hub\data\raw\sec\form-adv\iapd-compilation-2026-08-27"),
]
EXPECTED_STATE_SHA256 = "4dc5ec13827c2546213fba16d3397448ba5c08cb8c092f1135c405a7f8472eda"
EXPECTED_SEC_SHA256 = "967217b0cdb4548f496407f7232eff30deba12217c36447fad0cee757473b65c"
OUT = ROOT / "data" / "illinois" / "il-inv-001" / "iapd-il-census.json"
CD = "IL"


def local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def digits(value: object) -> str:
    return "".join(ch for ch in str(value or "") if ch.isdigit())


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def find_comp() -> Path:
    for path in COMP_CANDIDATES:
        if (path / "IA_FIRM_STATE_Feed_08_27_2026.xml.gz").is_file() and (
            path / "IA_FIRM_SEC_Feed_08_27_2026.xml.gz"
        ).is_file():
            return path
    raise SystemExit("IA_FIRM_STATE / IA_FIRM_SEC compilation not found")


def parse_state(path: Path) -> dict:
    state_ia: dict[str, dict] = {}
    state_era: dict[str, dict] = {}
    status_ia = Counter()
    status_era = Counter()
    ia_rows = 0
    era_rows = 0
    firms = 0
    address_without_jurisdiction = 0
    with gzip.open(path, "rb") as fh:
        for _, elem in iterparse(fh, events=("end",)):
            if local(elem.tag) != "Firm":
                continue
            firms += 1
            info = main = None
            ny_ia = []
            ny_era = []
            for child in list(elem):
                t = local(child.tag)
                if t == "Info":
                    info = child
                elif t == "MainAddr":
                    main = child
                elif t == "StateRgstn":
                    for wrap in list(child):
                        if local(wrap.tag) != "Rgltrs":
                            continue
                        for rg in list(wrap):
                            if local(rg.tag) != "Rgltr":
                                continue
                            if (rg.attrib.get("Cd") or "").upper() != CD:
                                continue
                            row = {"status": (rg.attrib.get("St") or "").upper(), "dt": rg.attrib.get("Dt")}
                            ny_ia.append(row)
                            status_ia[row["status"]] += 1
                            ia_rows += 1
                elif t == "ERA":
                    for wrap in list(child):
                        if local(wrap.tag) != "Rgltrs":
                            continue
                        for rg in list(wrap):
                            if local(rg.tag) != "Rgltr":
                                continue
                            if (rg.attrib.get("Cd") or "").upper() != CD:
                                continue
                            row = {"status": (rg.attrib.get("St") or "").upper(), "dt": rg.attrib.get("Dt")}
                            ny_era.append(row)
                            status_era[row["status"]] += 1
                            era_rows += 1
            crd = digits(info.attrib.get("FirmCrdNb") if info is not None else "")
            main_st = ((main.attrib.get("State") if main is not None else "") or "").upper()
            rec = {
                "crd": crd,
                "bus": (info.attrib.get("BusNm") if info is not None else None) or "",
                "legal": (info.attrib.get("LegalNm") if info is not None else None) or "",
                "main_state": main_st,
            }
            if crd and ny_ia:
                state_ia[crd] = {**rec, "regs": ny_ia, "jurisdiction": CD}
            if crd and ny_era:
                state_era[crd] = {**rec, "regs": ny_era, "jurisdiction": CD}
            if crd and main_st == CD and not ny_ia and not ny_era:
                address_without_jurisdiction += 1
            elem.clear()
    approved = {c for c, r in state_ia.items() if any(x["status"] == "APPROVED" for x in r["regs"])}
    termreq = {c for c, r in state_ia.items() if any(x["status"] == "TERMREQUEST" for x in r["regs"])}
    era_active = {c for c, r in state_era.items() if any(x["status"] == "ACTIVE" for x in r["regs"])}
    current_ia = {
        c
        for c, rec in state_ia.items()
        if any((r.get("status") or "") in {"APPROVED", "CONDREST", "LIMITED", "ACTIVE"} for r in rec["regs"])
    }
    return {
        "filename": path.name,
        "authority": "IAPD (FINRA-held state compilation)",
        "url": "https://reports.adviserinfo.sec.gov/reports/CompilationReports/IA_FIRM_STATE_Feed_08_27_2026.xml.gz",
        "sourceAsOf": "2026-08-27",
        "publishedAt": "2026-08-27",
        "retrievedAt": "2026-08-28T16:36:30Z",
        "bytes": path.stat().st_size,
        "sha256": sha256_file(path),
        "grain": "Firm CRD; StateRgstn/Rgltr/@Cd=jurisdiction; @St=status; ERA/Rgltr/@Cd=jurisdiction. Not MainAddr/@State.",
        "filter": "Rgltr/@Cd=IL (registration jurisdiction). Address is recorded only for overlap diagnostics.",
        "firms_in_feed": firms,
        "co_state_ia_registration_rows": ia_rows,
        "co_state_ia_distinct_crd": len(state_ia),
        "co_state_ia_approved_distinct_crd": len(approved),
        "co_state_ia_current_distinct_crd": len(current_ia),
        "co_state_ia_termrequest_distinct_crd": len(termreq),
        "co_state_era_registration_rows": era_rows,
        "co_state_era_distinct_crd": len(state_era),
        "co_state_era_active_distinct_crd": len(era_active),
        "ia_era_overlap_distinct_crd": len(set(state_ia) & set(state_era)),
        "status_ia": status_ia.most_common(),
        "status_era": status_era.most_common(),
        "principal_office_co_among_state_ia": sum(1 for r in state_ia.values() if r["main_state"] == CD),
        "principal_office_not_co_among_state_ia": sum(1 for r in state_ia.values() if r["main_state"] != CD),
        "address_co_without_co_jurisdiction": address_without_jurisdiction,
        "_ia_crds": sorted(state_ia),
        "_ia_approved": sorted(approved),
        "_ia_current": sorted(current_ia),
        "_era_crds": sorted(state_era),
        "_era_active": sorted(era_active),
        "_ia_recs": state_ia,
    }


def parse_sec(path: Path) -> dict:
    notice: dict[str, dict] = {}
    principal: dict[str, dict] = {}
    firm_types = Counter()
    notice_status = Counter()
    notice_rows = 0
    firms = 0
    notice_era = 0
    with gzip.open(path, "rb") as fh:
        for _, elem in iterparse(fh, events=("end",)):
            if local(elem.tag) != "Firm":
                continue
            firms += 1
            info = main = rgstn = None
            ny_notice = None
            for child in list(elem):
                t = local(child.tag)
                if t == "Info":
                    info = child
                elif t == "MainAddr":
                    main = child
                elif t == "Rgstn":
                    rgstn = child
                elif t == "NoticeFiled":
                    for st in list(child):
                        if local(st.tag) != "States":
                            continue
                        if (st.attrib.get("RgltrCd") or "").upper() != CD:
                            continue
                        ny_notice = {
                            "status": (st.attrib.get("St") or "").upper(),
                            "dt": st.attrib.get("Dt"),
                        }
                        notice_status[ny_notice["status"]] += 1
                        notice_rows += 1
            crd = digits(info.attrib.get("FirmCrdNb") if info is not None else "")
            firm_type = (rgstn.attrib.get("FirmType") if rgstn is not None else "") or ""
            firm_types[firm_type] += 1
            main_st = ((main.attrib.get("State") if main is not None else "") or "").upper()
            rec = {
                "crd": crd,
                "firm_type": firm_type,
                "main_state": main_st,
                "bus": (info.attrib.get("BusNm") if info is not None else None) or "",
                "legal": (info.attrib.get("LegalNm") if info is not None else None) or "",
                "sec": info.attrib.get("SECNb") if info is not None else None,
                "rgstn": dict(rgstn.attrib) if rgstn is not None else {},
            }
            if crd and main_st == CD:
                principal[crd] = rec
            if crd and ny_notice:
                if firm_type.upper() == "ERA":
                    notice_era += 1
                notice[crd] = {**rec, **ny_notice}
            elem.clear()
    filed = {c: r for c, r in notice.items() if r.get("status") == "FILED"}
    filed_types = Counter((r.get("firm_type") or "").strip() or "(blank)" for r in filed.values())
    return {
        "filename": path.name,
        "authority": "SEC / IAPD",
        "url": "https://reports.adviserinfo.sec.gov/reports/CompilationReports/IA_FIRM_SEC_Feed_08_27_2026.xml.gz",
        "sourceAsOf": "2026-08-27",
        "publishedAt": "2026-08-27",
        "retrievedAt": "2026-08-28T16:36:30Z",
        "bytes": path.stat().st_size,
        "sha256": sha256_file(path),
        "grain": "Firm CRD; NoticeFiled/States/@RgltrCd=jurisdiction; MainAddr/@State=principal office (separate overlay).",
        "firms_in_feed": firms,
        "firm_types": firm_types.most_common(),
        "co_notice_rows": notice_rows,
        "co_notice_any_status_distinct_crd": len(notice),
        "co_notice_filed_distinct_crd": len(filed),
        "co_notice_era_any_status": notice_era,
        "co_notice_filed_firm_type": {
            "Registered": filed_types.get("Registered", 0),
            "ERA": filed_types.get("ERA", 0),
            "other": sum(n for k, n in filed_types.items() if k not in {"Registered", "ERA", "(blank)"}),
            "blank": filed_types.get("(blank)", 0),
            "raw": filed_types.most_common(),
        },
        "notice_status": notice_status.most_common(),
        "co_principal_office_distinct_crd": len(principal),
        "principal_and_notice_filed": len(set(filed) & set(principal)),
        "notice_filed_not_principal": len(set(filed) - set(principal)),
        "principal_not_notice_filed": len(set(principal) - set(filed)),
        "_notice_filed": sorted(filed),
        "_notice_all": sorted(notice),
        "_principal": sorted(principal),
        "_principal_set": set(principal),
        "_filed_set": set(filed),
        "_filed_recs": filed,
        "_all_sec": set(principal) | set(notice),
    }


def main() -> None:
    comp = find_comp()
    state_path = comp / "IA_FIRM_STATE_Feed_08_27_2026.xml.gz"
    sec_path = comp / "IA_FIRM_SEC_Feed_08_27_2026.xml.gz"
    print("STATE", state_path, flush=True)
    state = parse_state(state_path)
    if state["sha256"] != EXPECTED_STATE_SHA256:
        raise SystemExit(f"STATE checksum mismatch {state['sha256']}")
    print("SEC", sec_path, flush=True)
    sec = parse_sec(sec_path)
    if sec["sha256"] != EXPECTED_SEC_SHA256:
        raise SystemExit(f"SEC checksum mismatch {sec['sha256']}")

    ia = set(state["_ia_crds"])
    ia_approved = set(state["_ia_approved"])
    era = set(state["_era_crds"])
    principal = set(sec["_principal"])
    notice_filed = set(sec["_filed_set"])
    notice_all = set(sec["_notice_all"])

    overlap_approved_notice_crds = sorted(ia_approved & notice_filed)
    ia_recs = state["_ia_recs"]
    filed_recs = sec["_filed_recs"]
    overlap_records = []
    for crd in overlap_approved_notice_crds:
        state_rec = ia_recs[crd]
        sec_rec = filed_recs[crd]
        ny_regs = list(state_rec["regs"])
        overlap_records.append(
            {
                "crd": crd,
                "joinMethod": "exact firm CRD set intersection",
                "stateCompilation": {
                    "jurisdiction": CD,
                    "filter": "StateRgstn/Rgltr/@Cd=IL",
                    "statuses": [r["status"] for r in ny_regs],
                    "dates": [r.get("dt") for r in ny_regs],
                },
                "secCompilation": {
                    "filter": "NoticeFiled/States/@RgltrCd=IL",
                    "firmType": sec_rec.get("firm_type") or None,
                    "noticeStatus": sec_rec.get("status"),
                    "noticeDate": sec_rec.get("dt"),
                    "rgstn": sec_rec.get("rgstn") or {},
                    "secFileNumber": sec_rec.get("sec"),
                },
                "reading": "Both official 2026-08-27 compilations carry this exact firm CRD: APPROVED Illinois StateRgstn and FILED Illinois NoticeFiled. Credential classes remain separate. Populations are not required to be disjoint.",
            }
        )

    overlaps = {
        "state_ia_and_principal_office": len(ia & principal),
        "state_ia_approved_and_principal_office": len(ia_approved & principal),
        "state_ia_and_notice_filed": len(ia & notice_filed),
        "state_ia_approved_and_notice_filed": len(ia_approved & notice_filed),
        "state_era_and_principal_office": len(era & principal),
        "state_era_and_notice_filed": len(era & notice_filed),
        "state_ia_and_state_era": len(ia & era),
        "notice_filed_and_principal_office": len(notice_filed & principal),
        "approved_state_ia_not_in_sec_principal_or_notice": len(ia_approved - principal - notice_all),
        "state_ia_approved_and_notice_filed_crds": overlap_approved_notice_crds,
        "state_ia_approved_and_notice_filed_joinMethod": "exact firm CRD set intersection of APPROVED StateRgstn/Rgltr/@Cd=IL and NoticeFiled/States/@RgltrCd=IL St=FILED",
        "state_ia_approved_and_notice_filed_records": overlap_records,
    }

    public = {
        "contract": "investor-il-iapd-census-v1",
        "safeAsCurrentIllinoisBulkStateLayer": True,
        "filterLogic": "Illinois selected by IAPD registration/notice jurisdiction fields (StateRgstn/Rgltr/@Cd, ERA/Rgltr/@Cd, NoticeFiled/States/@RgltrCd). Principal-office MainAddr/@State=IL is a separate national overlay and is not the state-RIA denominator.",
        "state": {k: v for k, v in state.items() if not str(k).startswith("_")},
        "sec": {k: v for k, v in sec.items() if not str(k).startswith("_")},
        "overlaps": overlaps,
        "semanticGrainRules": {
            "STATE_RIA_IS_DISTINCT_CREDENTIAL_FROM_SEC_RIA": True,
            "STATE_RIA_IS_DISTINCT_CREDENTIAL_FROM_NOTICE_FILING": True,
            "STATE_RIA_IS_DISTINCT_CREDENTIAL_FROM_STATE_ERA": True,
            "PRINCIPAL_OFFICE_IS_NOT_REGISTRATION": True,
            "REGISTRATION_ROW_IS_DISTINCT_GRAIN_FROM_DISTINCT_FIRM_CRD": True,
            "note": "These are contract/credential rules. They do not assert that CRD sets are disjoint or that counts are numerically unequal.",
        },
        "computedDiagnostics": {
            "state_ia_registration_rows": state["co_state_ia_registration_rows"],
            "state_ia_distinct_crd": state["co_state_ia_distinct_crd"],
            "state_ia_approved_distinct_crd": state["co_state_ia_approved_distinct_crd"],
            "state_ia_termrequest_distinct_crd": state["co_state_ia_termrequest_distinct_crd"],
            "state_era_registration_rows": state["co_state_era_registration_rows"],
            "state_era_distinct_crd": state["co_state_era_distinct_crd"],
            "state_ia_and_state_era_overlap_distinct_crd": len(ia & era),
            "state_ia_approved_and_notice_filed_overlap_distinct_crd": len(ia_approved & notice_filed),
            "notice_filed_distinct_crd": len(notice_filed),
            "notice_filed_firm_type": sec["co_notice_filed_firm_type"],
            "registration_rows_equal_distinct_crd": state["co_state_ia_registration_rows"]
            == state["co_state_ia_distinct_crd"],
        },
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(public, indent=2) + "\n", encoding="utf-8")
    summary = {
        **public["overlaps"],
        "wrote": str(OUT),
        **{k: public["state"][k] for k in public["state"] if "co_" in k or k in {"firms_in_feed", "sha256", "status_ia", "status_era"}},
        **{k: public["sec"][k] for k in public["sec"] if "co_" in k or k in {"firms_in_feed", "notice_status"}},
    }
    summary.pop("state_ia_approved_and_notice_filed_records", None)
    summary.pop("state_ia_approved_and_notice_filed_crds", None)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print("FAILED", exc, file=sys.stderr)
        raise
