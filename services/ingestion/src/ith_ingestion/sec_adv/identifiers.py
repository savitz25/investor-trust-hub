from __future__ import annotations

import re

CRD_RE = re.compile(r"^\d{1,10}$")
SEC_FILE_RE = re.compile(r"^(801|802|803|8)-\d{1,8}$", re.IGNORECASE)


def normalize_crd(value: str | None) -> str | None:
    if value is None:
        return None
    digits = re.sub(r"\s+", "", str(value).strip())
    if not digits:
        return None
    return digits


def is_valid_crd(value: str | None) -> bool:
    normalized = normalize_crd(value)
    return bool(normalized and CRD_RE.fullmatch(normalized))


def normalize_sec_file_number(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = re.sub(r"\s+", "", str(value).strip()).upper()
    return cleaned or None


def is_valid_sec_file_number(value: str | None) -> bool:
    normalized = normalize_sec_file_number(value)
    return bool(normalized and SEC_FILE_RE.fullmatch(normalized))


def firm_slug_for_crd(crd: str) -> str:
    return f"sec-crd-{crd}"
