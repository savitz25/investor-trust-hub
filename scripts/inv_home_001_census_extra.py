#!/usr/bin/env python3
"""INV-HOME-001 extra read-only slices."""
from pathlib import Path
import json
from urllib.parse import urlparse
import psycopg2
from psycopg2.extras import RealDictCursor

ENV = Path(__file__).resolve().parents[1] / "apps" / "web" / ".env.production.local"


def env_map():
    out = {}
    for line in ENV.read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def main():
    dsn = env_map()["DATABASE_URL"]
    conn = psycopg2.connect(dsn)
    conn.set_session(readonly=True, autocommit=True)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("set statement_timeout = '3min'")
    out = {}
    cur.execute(
        """
        select
          count(*) filter (where not exists (select 1 from form_adv_firm_facts a where a.firm_id = f.id)) as firms_without_adv_facts,
          count(*) filter (where coalesce(firm_kinds, '{}') = '{}') as firms_without_kinds
        from firms f where is_synthetic = false
        """
    )
    out["extra_firms"] = dict(cur.fetchone())
    cur.execute(
        """
        select sd.entity_kind, sd.indexable, count(*) n
        from search_documents sd
        group by 1,2 order by 1,2
        """
    )
    out["search_docs"] = list(cur.fetchall())
    cur.execute(
        """
        select
          count(*) filter (where b.region is null or btrim(b.region)='') as null_region,
          count(*) filter (where b.region is not null and btrim(b.region)<>'') as with_region
        from form_adv_firm_facts a
        join firms f on f.id = a.firm_id
        left join branches b on b.firm_id = f.id and b.is_main_office
        """
    )
    out["roster_geo"] = dict(cur.fetchone())
    cur.execute(
        """
        select
          case
            when raum_amount is null then 'null'
            when raum_amount = 0 then '0'
            when raum_amount < 25000000 then '<25m'
            when raum_amount < 100000000 then '25m-<100m'
            when raum_amount < 1000000000 then '100m-<1b'
            when raum_amount < 10000000000 then '1b-<10b'
            else '>=10b'
          end as band,
          count(*) n
        from form_adv_firm_facts
        where dataset_kind = 'ria'
        group by 1 order by 1
        """
    )
    out["raum_bands"] = list(cur.fetchall())
    cur.execute(
        """
        select field_name, presence_status, count(*) n
        from form_adv_reported_attributes
        where is_current and field_name in (
          '5E(1)','5E(2)','5E(3)','5E(4)','5E(5)','5E(6)','5E(7)',
          '5D(1)(a)','5D(1)(b)','6A(1)','7A(1)','11'
        )
        group by 1,2 order by 1,2
        """
    )
    out["selected_fields"] = list(cur.fetchall())
    cur.execute("select count(*) n from person_identifiers")
    out["person_identifiers"] = cur.fetchone()["n"]
    cur.execute(
        """
        select identifier_type, count(*) n
        from person_identifiers group by 1 order by n desc
        """
    )
    out["person_id_types"] = list(cur.fetchall())
    dest = Path(__file__).resolve().parents[1] / "docs" / "inv-home-001-census-extra.json"
    dest.write_text(json.dumps(out, default=str, indent=2), encoding="utf-8")
    print(json.dumps(out, default=str, indent=2)[:4000])
    conn.close()


if __name__ == "__main__":
    main()
