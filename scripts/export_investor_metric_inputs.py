#!/usr/bin/env python3
"""Read-only production counts for investor-network-metrics-v1. No writes."""
from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import urlparse

import psycopg2
from psycopg2.extras import RealDictCursor

ROOT = Path(__file__).resolve().parents[1]
ENV = ROOT / "apps" / "web" / ".env.production.local"
REF = "ghjhcxfirxnszfnymdxb"


def load_dsn() -> str:
    raw = None
    for line in ENV.read_text(encoding="utf-8").splitlines():
        if line.startswith("DATABASE_URL=") or line.startswith("TARGET_DATABASE_URL="):
            candidate = line.split("=", 1)[1].strip().strip('"').strip("'")
            if REF in candidate:
                raw = candidate
                break
    if not raw:
        raise SystemExit("STOP: production DATABASE_URL for ghjhcx missing")
    u = urlparse(raw)
    if REF not in (u.username or "") and REF not in (u.hostname or "") and REF not in raw:
        raise SystemExit("STOP: DSN is not production ghjhcx")
    if "sslmode" not in (u.query or ""):
        raw = raw + ("&sslmode=require" if u.query else "?sslmode=require")
    return raw


def n(cur, sql: str):
    cur.execute(sql)
    row = cur.fetchone()
    return list(row.values())[0]


def rows(cur, sql: str):
    cur.execute(sql)
    return [dict(r) for r in cur.fetchall()]


def table_exists(cur, name: str) -> bool:
    cur.execute(
        "select 1 from information_schema.tables where table_schema='public' and table_name=%s",
        (name,),
    )
    return cur.fetchone() is not None


def main() -> None:
    conn = psycopg2.connect(load_dsn())
    conn.set_session(readonly=True, autocommit=True)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("set statement_timeout = '3min'")
    out = {
        "form_adv_firm_facts": n(cur, "select count(*) from form_adv_firm_facts"),
        "ria_facts": n(cur, "select count(*) from form_adv_firm_facts where dataset_kind='ria'"),
        "era_facts": n(cur, "select count(*) from form_adv_firm_facts where dataset_kind='era'"),
        "registrations_firm": n(
            cur, "select count(*) from registrations where subject_kind='firm' and is_synthetic=false"
        ),
        "ria_registered": n(
            cur,
            "select count(*) from registrations where is_synthetic=false and subject_kind='firm' and registration_type='registered_investment_adviser' and status='registered'",
        ),
        "ria_pending": n(
            cur,
            "select count(*) from registrations where is_synthetic=false and subject_kind='firm' and registration_type='registered_investment_adviser' and status='pending'",
        ),
        "era_reporting": n(
            cur,
            "select count(*) from registrations where is_synthetic=false and subject_kind='firm' and registration_type='exempt_reporting_adviser' and status='reporting'",
        ),
        "firms_official": n(cur, "select count(*) from firms where is_synthetic=false"),
        "search_indexable_firm": n(
            cur,
            """
            select count(*) from search_documents sd
            join firms f on f.id = sd.entity_id
            where sd.entity_kind='firm' and sd.indexable=true and f.is_synthetic=false
            """,
        ),
        "search_documents_firm": n(cur, "select count(*) from search_documents where entity_kind='firm'"),
        "crd_identifiers": n(cur, "select count(*) from firm_identifiers where identifier_type='crd'"),
        "crd_distinct_firms": n(
            cur, "select count(distinct firm_id) from firm_identifiers where identifier_type='crd'"
        ),
        "sec_file_identifiers": n(
            cur, "select count(*) from firm_identifiers where identifier_type='sec_file_number'"
        ),
        "sec_file_distinct_firms": n(
            cur, "select count(distinct firm_id) from firm_identifiers where identifier_type='sec_file_number'"
        ),
        "form_adv_reported_attributes": n(cur, "select count(*) from form_adv_reported_attributes"),
        "form_adv_filings": n(cur, "select count(*) from form_adv_filings"),
        "disclosure_events": n(cur, "select count(*) from disclosure_events"),
        "evidence_records": n(cur, "select count(*) from evidence_records"),
        "branches_main": n(cur, "select count(*) from branches where is_main_office"),
        "source_snapshots": n(cur, "select count(*) from source_snapshots"),
        "raum": rows(
            cur,
            """
            select
              count(*) filter (where raum_amount is not null) as raum_nn,
              count(*) filter (where raum_amount is null) as raum_null,
              count(*) filter (where raum_amount = 0) as raum_zero,
              count(*) filter (where raum_amount > 0) as raum_positive
            from form_adv_firm_facts
            where dataset_kind='ria'
            """,
        ),
        "disclosure_indicator": rows(
            cur,
            """
            select coalesce(disclosure_indicator,'(null)') as indicator, dataset_kind, count(*) n
            from form_adv_firm_facts
            group by 1,2 order by n desc
            """,
        ),
        "dataset_kind": rows(cur, "select dataset_kind, count(*) n from form_adv_firm_facts group by 1 order by n desc"),
    }
    for table in [
        "form_adv_owner_entities",
        "form_adv_schedule_ab_rows",
        "form_adv_withdrawals",
        "form_adv_successor_links",
    ]:
        out[table] = n(cur, f"select count(*) from {table}") if table_exists(cur, table) else None
    conn.close()
    print(json.dumps(out, default=str, indent=2))


if __name__ == "__main__":
    main()
