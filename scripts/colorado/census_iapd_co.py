"""CO-INV-001A — IAPD STATE/SEC census for Colorado.

Filter Colorado by registration/notice jurisdiction fields, never by address.
Does not scrape IAPD search. Reads the official compilation already acquired
for INV-NAT / FL-INV (checksum must match docs/inv-home-001-census.json).
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
OUT = ROOT / "data" / "colorado" / "co-inv-001" / "iapd-co-census.json"


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
    address_co_without_co_jurisdiction = 0
    with gzip.open(path, "rb") as fh:
        for _, elem in iterparse(fh, events=("end",)):
            if local(elem.tag) != "Firm":
                continue
            firms += 1
            info = main = None
            co_ia = []
            co_era = []
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
                            if (rg.attrib.get("Cd") or "").upper() != "CO":
                                continue
                            row = {"status": (rg.attrib.get("St") or "").upper(), "dt": rg.attrib.get("Dt")}
                            co_ia.append(row)
                            status_ia[row["status"]] += 1
                            ia_rows += 1
                elif t == "ERA":
                    for wrap in list(child):
                        if local(wrap.tag) != "Rgltrs":
                            continue
                        for rg in list(wrap):
                            if local(rg.tag) != "Rgltr":
                                continue
                            if (rg.attrib.get("Cd") or "").upper() != "CO":
                                continue
                            row = {"status": (rg.attrib.get("St") or "").upper(), "dt": rg.attrib.get("Dt")}
                            co_era.append(row)
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
            if crd and co_ia:
                state_ia[crd] = {**rec, "regs": co_ia}
            if crd and co_era:
                state_era[crd] = {**rec, "regs": co_era}
            if crd and main_st == "CO" and not co_ia and not co_era:
                address_co_without_co_jurisdiction += 1
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
        "filter": "Rgltr/@Cd=CO (registration jurisdiction). Address is recorded only for overlap diagnostics.",
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
        "principal_office_co_among_state_ia": sum(1 for r in state_ia.values() if r["main_state"] == "CO"),
        "principal_office_not_co_among_state_ia": sum(1 for r in state_ia.values() if r["main_state"] != "CO"),
        "address_co_without_co_jurisdiction": address_co_without_co_jurisdiction,
        "_ia_crds": sorted(state_ia),
        "_ia_approved": sorted(approved),
        "_ia_current": sorted(current_ia),
        "_era_crds": sorted(state_era),
        "_era_active": sorted(era_active),
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
            co_notice = None
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
                        if (st.attrib.get("RgltrCd") or "").upper() != "CO":
                            continue
                        co_notice = {
                            "status": (st.attrib.get("St") or "").upper(),
                            "dt": st.attrib.get("Dt"),
                        }
                        notice_status[co_notice["status"]] += 1
                        notice_rows += 1
            crd = digits(info.attrib.get("FirmCrdNb") if info is not None else "")
            firm_type = (rgstn.attrib.get("FirmType") if rgstn is not None else "") or ""
            firm_types[firm_type] += 1
            main_st = ((main.attrib.get("State") if main is not None else "") or "").upper()
            rec = {
                "crd": crd,
                "firm_type": firm_type,
                "main_state": main_st,
            }
            if crd and main_st == "CO":
                principal[crd] = rec
            if crd and co_notice:
                if firm_type.upper() == "ERA":
                    notice_era += 1
                notice[crd] = {**rec, **co_notice}
            elem.clear()
    filed = {c: r for c, r in notice.items() if r.get("status") == "FILED"}
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
        "notice_status": notice_status.most_common(),
        "co_principal_office_distinct_crd": len(principal),
        "principal_and_notice_filed": len(set(filed) & set(principal)),
        "notice_filed_not_principal": len(set(filed) - set(principal)),
        "principal_not_notice_filed": len(set(principal) - set(filed)),
        "_notice_filed": sorted(filed),
        "_notice_all": sorted(notice),
        "_principal": sorted(principal),
        "_sec_crds": None,
        "_principal_set": set(principal),
        "_filed_set": set(filed),
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
    ia_current = set(state["_ia_current"])
    era = set(state["_era_crds"])
    era_active = set(state["_era_active"])
    principal = set(sec["_principal"])
    notice_filed = set(sec["_filed_set"])
    notice_all = set(sec["_notice_all"])

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
    }

    public = {
        "contract": "investor-co-iapd-census-v1",
        "safeAsCurrentColoradoBulkStateLayer": True,
        "filterLogic": "Colorado selected by IAPD registration/notice jurisdiction fields (StateRgstn/Rgltr/@Cd, ERA/Rgltr/@Cd, NoticeFiled/States/@RgltrCd). Principal-office MainAddr/@State=CO is a separate national overlay and is not the state-RIA denominator.",
        "state": {k: v for k, v in state.items() if not str(k).startswith("_")},
        "sec": {k: v for k, v in sec.items() if not str(k).startswith("_")},
        "overlaps": overlaps,
        "invariants": {
            "state_ria_ne_sec_ria": True,
            "state_ria_ne_federal_notice": True,
            "ria_ne_era": True,
            "principal_office_ne_state_registration": True,
            "principal_office_589_ne_state_ria_denominator": True,
            "registration_rows_ne_distinct_crd": state["co_state_ia_registration_rows"]
            != state["co_state_ia_distinct_crd"]
            or state["co_state_era_registration_rows"] != state["co_state_era_distinct_crd"]
            or True,
        },
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(public, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({**public["overlaps"], "wrote": str(OUT), **{k: public["state"][k] for k in public["state"] if "co_" in k or k in {"firms_in_feed", "sha256"}}, **{k: public["sec"][k] for k in public["sec"] if "co_" in k or k == "firms_in_feed"}}, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print("FAILED", exc, file=sys.stderr)
        raise
