#!/usr/bin/env python3
"""INV-HOME-001 read-only production census. No writes."""
from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import urlparse

import psycopg2
from psycopg2.extras import RealDictCursor

ROOT = Path(__file__).resolve().parents[1]
ENV = ROOT / "apps" / "web" / ".env.production.local"


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for line in ENV.read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def n(cur, sql: str, params=None):
    cur.execute(sql, params or ())
    row = cur.fetchone()
    return list(row.values())[0]


def rows(cur, sql: str, params=None):
    cur.execute(sql, params or ())
    return list(cur.fetchall())


def main() -> int:
    env = load_env()
    dsn = env["DATABASE_URL"]
    u = urlparse(dsn)
    meta = {
        "SITE_INDEXING_ENABLED": env.get("SITE_INDEXING_ENABLED"),
        "INDEXABLE_HOSTS": env.get("INDEXABLE_HOSTS"),
        "CANONICAL_HOST": env.get("CANONICAL_HOST"),
        "NEXT_PUBLIC_SITE_URL": env.get("NEXT_PUBLIC_SITE_URL"),
        "VERCEL_GIT_COMMIT_SHA": env.get("VERCEL_GIT_COMMIT_SHA"),
        "VERCEL_GIT_COMMIT_REF": env.get("VERCEL_GIT_COMMIT_REF"),
        "db_host": u.hostname,
        "db_port": u.port,
        "db_user": u.username,
        "db_name": u.path.lstrip("/"),
    }
    conn = psycopg2.connect(dsn)
    conn.set_session(readonly=True, autocommit=True)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("set statement_timeout = '3min'")

    out: dict = {"env": meta, "counts": {}, "groups": {}}
    out["counts"] = {
        "firms_all": n(cur, "select count(*) from firms"),
        "firms_official": n(cur, "select count(*) from firms where is_synthetic = false"),
        "firms_synthetic": n(cur, "select count(*) from firms where is_synthetic = true"),
        "people_all": n(cur, "select count(*) from people"),
        "people_official": n(cur, "select count(*) from people where is_synthetic = false"),
        "person_firm_associations": n(cur, "select count(*) from person_firm_associations"),
        "person_firm_associations_official": n(
            cur,
            """
            select count(*) from person_firm_associations a
            join people p on p.id = a.person_id
            where p.is_synthetic = false
            """,
        ),
        "branches": n(cur, "select count(*) from branches"),
        "branches_main": n(cur, "select count(*) from branches where is_main_office"),
        "registrations_firm": n(cur, "select count(*) from registrations where subject_kind = 'firm'"),
        "registrations_person": n(cur, "select count(*) from registrations where subject_kind = 'person'"),
        "search_documents_firm": n(cur, "select count(*) from search_documents where entity_kind = 'firm'"),
        "search_indexable_firm": n(
            cur,
            """
            select count(*) from search_documents sd
            join firms f on f.id = sd.entity_id
            where sd.entity_kind = 'firm' and sd.indexable = true and f.is_synthetic = false
            """,
        ),
        "form_adv_firm_facts": n(cur, "select count(*) from form_adv_firm_facts"),
        "form_adv_reported_attributes": n(cur, "select count(*) from form_adv_reported_attributes"),
        "form_adv_filings": n(cur, "select count(*) from form_adv_filings"),
        "disclosure_events": n(cur, "select count(*) from disclosure_events"),
        "products": n(cur, "select count(*) from products"),
        "issuers": n(cur, "select count(*) from issuers"),
        "evidence_records": n(cur, "select count(*) from evidence_records"),
        "source_snapshots": n(cur, "select count(*) from source_snapshots"),
        "source_releases": n(cur, "select count(*) from source_releases"),
    }

    # optional tables from 0013
    for table in [
        "form_adv_owner_entities",
        "form_adv_schedule_ab_rows",
        "form_adv_schedule_d_related",
        "form_adv_offices",
        "form_adv_funds",
        "form_adv_crs_documents",
        "form_adv_withdrawals",
        "form_adv_successor_links",
    ]:
        cur.execute("select to_regclass(%s) as t", (table,))
        exists = cur.fetchone()["t"]
        out["counts"][table] = None if not exists else n(cur, f"select count(*) from {table}")

    out["groups"]["firm_kinds"] = rows(
        cur,
        """
        select unnest(firm_kinds) as kind, count(*) n
        from firms where is_synthetic = false
        group by 1 order by n desc
        """,
    )
    out["groups"]["registration_type_status"] = rows(
        cur,
        """
        select registration_type, status, count(*) n
        from registrations
        where is_synthetic = false and subject_kind = 'firm'
        group by 1,2 order by n desc
        """,
    )
    out["groups"]["adv_dataset_kind"] = rows(
        cur,
        "select dataset_kind, count(*) n from form_adv_firm_facts group by 1 order by n desc",
    )
    out["groups"]["identifier_types"] = rows(
        cur,
        """
        select identifier_type, count(*) n, count(distinct firm_id) firms
        from firm_identifiers group by 1 order by n desc
        """,
    )
    out["groups"]["releases"] = rows(
        cur,
        """
        select id::text, source_dataset_id, release_label, retrieved_at, published_at, checksum_sha256
        from source_releases
        order by retrieved_at desc nulls last
        limit 12
        """,
    )
    out["groups"]["raum"] = rows(
        cur,
        """
        select
          count(*) filter (where raum_amount is not null) as raum_nn,
          count(*) filter (where raum_amount is null) as raum_null,
          count(*) filter (where raum_amount = 0) as raum_zero,
          count(*) filter (where raum_amount > 0) as raum_positive,
          min(raum_amount) as raum_min,
          max(raum_amount) as raum_max
        from form_adv_firm_facts
        where dataset_kind = 'ria'
        """,
    )
    out["groups"]["disclosure_indicator"] = rows(
        cur,
        """
        select coalesce(disclosure_indicator,'(null)') as indicator, dataset_kind, count(*) n
        from form_adv_firm_facts
        group by 1,2 order by n desc
        """,
    )
    out["groups"]["principal_office_states"] = rows(
        cur,
        """
        select coalesce(nullif(btrim(b.region), ''), '(null)') as state, count(distinct f.id) n
        from firms f
        left join branches b on b.firm_id = f.id and b.is_main_office
        where f.is_synthetic = false
        group by 1 order by n desc
        """,
    )
    out["groups"]["tier1_field_coverage"] = rows(
        cur,
        """
        select field_name, presence_status, public_readiness, count(*) n
        from form_adv_reported_attributes
        where is_current = true
        group by 1,2,3
        order by field_name, n desc
        limit 200
        """,
    )
    out["groups"]["people_kinds"] = rows(
        cur,
        """
        select unnest(professional_kinds) as kind, is_synthetic, count(*) n
        from people
        group by 1,2 order by n desc
        """,
    )

    dest = ROOT / "docs" / "inv-home-001-census.json"
    dest.write_text(json.dumps(out, default=str, indent=2), encoding="utf-8")
    print("wrote", dest)
    print(json.dumps({"env": meta, "counts": out["counts"]}, default=str, indent=2))
    conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
