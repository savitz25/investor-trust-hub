from __future__ import annotations

import csv
from pathlib import Path

from ith_ingestion.errors import ValidationError
from ith_ingestion.sec_adv.headers import validate_headers
from ith_ingestion.sec_adv.models import DatasetKind, ParsedRow

ENCODINGS = ("utf-8-sig", "utf-8", "cp1252", "latin-1")


def detect_encoding(path: Path) -> str:
    raw = path.read_bytes()[: 256 * 1024]
    for encoding in ENCODINGS:
        try:
            raw.decode(encoding)
            return encoding
        except UnicodeDecodeError:
            continue
    return "cp1252"


def parse_csv(path: Path | str, dataset_kind: DatasetKind) -> tuple[list[str], list[ParsedRow]]:
    csv_path = Path(path)
    encoding = detect_encoding(csv_path)
    with csv_path.open(encoding=encoding, newline="") as handle:
        reader = csv.reader(handle)
        try:
            headers = next(reader)
        except StopIteration as exc:
            raise ValidationError("source file is empty") from exc
    issues = validate_headers(dataset_kind, headers)
    if issues:
        raise ValidationError("header validation failed", issues)

    rows: list[ParsedRow] = []
    with csv_path.open(encoding=encoding, newline="") as handle:
        dict_reader = csv.DictReader(handle)
        for index, raw in enumerate(dict_reader, start=2):
            values = {key: (value or "").strip() if value is not None else "" for key, value in raw.items()}
            if not any(values.values()):
                continue
            rows.append(ParsedRow(dataset_kind=dataset_kind, row_number=index, values=values))
    if not rows:
        raise ValidationError("source file has headers but no data rows")
    return headers, rows
