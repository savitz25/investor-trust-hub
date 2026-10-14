"""Count North Dakota IAPD jurisdictions from the official 2026-10-14 feeds."""
from __future__ import annotations

import gzip
import hashlib
import json
import zipfile
from collections import Counter
from pathlib import Path
from xml.etree.ElementTree import iterparse

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "raw" / "north-dakota-inv-001"
OUT = ROOT / "data" / "north-dakota-inv-001" / "iapd-north-dakota-summary.json"
CD = "ND"


def tag(el):
    return el.tag.rsplit("}", 1)[-1]


def sha(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for b in iter(lambda: f.read(1024 * 1024), b""):
            h.update(b)
    return h.hexdigest().upper()


def firm_feed(path, sec=False):
    rows = Counter()
    firms = set()
    status_ia, status_era, status_notice = Counter(), Counter(), Counter()
    with gzip.open(path, "rb") as fh:
        for _, firm in iterparse(fh, events=("end",)):
            if tag(firm) != "Firm":
                continue
            info = next((x for x in list(firm) if tag(x) == "Info"), None)
            crd = (info.attrib.get("FirmCrdNb", "") if info is not None else "").strip()
            if crd:
                firms.add(crd)
            for node in firm.iter():
                if tag(node) == "Rgltr" and node.attrib.get("Cd", "").upper() == CD:
                    st = node.attrib.get("St", "").upper()
                    parent_type = next((tag(p) for p in firm.iter() if node in list(p)), "")
                    if parent_type == "Rgltrs":
                        # Distinguish the parent registration container by its ancestor.
                        container = next((x for x in list(firm) if any(node is y for y in x.iter())), None)
                        cname = tag(container) if container is not None else ""
                        if cname == "StateRgstn":
                            rows["ia_rows"] += 1
                            status_ia[st] += 1
                        elif cname == "ERA":
                            rows["era_rows"] += 1
                            status_era[st] += 1
                elif sec and tag(node) == "States" and node.attrib.get("RgltrCd", "").upper() == CD:
                    st = node.attrib.get("St", "").upper()
                    rows["notice_rows"] += 1
                    status_notice[st] += 1
                    if crd and st == "FILED":
                        rows.setdefault("notice_filed_crds", set()).add(crd)
                    if crd:
                        rows.setdefault("notice_any_crds", set()).add(crd)
            if not sec and crd:
                for x in list(firm):
                    cname = tag(x)
                    if cname in {"StateRgstn", "ERA"}:
                        for node in x.iter():
                            if tag(node) == "Rgltr" and node.attrib.get("Cd", "").upper() == CD:
                                target = "ia_crds" if cname == "StateRgstn" else "era_crds"
                                rows.setdefault(target, {}).setdefault(crd, []).append(node.attrib.get("St", "").upper())
            firm.clear()
    return firms, rows, status_ia, status_era, status_notice


def main():
    state_path = DATA / "IA_FIRM_STATE_Feed_10_14_2026.xml.gz"
    sec_path = DATA / "IA_FIRM_SEC_Feed_10_14_2026.xml.gz"
    iar_path = DATA / "IA_INDVL_Feed_10_14_2026.xml.zip"
    _, state, sia, sera, _ = firm_feed(state_path)
    _, sec, _, _, sn = firm_feed(sec_path, sec=True)
    ia = state.get("ia_crds", {})
    era = state.get("era_crds", {})
    notice = sec.get("notice_filed_crds", set())
    active_ia = {c for c, sts in ia.items() if "APPROVED" in sts}
    active_era = {c for c, sts in era.items() if "ACTIVE" in sts}
    iar_people, iar_rows, iar_status = set(), 0, Counter()
    with zipfile.ZipFile(iar_path) as z:
        for name in z.namelist():
            with z.open(name) as fh:
                for _, ind in iterparse(fh, events=("end",)):
                    if tag(ind) != "Indvl":
                        continue
                    info = next((x for x in list(ind) if tag(x) == "Info"), None)
                    person = info.attrib.get("indvlPK", "") if info is not None else ""
                    matched = []
                    for reg in ind.iter():
                        if tag(reg) == "CrntRgstn" and reg.attrib.get("regAuth", "").upper() == CD:
                            st = reg.attrib.get("st", "").upper()
                            iar_status[st] += 1
                            iar_rows += 1
                            if st == "APPROVED" and person:
                                matched.append(person)
                    iar_people.update(matched)
                    ind.clear()
    summary = {
        "sourceDate": "2026-10-14",
        "retrievedAt": "2026-10-14",
        "jurisdiction": CD,
        "stateFeed": {"file": state_path.name, "sha256": sha(state_path), "bytes": state_path.stat().st_size,
                      "filter": "StateRgstn/Rgltr/@Cd=ND", "registrationRows": state["ia_rows"],
                      "distinctFirmCrdAnyStatus": len(ia), "approvedDistinctFirmCrd": len(active_ia),
                      "statusRows": dict(sia)},
        "era": {"filter": "ERA/Rgltr/@Cd=ND", "registrationRows": state["era_rows"],
                "distinctFirmCrdAnyStatus": len(era), "activeDistinctFirmCrd": len(active_era),
                "statusRows": dict(sera)},
        "secFeed": {"file": sec_path.name, "sha256": sha(sec_path), "bytes": sec_path.stat().st_size,
                    "filter": "NoticeFiled/States/@RgltrCd=ND", "noticeRows": sec["notice_rows"],
                    "distinctFirmCrdAnyStatus": len(sec["notice_any_crds"]),
                    "filedDistinctFirmCrd": len(notice), "statusRows": dict(sn)},
        "exactFirmCrdIntersections": {"approvedStateIaAndFiledNotice": len(active_ia & notice),
                                      "activeEraAndFiledNotice": len(active_era & notice),
                                      "activeStateIaAndActiveEra": len(active_ia & active_era)},
        "iarFeed": {"file": iar_path.name, "sha256": sha(iar_path), "bytes": iar_path.stat().st_size,
                    "personRowsWithCurrentRegistration": iar_rows,
                    "distinctPersonCrdWithApprovedRegistration": len(iar_people),
                    "statusRows": dict(iar_status),
                    "filter": "Indvl/CrntEmps/CrntEmp/CrntRgstns/CrntRgstn/@regAuth=ND; APPROVED persons distinct; status rows retained"},
        "grain": "Firm CRD for IA/notice/ERA; person CRD for IAR. Jurisdiction fields only; no address inference.",
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()

