"""Read already-acquired IAPD compilation gzip files. Does not download."""

from __future__ import annotations

import gzip
from pathlib import Path
from xml.etree.ElementTree import iterparse

from .normalize import STATES, SourceRow, proposed_source_dataset_id


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _digits(value: object) -> str:
    return "".join(ch for ch in str(value or "") if ch.isdigit())


def parse_compilation(
    state_feed: Path,
    sec_feed: Path,
    *,
    source_as_of: str,
    retrieved_at: str,
) -> list[SourceRow]:
    rows: list[SourceRow] = []
    rows.extend(_parse_state(state_feed, source_as_of=source_as_of, retrieved_at=retrieved_at))
    rows.extend(_parse_sec(sec_feed, source_as_of=source_as_of, retrieved_at=retrieved_at))
    return rows


def _parse_state(path: Path, *, source_as_of: str, retrieved_at: str) -> list[SourceRow]:
    found: list[SourceRow] = []
    with gzip.open(path, "rb") as handle:
        for _, elem in iterparse(handle, events=("end",)):
            if _local(elem.tag) != "Firm":
                continue
            info = None
            for child in list(elem):
                tag = _local(child.tag)
                if tag == "Info":
                    info = child
                elif tag in {"StateRgstn", "ERA"}:
                    reg_class = "state_ia" if tag == "StateRgstn" else "state_era"
                    for wrap in list(child):
                        if _local(wrap.tag) != "Rgltrs":
                            continue
                        for rg in list(wrap):
                            if _local(rg.tag) != "Rgltr":
                                continue
                            code = (rg.attrib.get("Cd") or "").upper()
                            if code not in STATES:
                                continue
                            found.append(
                                _row(code, reg_class, info, rg.attrib.get("St"), rg.attrib.get("Dt"), source_as_of, retrieved_at, "")
                            )
            elem.clear()
    return found


def _parse_sec(path: Path, *, source_as_of: str, retrieved_at: str) -> list[SourceRow]:
    found: list[SourceRow] = []
    with gzip.open(path, "rb") as handle:
        for _, elem in iterparse(handle, events=("end",)):
            if _local(elem.tag) != "Firm":
                continue
            info = None
            sec_file = ""
            for child in list(elem):
                tag = _local(child.tag)
                if tag == "Info":
                    info = child
                    sec_file = (child.attrib.get("SECNb") or child.attrib.get("SecNb") or "")
                elif tag == "Rgstn" and not sec_file:
                    sec_file = child.attrib.get("SECNb") or child.attrib.get("SecNb") or ""
                elif tag == "NoticeFiled":
                    for st in list(child):
                        if _local(st.tag) != "States":
                            continue
                        code = (st.attrib.get("RgltrCd") or "").upper()
                        if code not in STATES:
                            continue
                        found.append(
                            _row(code, "notice_filing", info, st.attrib.get("St"), st.attrib.get("Dt"), source_as_of, retrieved_at, sec_file)
                        )
            elem.clear()
    return found


def _row(code, reg_class, info, status, status_date, source_as_of, retrieved_at, sec_file) -> SourceRow:
    crd = _digits(info.attrib.get("FirmCrdNb") if info is not None else "")
    return SourceRow(
        jurisdiction=code,
        registration_class=reg_class,
        crd=crd,
        sec_file_number=sec_file or "",
        legal_name=(info.attrib.get("LegalNm") if info is not None else "") or "",
        business_name=(info.attrib.get("BusNm") if info is not None else "") or "",
        status=status or "",
        status_date=status_date or "",
        source_dataset_id=proposed_source_dataset_id(code, reg_class),
        source_as_of=source_as_of,
        retrieved_at=retrieved_at,
    )
