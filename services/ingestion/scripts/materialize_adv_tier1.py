#!/usr/bin/env python3
"""INV-NAT-001B: materialize existing Form ADV Tier 1 attributes. No new SEC fetch."""
from __future__ import annotations

import json
import os
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

SCRIPTS = Path(__file__).resolve().parent
ROOT = SCRIPTS.parents[2]
sys.path.insert(0, str(SCRIPTS))
sys.path.insert(0, str(ROOT / "services" / "ingestion" / "src"))
from load_env import load_local_env  # noqa: E402

load_local_env(ROOT)

from ith_ingestion.sec_adv.tier1_catalog import LOCKED_FINGERPRINT, TRANSFORM_VERSION  # noqa: E402
from ith_ingestion.sec_adv.tier1_observe import (  # noqa: E402
    normalize_cik,
    observe_payload,
    successor_resolution,
)

PREFLIGHT_SQL = {
    "firms": "SELECT count(*) FROM firms WHERE is_synthetic = false",
    "snapshots": "SELECT count(*) FROM source_snapshots",
    "facts": "SELECT count(*) FROM form_adv_firm_facts WHERE is_synthetic = false",
    "ria": "SELECT count(*) FROM registrations WHERE registration_type = 'registered_investment_adviser' AND is_synthetic = false",
    "era": "SELECT count(*) FROM registrations WHERE registration_type = 'exempt_reporting_adviser' AND is_synthetic = false",
    "indexable": "SELECT count(*) FROM search_documents WHERE entity_kind = 'firm' AND is_synthetic = false AND indexable = true",
    "disclosure_events": "SELECT count(*) FROM disclosure_events",
    "products": "SELECT count(*) FROM products",
    "people": "SELECT count(*) FROM people",
}

EXPECTED = {
    "firms": 23622,
    "snapshots": 23622,
    "facts": 23622,
    "ria": 17018,
    "era": 6604,
    "indexable": 1000,
    "disclosure_events": 0,
    "products": 0,
    "people": 0,
}

ATTR_SQL = """
INSERT INTO form_adv_reported_attributes (
    firm_id, source_release_id, source_dataset_id, source_authority_id,
    source_record_identifier, item, field_name, regulator_label,
    reported_yn, numeric_value, text_value, raw_value, presence_status,
    public_readiness, evidence_status, as_of_date, retrieved_at,
    transform_version, evidence_id, is_current
) VALUES (
    %s, %s, %s, 'sec', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, true
)
ON CONFLICT (firm_id, source_release_id, field_name) DO UPDATE SET
    reported_yn = EXCLUDED.reported_yn,
    numeric_value = EXCLUDED.numeric_value,
    text_value = EXCLUDED.text_value,
    raw_value = EXCLUDED.raw_value,
    presence_status = EXCLUDED.presence_status,
    public_readiness = EXCLUDED.public_readiness,
    evidence_status = EXCLUDED.evidence_status,
    as_of_date = EXCLUDED.as_of_date,
    retrieved_at = EXCLUDED.retrieved_at,
    transform_version = EXCLUDED.transform_version,
    evidence_id = EXCLUDED.evidence_id,
    is_current = true,
    updated_at = now()
"""

SUCC_SQL = """
INSERT INTO form_adv_successor_links (
    successor_firm_id, successor_crd, predecessor_crd, predecessor_firm_id,
    source_release_id, source_field, resolution_status, evidence_id, transform_version
) VALUES (%s, %s, %s, %s, %s, 'Acquired Firm CRD#', %s, %s, %s)
ON CONFLICT (successor_firm_id, predecessor_crd, source_release_id) DO UPDATE SET
    predecessor_firm_id = EXCLUDED.predecessor_firm_id,
    resolution_status = EXCLUDED.resolution_status,
    transform_version = EXCLUDED.transform_version
"""

CIK_SQL = """
INSERT INTO firm_identifiers (
    firm_id, identifier_type, identifier_value, issuing_authority_id, is_primary, evidence_id
) VALUES (%s, 'cik', %s, 'sec', false, %s)
ON CONFLICT (identifier_type, identifier_value) DO NOTHING
"""

FIRM_SQL = """
SELECT f.id::text,
       i.identifier_value AS crd,
       adv.dataset_kind,
       adv.source_dataset_id,
       adv.source_release_id::text,
       adv.latest_adv_filing_date,
       ss.payload,
       ss.evidence_id::text,
       rel.retrieved_at
FROM firms f
JOIN firm_identifiers i
  ON i.firm_id = f.id AND i.identifier_type = 'crd'
JOIN form_adv_firm_facts adv ON adv.firm_id = f.id
JOIN source_snapshots ss
  ON ss.subject_id = f.id AND ss.subject_kind = 'firm'
 AND ss.source_release_id = adv.source_release_id
JOIN source_releases rel ON rel.id = adv.source_release_id
WHERE f.is_synthetic = false
"""


def connect():
    import psycopg

    dsn = os.environ.get("DATABASE_URL") or os.environ.get("INGESTION_DATABASE_URL")
    if not dsn:
        raise SystemExit("DATABASE_URL missing")
    conn = psycopg.connect(dsn, connect_timeout=30, keepalives=1, keepalives_idle=30)
    conn.execute("SET statement_timeout = 0")
    conn.execute("SET idle_in_transaction_session_timeout = 0")
    return conn


def preflight(conn) -> dict:
    out = {}
    with conn.cursor() as cur:
        cur.execute("SELECT filename FROM schema_migrations ORDER BY filename")
        out["schema_migrations"] = [r[0] for r in cur.fetchall()]
        for name, sql in PREFLIGHT_SQL.items():
            cur.execute(sql)
            out[name] = int(cur.fetchone()[0])
    return out


def load_firms(conn) -> list[dict]:
    rows = []
    with conn.cursor() as cur:
        cur.execute(FIRM_SQL)
        cols = [d[0] for d in cur.description]
        for rec in cur:
            rows.append(dict(zip(cols, rec)))
    return rows


def build(rows: list[dict]) -> tuple[list[tuple], list[tuple], list[tuple], dict]:
    attr_rows: list[tuple] = []
    succ_rows: list[tuple] = []
    cik_map: dict[str, list[tuple[str, str]]] = defaultdict(list)
    stats = Counter()
    yn_counts = Counter()
    crds = []
    crd_to_firm = {row["crd"]: row["id"] for row in rows}
    for row in rows:
        crd = row["crd"]
        crds.append(crd)
        crd_to_firm[crd] = row["id"]
        payload = row["payload"] or {}
        if isinstance(payload, str):
            payload = json.loads(payload)
        dataset = row["dataset_kind"]
        stats[f"dataset_{dataset}"] += 1
        observed = observe_payload(payload, dataset)
        for obs in observed:
            stats[obs["presence_status"]] += 1
            stats[f"ready_{obs['public_readiness']}"] += 1
            if obs["field_name"].startswith("5E(") and obs["presence_status"] == "REPORTED_YES":
                yn_counts[obs["field_name"]] += 1
            if obs["field_name"] == "11" and obs["reported_yn"]:
                yn_counts[f"11_{obs['reported_yn']}"] += 1
            if obs["field_name"] == "7B" and obs["reported_yn"] == "Y":
                yn_counts["7B_Y"] += 1
            attr_rows.append(
                (
                    row["id"],
                    row["source_release_id"],
                    row["source_dataset_id"],
                    crd,
                    obs["item"],
                    obs["field_name"],
                    obs["regulator_label"],
                    obs["reported_yn"],
                    obs["numeric_value"],
                    obs["text_value"],
                    obs["raw_value"],
                    obs["presence_status"],
                    obs["public_readiness"],
                    obs["evidence_status"],
                    row["latest_adv_filing_date"],
                    row["retrieved_at"],
                    TRANSFORM_VERSION,
                    row["evidence_id"],
                )
            )
        succ = successor_resolution(payload, dataset)
        if succ:
            stats[f"successor_{succ['resolution_status']}"] += 1
            pred_id = None
            if succ["resolution_status"] == "CONFIRMED":
                pred_id = crd_to_firm.get(succ["predecessor_crd"])
                if pred_id is None:
                    stats["successor_confirmed_unresolved_pred"] += 1
            succ_rows.append(
                (
                    row["id"],
                    succ["successor_crd"],
                    succ["predecessor_crd"] or succ["successor_crd"],
                    pred_id,
                    row["source_release_id"],
                    succ["resolution_status"],
                    row["evidence_id"],
                    TRANSFORM_VERSION,
                )
            )
        cik = normalize_cik(str(payload.get("CIK#") or "") or None)
        if cik:
            cik_map[cik].append((row["id"], row["evidence_id"]))
        elif payload.get("CIK#"):
            stats["cik_malformed"] += 1
        else:
            stats["cik_null"] += 1
    unique_cik = []
    collisions = 0
    for cik, owners in cik_map.items():
        firms = {o[0] for o in owners}
        if len(firms) == 1:
            unique_cik.append((owners[0][0], cik, owners[0][1]))
        else:
            collisions += 1
            stats["cik_collisions"] += 1
    stats["cik_values"] = sum(len(v) for v in cik_map.values())
    stats["cik_distinct"] = len(cik_map)
    stats["cik_promotable"] = len(unique_cik)
    stats["attribute_rows"] = len(attr_rows)
    stats["successor_rows"] = len(succ_rows)
    stats["unique_crds"] = len(set(crds))
    return attr_rows, succ_rows, unique_cik, {"counters": dict(stats), "yn": dict(yn_counts), "cik_collisions": collisions}


def write_batches(conn, sql: str, rows: list[tuple], chunk: int = 1500) -> int:
    if not rows:
        return 0
    written = 0
    with conn.cursor() as cur:
        for start in range(0, len(rows), chunk):
            cur.executemany(sql, rows[start : start + chunk])
            written = min(start + chunk, len(rows))
            if written == len(rows) or written % 50000 == 0:
                print(f"  {written}/{len(rows)}", flush=True)
                conn.commit()
    return written


def copy_attributes(conn, rows: list[tuple]) -> int:
    cols = (
        "firm_id, source_release_id, source_dataset_id, source_authority_id, "
        "source_record_identifier, item, field_name, regulator_label, reported_yn, "
        "numeric_value, text_value, raw_value, presence_status, public_readiness, "
        "evidence_status, as_of_date, retrieved_at, transform_version, evidence_id, is_current"
    )
    with conn.cursor() as cur:
        with cur.copy(f"COPY form_adv_reported_attributes ({cols}) FROM STDIN") as copy:
            for row in rows:
                (
                    firm_id,
                    release_id,
                    dataset_id,
                    crd,
                    item,
                    field_name,
                    label,
                    yn,
                    numeric_value,
                    text_value,
                    raw_value,
                    presence,
                    readiness,
                    evidence_status,
                    as_of,
                    retrieved,
                    transform,
                    evidence_id,
                ) = row
                copy.write_row(
                    (
                        firm_id,
                        release_id,
                        dataset_id,
                        "sec",
                        crd,
                        item,
                        field_name,
                        label,
                        yn,
                        numeric_value,
                        text_value,
                        raw_value,
                        presence,
                        readiness,
                        evidence_status,
                        as_of,
                        retrieved,
                        transform,
                        evidence_id,
                        True,
                    )
                )
    conn.commit()
    return len(rows)


def main() -> int:
    publish = "--publish" in sys.argv
    conn = connect()
    try:
        pf = preflight(conn)
        print("preflight", json.dumps({k: pf[k] if k != "schema_migrations" else pf[k][-3:] for k in pf}, default=str))
        mismatches = {k: {"expected": EXPECTED[k], "got": pf[k]} for k in EXPECTED if pf[k] != EXPECTED[k]}
        if mismatches:
            print("PREFLIGHT STOP", json.dumps(mismatches))
            return 2
        latest = pf["schema_migrations"][-1] if pf["schema_migrations"] else None
        print("latest_migration", latest)
        rows = load_firms(conn)
        print("loaded_firms", len(rows), flush=True)
        if len(rows) != 23622:
            print("STOP unexpected firm load", len(rows))
            return 3
        crds = [r["crd"] for r in rows]
        if len(set(crds)) != 23622:
            print("STOP CRD mismatch", len(set(crds)))
            return 3
        attr_rows, succ_rows, cik_rows, extra = build(rows)
        confirmed = extra["counters"].get("successor_CONFIRMED", 0)
        review = extra["counters"].get("successor_REVIEW_REQUIRED", 0)
        manifest = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "transform_version": TRANSFORM_VERSION,
            "locked_fingerprint": LOCKED_FINGERPRINT,
            "source_rows": 23622,
            "firm_matches": len(rows),
            "new_firms": 0,
            "attribute_sets": len(rows),
            "attribute_rows": len(attr_rows),
            "indexing_writes": 0,
            "named_schedule_d_entities": 0,
            "people_created": 0,
            "private_funds_created": 0,
            "successor_confirmed": confirmed,
            "successor_review_required": review,
            "cik": {
                "values": extra["counters"].get("cik_values", 0),
                "distinct": extra["counters"].get("cik_distinct", 0),
                "promotable": extra["counters"].get("cik_promotable", 0),
                "collisions": extra["cik_collisions"],
                "malformed": extra["counters"].get("cik_malformed", 0),
                "null": extra["counters"].get("cik_null", 0),
            },
            "yn": extra["yn"],
            "presence": {k: v for k, v in extra["counters"].items() if k.startswith("REPORTED") or k.startswith("NOT_") or k == "UNKNOWN"},
            "publish": publish,
        }
        if confirmed > 1:
            print("STOP more than one confirmed successor")
            return 4
        dest = ROOT / "data" / "reports" / "inv-nat-001b-dry-run.json"
        dest.write_text(json.dumps(manifest, indent=2, default=str), encoding="utf-8")
        print(json.dumps(manifest, indent=2, default=str))
        if not publish:
            print("dry-run only; no writes")
            return 0
        if "0012_form_adv_enrichment.sql" not in pf["schema_migrations"]:
            print("STOP 0012 not applied")
            return 5
        run_id = str(uuid4())
        print("publish", run_id, flush=True)
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM form_adv_reported_attributes")
            existing_attr = int(cur.fetchone()[0])
        if existing_attr == 0:
            print("COPY attributes", len(attr_rows), flush=True)
            copy_attributes(conn, attr_rows)
        else:
            print("UPSERT attributes", len(attr_rows), flush=True)
            write_batches(conn, ATTR_SQL, attr_rows)
        write_batches(conn, SUCC_SQL, succ_rows)
        write_batches(conn, CIK_SQL, cik_rows)
        # hard stop: never touch indexable
        with conn.cursor() as cur:
            cur.execute(
                "SELECT count(*) FROM search_documents WHERE entity_kind='firm' AND is_synthetic=false AND indexable=true"
            )
            idx = int(cur.fetchone()[0])
            if idx != 1000:
                conn.rollback()
                print("ROLLBACK indexable drifted", idx)
                return 6
            cur.execute("SELECT count(*) FROM people")
            if int(cur.fetchone()[0]) != 0:
                conn.rollback()
                print("ROLLBACK people created")
                return 6
            cur.execute("SELECT count(*) FROM products")
            if int(cur.fetchone()[0]) != 0:
                conn.rollback()
                print("ROLLBACK products created")
                return 6
            cur.execute("SELECT count(*) FROM disclosure_events")
            if int(cur.fetchone()[0]) != 0:
                conn.rollback()
                print("ROLLBACK disclosure_events created")
                return 6
            cur.execute("SELECT count(*) FROM form_adv_reported_attributes")
            attr_n = int(cur.fetchone()[0])
            cur.execute("SELECT count(*) FROM form_adv_successor_links")
            succ_n = int(cur.fetchone()[0])
            cur.execute("SELECT count(*) FROM firm_identifiers WHERE identifier_type='cik'")
            cik_n = int(cur.fetchone()[0])
        conn.commit()
        result = {
            "run_id": run_id,
            "attributes": attr_n,
            "successor_links": succ_n,
            "cik_identifiers": cik_n,
            "indexable": 1000,
        }
        (ROOT / "data" / "reports" / "inv-nat-001b-publish.json").write_text(
            json.dumps({**manifest, "result": result}, indent=2, default=str), encoding="utf-8"
        )
        print("PUBLISHED", json.dumps(result))
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
