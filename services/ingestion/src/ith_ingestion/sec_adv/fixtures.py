from __future__ import annotations

import csv
from pathlib import Path

from ith_ingestion.sec_adv.headers import official_headers


def write_fixture_csv(path: Path, dataset_kind: str, rows: list[dict[str, str]]) -> None:
    headers = list(official_headers(dataset_kind))
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="cp1252", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=headers, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow({header: row.get(header, "") for header in headers})


RIA_FIXTURE_ROWS = [
    {
        "Organization CRD#": "900000001",
        "SEC#": "801-9000001",
        "Firm Type": "Registered",
        "Primary Business Name": "SYNTHETIC LEDGER ADVISERS LLC",
        "Legal Name": "SYNTHETIC LEDGER ADVISERS LLC",
        "Main Office Street Address 1": "1 EXAMPLE STREET",
        "Main Office City": "PORTLAND",
        "Main Office State": "OR",
        "Main Office Country": "United States",
        "Main Office Postal Code": "97201",
        "SEC Current Status": "Approved",
        "SEC Status Effective Date": "01/15/2020",
        "Latest ADV Filing Date": "03/01/2026",
        "Form Version": "10/2021",
        "3A": "Limited Liability Company",
        "3B": "DECEMBER",
        "5F(1)": "Y",
        "5F(2)(a)": "1000000.00",
        "5F(2)(b)": "0.00",
        "5F(2)(c)": "1000000.00",
        "11": "N",
    },
    {
        "Organization CRD#": "900000002",
        "SEC#": "801-9000002",
        "Firm Type": "Registered",
        "Primary Business Name": "SYNTHETIC CEDAR ADVISORY INC",
        "Legal Name": "SYNTHETIC CEDAR ADVISORY INC",
        "Main Office Street Address 1": "50 FICTION ROAD",
        "Main Office City": "MADISON",
        "Main Office State": "WI",
        "Main Office Country": "United States",
        "Main Office Postal Code": "53703",
        "SEC Current Status": "120-Day Approval",
        "SEC Status Effective Date": "07/01/2026",
        "Latest ADV Filing Date": "07/01/2026",
        "5F(2)(c)": "250000.00",
        "11": "Y",
    },
    {
        "Organization CRD#": "not-a-crd",
        "SEC#": "801-9000003",
        "Firm Type": "Registered",
        "Primary Business Name": "SYNTHETIC BAD CRD FIRM",
        "Legal Name": "SYNTHETIC BAD CRD FIRM",
        "SEC Current Status": "Approved",
    },
]

ERA_FIXTURE_ROWS = [
    {
        "Organization CRD#": "900000010",
        "SEC#": "802-9000010",
        "Firm Type": "ERA",
        "Primary Business Name": "SYNTHETIC HARBOR ERA LP",
        "Legal Name": "SYNTHETIC HARBOR ERA LP",
        "Main Office Street Address 1": "9 EXAMPLE WHARF",
        "Main Office City": "BOSTON",
        "Main Office State": "MA",
        "Main Office Country": "United States",
        "Main Office Postal Code": "02110",
        "SEC Current Status": "ERA - Active",
        "SEC Status Effective Date": "02/02/2024",
        "Latest ADV Filing Date": "02/02/2026",
        "3A": "Limited Partnership",
        "11": "N",
    },
    {
        "Organization CRD#": "900000011",
        "SEC#": "802-9000011",
        "Firm Type": "ERA",
        "Primary Business Name": "SYNTHETIC RIVER ERA LLC",
        "Legal Name": "SYNTHETIC RIVER ERA LLC",
        "Main Office Street Address 1": "2 IMAGINARY PLAZA",
        "Main Office City": "CHICAGO",
        "Main Office State": "IL",
        "Main Office Country": "United States",
        "Main Office Postal Code": "60601",
        "SEC Current Status": "ERA - Active",
        "SEC Status Effective Date": "05/05/2025",
        "Latest ADV Filing Date": "05/05/2026",
    },
]


def write_standard_fixtures(directory: Path) -> None:
    write_fixture_csv(directory / "ria.csv", "ria", RIA_FIXTURE_ROWS)
    write_fixture_csv(directory / "era.csv", "era", ERA_FIXTURE_ROWS)
