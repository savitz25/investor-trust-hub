"""Build first-class Form ADV attribute rows from a snapshot payload."""

from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation
from typing import Any

from ith_ingestion.sec_adv.tier1_catalog import FIELDS, TRANSFORM_VERSION, FieldSpec

MONEY_RE = re.compile(r"[^0-9.\-]")


def _raw(payload: dict[str, Any], field: str) -> str | None:
    if field not in payload:
        return None
    value = payload.get(field)
    if value is None:
        return None
    text = str(value).strip()
    return text if text else ""


def _parse_number(raw: str) -> Decimal | None:
    cleaned = MONEY_RE.sub("", raw)
    if cleaned in {"", ".", "-", "-."}:
        return None
    try:
        return Decimal(cleaned)
    except (InvalidOperation, ValueError):
        return None


def observe_field(spec: FieldSpec, payload: dict[str, Any], dataset_kind: str) -> dict[str, Any]:
    if spec.ria_only and dataset_kind == "era":
        return {
            "item": spec.item,
            "field_name": spec.field_name,
            "regulator_label": spec.label,
            "reported_yn": None,
            "numeric_value": None,
            "text_value": None,
            "raw_value": None,
            "presence_status": "NOT_FILED_BY_FORM_TYPE",
            "public_readiness": spec.readiness,
            "evidence_status": "unavailable",
        }
    if spec.field_name not in payload:
        return {
            "item": spec.item,
            "field_name": spec.field_name,
            "regulator_label": spec.label,
            "reported_yn": None,
            "numeric_value": None,
            "text_value": None,
            "raw_value": None,
            "presence_status": "NOT_PRESENT_IN_SOURCE",
            "public_readiness": spec.readiness,
            "evidence_status": "not_found",
        }
    raw = _raw(payload, spec.field_name)
    if raw is None or raw == "":
        return {
            "item": spec.item,
            "field_name": spec.field_name,
            "regulator_label": spec.label,
            "reported_yn": None,
            "numeric_value": None,
            "text_value": None,
            "raw_value": raw if raw == "" else None,
            "presence_status": "NOT_PRESENT_IN_SOURCE",
            "public_readiness": spec.readiness,
            "evidence_status": "not_found",
        }
    if spec.kind == "yn":
        yn = raw.upper()
        if yn in {"Y", "N"}:
            return {
                "item": spec.item,
                "field_name": spec.field_name,
                "regulator_label": spec.label,
                "reported_yn": yn,
                "numeric_value": None,
                "text_value": yn,
                "raw_value": raw,
                "presence_status": "REPORTED_YES" if yn == "Y" else "REPORTED_NO",
                "public_readiness": spec.readiness,
                "evidence_status": "reported_by_source",
            }
        return {
            "item": spec.item,
            "field_name": spec.field_name,
            "regulator_label": spec.label,
            "reported_yn": None,
            "numeric_value": None,
            "text_value": raw,
            "raw_value": raw,
            "presence_status": "UNKNOWN",
            "public_readiness": spec.readiness,
            "evidence_status": "reported_by_source",
        }
    if spec.kind == "number":
        num = _parse_number(raw)
        if num is None:
            return {
                "item": spec.item,
                "field_name": spec.field_name,
                "regulator_label": spec.label,
                "reported_yn": None,
                "numeric_value": None,
                "text_value": raw,
                "raw_value": raw,
                "presence_status": "UNKNOWN",
                "public_readiness": spec.readiness,
                "evidence_status": "reported_by_source",
            }
        zero = num == 0
        return {
            "item": spec.item,
            "field_name": spec.field_name,
            "regulator_label": spec.label,
            "reported_yn": None,
            "numeric_value": num,
            "text_value": str(num),
            "raw_value": raw,
            "presence_status": "REPORTED_ZERO" if zero else "REPORTED_YES",
            "public_readiness": spec.readiness,
            "evidence_status": "reported_by_source",
        }
    return {
        "item": spec.item,
        "field_name": spec.field_name,
        "regulator_label": spec.label,
        "reported_yn": None,
        "numeric_value": None,
        "text_value": raw,
        "raw_value": raw,
        "presence_status": "REPORTED_YES",
        "public_readiness": spec.readiness,
        "evidence_status": "reported_by_source",
    }


def observe_payload(payload: dict[str, Any], dataset_kind: str) -> list[dict[str, Any]]:
    return [observe_field(spec, payload, dataset_kind) for spec in FIELDS]


def normalize_cik(raw: str | None) -> str | None:
    if not raw:
        return None
    digits = re.sub(r"\D", "", str(raw))
    if not digits:
        return None
    if len(digits) > 10:
        return None
    return digits.zfill(10)


def successor_resolution(payload: dict[str, Any], dataset_kind: str) -> dict[str, Any] | None:
    if dataset_kind != "ria":
        return None
    flag = str(payload.get("4A") or "").strip().upper()
    if flag != "Y":
        return None
    crd = str(payload.get("Organization CRD#") or "").strip()
    acquired = str(payload.get("Acquired Firm CRD#") or "").strip()
    if not acquired:
        return {
            "successor_crd": crd,
            "predecessor_crd": "",
            "resolution_status": "REVIEW_REQUIRED",
        }
    if acquired == crd:
        return {
            "successor_crd": crd,
            "predecessor_crd": acquired,
            "resolution_status": "REVIEW_REQUIRED",
        }
    return {
        "successor_crd": crd,
        "predecessor_crd": acquired,
        "resolution_status": "CONFIRMED",
    }


def transform_version() -> str:
    return TRANSFORM_VERSION
