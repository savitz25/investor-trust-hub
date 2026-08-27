"""INV-NAT-002B controlled Form ADV relational ingest. Idempotent batches."""
from __future__ import annotations

import csv
import io
import json
import os
import sys
import uuid
import zipfile
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Iterator

SCRIPTS = Path(__file__).resolve().parent
SRC = SCRIPTS.parent / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from load_env import find_repo_root, load_local_env  # noqa: E402
from ith_ingestion.sec_adv import RELATIONAL_TRANSFORM_VERSION  # noqa: E402
from ith_ingestion.sec_adv.relational_identity import (  # noqa: E402
    classify_de_fe_i,
    classify_schedule,
    firm_identity_confidence,
    fund_identity_confidence,
    named_party_identity_confidence,
    normalize_crd,
    normalize_fund_id,
    normalize_name,
    office_source_key,
    owner_identity_confidence,
    parse_submitted,
    source_row_digest,
)

TRANSFORM = RELATIONAL_TRANSFORM_VERSION
DS_PART1 = "sec_ia_adv_part1_relational"
DS_ADVW = "sec_ia_adv_w"
DS_CRS = "sec_ia_form_crs"
DS_P2A = "sec_ia_adv_part2a"
BATCH = 25000


def connect(dsn: str):
    import psycopg

    conn = psycopg.connect(dsn, connect_timeout=30, keepalives=1, keepalives_idle=30)
    conn.execute("SET statement_timeout = 0")
    conn.execute("SET idle_in_transaction_session_timeout = 0")
    return conn


def colmap(header: list[str]) -> dict[str, int]:
    return {h.strip(): i for i, h in enumerate(header)}


def idx(cmap: dict[str, int], *names: str) -> int | None:
    for n in names:
        if n in cmap:
            return cmap[n]
    lower = {k.lower(): v for k, v in cmap.items()}
    for n in names:
        if n.lower() in lower:
            return lower[n.lower()]
    return None


def get(row: list[str], i: int | None) -> str:
    if i is None or i >= len(row):
        return ""
    return (row[i] or "").strip()


def open_csv(zf: zipfile.ZipFile, name: str):
    fh = zf.open(name)
    wrap = io.TextIOWrapper(fh, encoding="utf-8-sig", errors="replace", newline="")
    return csv.reader(wrap), fh, wrap


def find_member(zf: zipfile.ZipFile, token: str) -> str | None:
    token_l = token.lower()
    hits = [n for n in zf.namelist() if n.lower().endswith(".csv") and token_l in n.lower().replace("\\", "/")]
    if not hits:
        return None
    hits.sort(key=len)
    return hits[0]


def iter_csv(zf: zipfile.ZipFile, token: str) -> Iterator[tuple[list[str], dict[str, int]]]:
    name = find_member(zf, token)
    if not name:
        return
    reader, fh, wrap = open_csv(zf, name)
    try:
        header = next(reader)
        cmap = colmap(header)
        yield header, cmap
        for row in reader:
            yield row, cmap
    finally:
        wrap.close()
        fh.close()


def copy_insert(conn, stg: str, columns: list[str], dest_sql: str, rows: list[tuple], label: str) -> int:
    if not rows:
        return 0
    cols = ", ".join(columns)
    with conn.cursor() as cur:
        cur.execute(f"TRUNCATE {stg}")
        with cur.copy(f"COPY {stg} ({cols}) FROM STDIN") as copy:
            for row in rows:
                copy.write_row(row)
        cur.execute(dest_sql)
        n = cur.rowcount if cur.rowcount and cur.rowcount > 0 else len(rows)
    conn.commit()
    print(f"    {label}: {len(rows):,} staged / {n:,} upserted", flush=True)
    return len(rows)


def chunks(items: list, size: int) -> Iterable[list]:
    for i in range(0, len(items), size):
        yield items[i : i + size]


def ensure_staging(conn) -> None:
    conn.execute(
        """
        CREATE UNLOGGED TABLE IF NOT EXISTS stg_adv_filings (
            filing_id text, crd text, sec_file_number text, dataset_kind text,
            form_version text, date_submitted date, filing_types text,
            legal_name text, business_name text, source_dataset_id text,
            source_release_id uuid, source_file_name text, identity_confidence text,
            transform_version text, observed_from date
        );
        CREATE UNLOGGED TABLE IF NOT EXISTS stg_adv_ab (
            dataset_kind text, filing_id text, schedule text, owner_kind text,
            de_fe_i text, full_legal_name text, owner_id text, entity_in_which text,
            title_or_status text, status_acquired text, ownership_code text,
            control_person text, public_reporting text, sch_a_3 text,
            identity_confidence text, source_row_digest text, observed_from date
        );
        CREATE UNLOGGED TABLE IF NOT EXISTS stg_adv_rel (
            dataset_kind text, filing_id text, reference_id text, legal_name text,
            business_name text, related_crd text, related_sec_number text,
            related_cik text, related_type text, identity_confidence text,
            source_row_digest text, observed_from date
        );
        CREATE UNLOGGED TABLE IF NOT EXISTS stg_adv_funds (
            dataset_kind text, filing_id text, reference_id text, fund_name text,
            fund_id text, state text, country text, exclusion_3c1 text,
            exclusion_3c7 text, master_fund text, feeder_fund text,
            master_fund_name text, master_fund_id text, identity_confidence text,
            source_row_digest text, observed_from date
        );
        CREATE UNLOGGED TABLE IF NOT EXISTS stg_adv_sp (
            dataset_kind text, filing_id text, fund_reference_id text, provider_role text,
            source_table text, provider_name text, provider_crd text,
            provider_sec_number text, provider_lei text, city text, region text,
            country text, related_person_flag text, identity_confidence text,
            source_row_digest text, observed_from date
        );
        CREATE UNLOGGED TABLE IF NOT EXISTS stg_adv_offices (
            dataset_kind text, filing_id text, street_1 text, street_2 text, city text,
            region text, postal_code text, country text, branch_number text,
            private_residence text, telephone_number text, employees text,
            source_office_key text, identity_confidence text, observed_from date
        );
        CREATE UNLOGGED TABLE IF NOT EXISTS stg_adv_relying (
            dataset_kind text, filing_id text, reference_id text, legal_name text,
            business_name text, relying_crd text, identity_confidence text,
            source_row_digest text, observed_from date
        );
        CREATE UNLOGGED TABLE IF NOT EXISTS stg_adv_w (
            filing_id text, crd text, sec_file_number text, form_type text,
            filing_type text, filing_date date, legal_name text, business_name text,
            source_dataset_id text, source_release_id uuid, identity_confidence text,
            transform_version text
        );
        CREATE UNLOGGED TABLE IF NOT EXISTS stg_adv_docs (
            document_kind text, official_document_id text, official_file_name text,
            filing_id text, crd text, submitted_on date, source_url text,
            source_dataset_id text, source_release_id uuid, identity_confidence text,
            mapped boolean, transform_version text
        );
        """
    )
    conn.commit()


def upsert_release(conn, dataset_id: str, label: str, checksum: str, uri: str, raw_bytes: int, notes: str) -> str:
    row = conn.execute(
        """
        INSERT INTO source_releases (source_dataset_id, release_label, checksum_sha256, archive_uri, raw_bytes, notes)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (source_dataset_id, release_label) DO UPDATE SET
            checksum_sha256 = EXCLUDED.checksum_sha256,
            archive_uri = EXCLUDED.archive_uri,
            raw_bytes = EXCLUDED.raw_bytes,
            notes = EXCLUDED.notes
        RETURNING id::text
        """,
        (dataset_id, label, checksum, uri, raw_bytes, notes),
    ).fetchone()
    conn.commit()
    return row[0]


def start_run(conn, release_id: str, key: str) -> str:
    run_id = str(uuid.uuid4())
    conn.execute(
        """
        INSERT INTO ingestion_runs (
            id, source_release_id, pipeline_name, pipeline_version, transform_version,
            status, idempotency_key, started_at
        ) VALUES (%s, %s, 'inv-nat-002b-relational', '1.0.0', %s, 'publishing', %s, now())
        ON CONFLICT (idempotency_key) DO UPDATE SET
            status = 'publishing', started_at = now(), error_summary = NULL
        RETURNING id
        """,
        (run_id, release_id, TRANSFORM, key),
    )
    conn.commit()
    row = conn.execute("SELECT id::text FROM ingestion_runs WHERE idempotency_key=%s", (key,)).fetchone()
    return row[0]


def finish_run(conn, run_id: str, metrics: dict, status: str = "published") -> None:
    conn.execute(
        """
        UPDATE ingestion_runs
        SET status=%s, finished_at=now(), metrics=%s
        WHERE id=%s
        """,
        (status, json.dumps(metrics), run_id),
    )
    conn.commit()


def load_firm_crds(conn) -> dict[str, str]:
    rows = conn.execute(
        "SELECT identifier_value, firm_id::text FROM firm_identifiers WHERE identifier_type='crd'"
    ).fetchall()
    out = {}
    for value, firm_id in rows:
        crd = normalize_crd(value)
        if crd:
            out[crd] = firm_id
    return out


def ingest_filings_from_zip(conn, zpath: Path, release_id: str, firm_crds: dict[str, str], counts: dict) -> None:
    rel = str(zpath.as_posix())
    with zipfile.ZipFile(zpath) as zf:
        types: dict[str, list[str]] = {}
        tname = find_member(zf, "ADV_Filing_Types")
        if tname:
            it = iter_csv(zf, "ADV_Filing_Types")
            header, cmap = next(it)
            flags = [h for h in cmap if h not in {"FilingID", "Filing ID", "Annual Updating Amendment Fiscal Year"}]
            i_fid = idx(cmap, "FilingID", "Filing ID")
            for row, cm in it:
                if row is header:
                    continue
                fid = get(row, i_fid)
                yes = [f for f in flags if get(row, cm[f]).upper() in {"Y", "YES"}]
                if fid:
                    types[fid] = yes
        for token, kind in (("IA_ADV_Base_A_", "ria"), ("ERA_ADV_Base_", "era")):
            it = iter_csv(zf, token)
            first = next(it, None)
            if not first:
                print(f"  skip missing {token} in {zpath.name}", flush=True)
                continue
            header, cmap = first
            i_fid = idx(cmap, "FilingID", "Filing ID")
            i_ver = idx(cmap, "FormVersion")
            i_dt = idx(cmap, "DateSubmitted")
            i_crd = idx(cmap, "1E1")
            i_sec = idx(cmap, "1D")
            i_legal = idx(cmap, "1A")
            i_bus = idx(cmap, "1B1")
            batch: list[tuple] = []
            n = 0
            for row, cm in it:
                if row is header:
                    continue
                fid = get(row, i_fid)
                if not fid:
                    counts["filings_blank_id"] += 1
                    continue
                crd = normalize_crd(get(row, i_crd))
                dt = parse_submitted(get(row, i_dt))
                d = dt.date() if dt else None
                conf = firm_identity_confidence(crd)
                batch.append(
                    (
                        fid,
                        crd or None,
                        get(row, i_sec) or None,
                        kind,
                        get(row, i_ver) or None,
                        d,
                        ",".join(types.get(fid, [])),
                        get(row, i_legal) or None,
                        get(row, i_bus) or None,
                        DS_PART1,
                        release_id,
                        rel,
                        conf,
                        TRANSFORM,
                        d,
                    )
                )
                n += 1
                if len(batch) >= BATCH:
                    _flush_filings(conn, batch, firm_crds)
                    counts["filings"] += len(batch)
                    counts[f"filings_{kind}"] += len(batch)
                    batch = []
            if batch:
                _flush_filings(conn, batch, firm_crds)
                counts["filings"] += len(batch)
                counts[f"filings_{kind}"] += len(batch)
            print(f"  filings {kind} {zpath.name}: {n:,}", flush=True)


def _flush_filings(conn, batch: list[tuple], firm_crds: dict[str, str]) -> None:
    sql = f"""
        INSERT INTO form_adv_filings (
            filing_id, crd, sec_file_number, dataset_kind, form_version, date_submitted,
            filing_types, legal_name, business_name, source_dataset_id, source_release_id,
            source_file_name, identity_confidence, firm_id, is_current, observed_from,
            transform_version
        )
        SELECT s.filing_id, s.crd, s.sec_file_number, s.dataset_kind, s.form_version,
               s.date_submitted, string_to_array(NULLIF(s.filing_types,''), ','),
               s.legal_name, s.business_name, s.source_dataset_id, s.source_release_id,
               s.source_file_name, s.identity_confidence,
               fi.firm_id, FALSE, s.observed_from, s.transform_version
        FROM stg_adv_filings s
        LEFT JOIN firm_identifiers fi
          ON fi.identifier_type='crd' AND fi.identifier_value = s.crd
        ON CONFLICT (source_dataset_id, dataset_kind, filing_id) DO UPDATE SET
            crd = EXCLUDED.crd,
            sec_file_number = EXCLUDED.sec_file_number,
            form_version = EXCLUDED.form_version,
            date_submitted = EXCLUDED.date_submitted,
            filing_types = EXCLUDED.filing_types,
            legal_name = EXCLUDED.legal_name,
            business_name = EXCLUDED.business_name,
            source_release_id = EXCLUDED.source_release_id,
            source_file_name = EXCLUDED.source_file_name,
            identity_confidence = EXCLUDED.identity_confidence,
            firm_id = EXCLUDED.firm_id,
            observed_from = EXCLUDED.observed_from,
            transform_version = EXCLUDED.transform_version,
            updated_at = now()
    """
    cols = [
        "filing_id", "crd", "sec_file_number", "dataset_kind", "form_version", "date_submitted",
        "filing_types", "legal_name", "business_name", "source_dataset_id", "source_release_id",
        "source_file_name", "identity_confidence", "transform_version", "observed_from",
    ]
    copy_insert(conn, "stg_adv_filings", cols, sql, batch, "filings")


def apply_currentness(conn) -> dict:
    conn.execute("UPDATE form_adv_filings SET is_current=FALSE WHERE is_current=TRUE")
    conn.execute(
        """
        WITH ranked AS (
            SELECT id, crd, date_submitted, source_file_name,
                   row_number() OVER (
                       PARTITION BY crd
                       ORDER BY date_submitted DESC NULLS LAST, filing_id DESC
                   ) AS rn
            FROM form_adv_filings
            WHERE crd IS NOT NULL AND dataset_kind IN ('ria','era')
        )
        UPDATE form_adv_filings f
        SET is_current = TRUE, updated_at = now()
        FROM ranked r
        WHERE f.id = r.id
          AND r.rn = 1
          AND f.firm_id IS NOT NULL
          AND f.date_submitted >= DATE '2025-01-01'
          AND (f.source_file_name LIKE '%iapd-part1-monthly%'
               OR f.source_file_name LIKE '%ADV_Filing_Data_202%')
          AND NOT EXISTS (
              SELECT 1 FROM form_adv_withdrawals w
              WHERE w.crd = f.crd
                AND upper(coalesce(w.filing_type,'')) = 'FULL'
                AND w.filing_date IS NOT NULL
                AND w.filing_date > f.date_submitted
          )
        """
    )
    conn.commit()
    cur = conn.execute(
        """
        SELECT is_current, count(*) FROM form_adv_filings GROUP BY 1
        """
    ).fetchall()
    return {str(k): int(v) for k, v in cur}


def filing_lookup(conn) -> None:
    conn.execute(
        """
        CREATE UNLOGGED TABLE IF NOT EXISTS stg_adv_filing_lookup (
            dataset_kind text NOT NULL,
            filing_id text NOT NULL,
            filing_uuid uuid NOT NULL,
            PRIMARY KEY (dataset_kind, filing_id)
        )
        """
    )
    conn.execute("TRUNCATE stg_adv_filing_lookup")
    conn.execute(
        """
        INSERT INTO stg_adv_filing_lookup (dataset_kind, filing_id, filing_uuid)
        SELECT dataset_kind, filing_id, id FROM form_adv_filings
        """
    )
    conn.commit()


def ingest_child_zip(conn, zpath: Path, counts: dict) -> None:
    with zipfile.ZipFile(zpath) as zf:
        _ingest_ab(conn, zf, counts)
        _ingest_related(conn, zf, counts)
        _ingest_funds(conn, zf, counts)
        _ingest_sp(conn, zf, counts)
        _ingest_offices(conn, zf, counts)
        _ingest_relying(conn, zf, counts)


def _ingest_ab(conn, zf, counts):
    for token, kind in (("IA_Schedule_A_B_", "ria"), ("ERA_Schedule_A_B_", "era")):
        it = iter_csv(zf, token)
        first = next(it, None)
        if not first:
            continue
        header, cmap = first
        i_fid = idx(cmap, "FilingID")
        i_sch = idx(cmap, "Schedule")
        i_name = idx(cmap, "Full Legal Name")
        i_kind = idx(cmap, "DE/FE/I")
        i_oid = idx(cmap, "OwnerID", "Owner ID")
        i_ent = idx(cmap, "Entity in Which")
        i_title = idx(cmap, "Title or Status")
        i_acq = idx(cmap, "Status Acquired")
        i_own = idx(cmap, "Ownership Code")
        i_ctrl = idx(cmap, "Control Person")
        i_pr = idx(cmap, "PR")
        i_s3 = idx(cmap, "SchA-3")
        batch = []
        for row, cm in it:
            if row is header:
                continue
            sch = classify_schedule(get(row, i_sch))
            if sch not in {"A", "B"}:
                counts["ab_unclassified"] += 1
                continue
            fid = get(row, i_fid)
            name = get(row, i_name)
            de = get(row, i_kind)
            okind = classify_de_fe_i(de)
            oid = get(row, i_oid)
            conf = owner_identity_confidence(owner_id=oid, name=name, kind=okind)
            digest = source_row_digest(fid, sch, oid, name, de, get(row, i_title), get(row, i_own), get(row, i_ctrl))
            batch.append(
                (
                    kind, fid, sch, okind, de or None, name or None, oid or None,
                    get(row, i_ent) or None, get(row, i_title) or None, get(row, i_acq) or None,
                    get(row, i_own) or None, get(row, i_ctrl) or None, get(row, i_pr) or None,
                    get(row, i_s3) or None, conf, digest, None,
                )
            )
            if sch == "A":
                counts["ab_a"] += 1
            else:
                counts["ab_b"] += 1
            if len(batch) >= BATCH:
                _flush_ab(conn, batch)
                batch = []
        if batch:
            _flush_ab(conn, batch)
        print(f"  A/B {kind} done", flush=True)


def _flush_ab(conn, batch):
    sql = """
        INSERT INTO form_adv_schedule_ab_rows (
            filing_uuid, filing_id, schedule, owner_kind, de_fe_i, full_legal_name,
            owner_id, entity_in_which, title_or_status, status_acquired, ownership_code,
            control_person, public_reporting, sch_a_3, identity_confidence, is_current,
            observed_from, source_row_digest, transform_version
        )
        SELECT l.filing_uuid, s.filing_id, s.schedule, s.owner_kind, s.de_fe_i, s.full_legal_name,
               s.owner_id, s.entity_in_which, s.title_or_status, s.status_acquired, s.ownership_code,
               s.control_person, s.public_reporting, s.sch_a_3, s.identity_confidence, FALSE,
               f.date_submitted, s.source_row_digest, %s
        FROM stg_adv_ab s
        JOIN stg_adv_filing_lookup l ON l.dataset_kind=s.dataset_kind AND l.filing_id=s.filing_id
        JOIN form_adv_filings f ON f.id=l.filing_uuid
        ON CONFLICT (filing_uuid, source_row_digest) DO NOTHING
    """
    cols = [
        "dataset_kind", "filing_id", "schedule", "owner_kind", "de_fe_i", "full_legal_name",
        "owner_id", "entity_in_which", "title_or_status", "status_acquired", "ownership_code",
        "control_person", "public_reporting", "sch_a_3", "identity_confidence",
        "source_row_digest", "observed_from",
    ]
    # bind transform into SQL
    sql = sql.replace("%s", "'" + TRANSFORM + "'")
    copy_insert(conn, "stg_adv_ab", cols, sql, batch, "ab")


def _ingest_related(conn, zf, counts):
    for token, kind in (("IA_Schedule_D_7A_", "ria"), ("ERA_Schedule_D_7A_", "era")):
        # shortest match avoids 7A_CIK and 7A10b
        it = iter_csv(zf, token)
        first = next(it, None)
        if not first:
            continue
        header, cmap = first
        if "Legal Name" not in cmap:
            continue
        i_fid = idx(cmap, "FilingID")
        i_ref = idx(cmap, "ReferenceID", "Reference ID")
        i_legal = idx(cmap, "Legal Name")
        i_bus = idx(cmap, "Business Name")
        i_crd = idx(cmap, "CRD Number")
        i_sec = idx(cmap, "SEC Number or Other", "SEC Number")
        i_type = idx(cmap, "Type")
        batch = []
        n = 0
        for row, cm in it:
            if row is header:
                continue
            fid = get(row, i_fid)
            name = get(row, i_legal)
            crd = normalize_crd(get(row, i_crd))
            sec = get(row, i_sec)
            conf = named_party_identity_confidence(name=name, crd=crd, sec_number=sec)
            digest = source_row_digest(fid, get(row, i_ref), name, crd, sec)
            batch.append(
                (
                    kind, fid, get(row, i_ref) or None, name or None, get(row, i_bus) or None,
                    crd or None, sec or None, None, get(row, i_type) or None, conf, digest, None,
                )
            )
            n += 1
            if len(batch) >= BATCH:
                _flush_related(conn, batch)
                batch = []
        if batch:
            _flush_related(conn, batch)
        counts["related"] += n
        print(f"  related {kind}: {n:,}", flush=True)


def _flush_related(conn, batch):
    sql = f"""
        INSERT INTO form_adv_related_person_rows (
            filing_uuid, filing_id, reference_id, legal_name, business_name, related_crd,
            related_sec_number, related_cik, related_type, identity_confidence,
            related_firm_id, is_current, observed_from, source_row_digest, transform_version
        )
        SELECT l.filing_uuid, s.filing_id, s.reference_id, s.legal_name, s.business_name, s.related_crd,
               s.related_sec_number, s.related_cik, s.related_type, s.identity_confidence,
               fi.firm_id, FALSE, f.date_submitted, s.source_row_digest, '{TRANSFORM}'
        FROM stg_adv_rel s
        JOIN stg_adv_filing_lookup l ON l.dataset_kind=s.dataset_kind AND l.filing_id=s.filing_id
        JOIN form_adv_filings f ON f.id=l.filing_uuid
        LEFT JOIN firm_identifiers fi ON fi.identifier_type='crd' AND fi.identifier_value=s.related_crd
        ON CONFLICT (filing_uuid, source_row_digest) DO NOTHING
    """
    cols = [
        "dataset_kind", "filing_id", "reference_id", "legal_name", "business_name", "related_crd",
        "related_sec_number", "related_cik", "related_type", "identity_confidence",
        "source_row_digest", "observed_from",
    ]
    copy_insert(conn, "stg_adv_rel", cols, sql, batch, "related")


def _ingest_funds(conn, zf, counts):
    for token, kind in (("IA_Schedule_D_7B1_", "ria"), ("ERA_Schedule_D_7B1_", "era")):
        it = iter_csv(zf, token)
        first = next(it, None)
        if not first:
            continue
        header, cmap = first
        if "Fund Name" not in cmap:
            continue
        i_fid = idx(cmap, "FilingID")
        i_name = idx(cmap, "Fund Name")
        i_id = idx(cmap, "Fund ID")
        i_ref = idx(cmap, "ReferenceID", "Reference ID")
        i_st = idx(cmap, "State")
        i_cty = idx(cmap, "Country")
        i_c1 = idx(cmap, "3(c)(1) Exclusion")
        i_c7 = idx(cmap, "3(c)(7) Exclusion")
        i_m = idx(cmap, "Master Fund")
        i_f = idx(cmap, "Feeder Fund")
        i_mn = idx(cmap, "Master Fund Name")
        i_mi = idx(cmap, "Master Fund ID")
        batch = []
        n = 0
        for row, cm in it:
            if row is header:
                continue
            fid = get(row, i_fid)
            name = get(row, i_name)
            fund_id = normalize_fund_id(get(row, i_id))
            conf = fund_identity_confidence(fund_id=fund_id, fund_name=name)
            digest = source_row_digest(fid, get(row, i_ref), fund_id, name)
            batch.append(
                (
                    kind, fid, get(row, i_ref) or None, name or None, fund_id or None,
                    get(row, i_st) or None, get(row, i_cty) or None, get(row, i_c1) or None,
                    get(row, i_c7) or None, get(row, i_m) or None, get(row, i_f) or None,
                    get(row, i_mn) or None, get(row, i_mi) or None, conf, digest, None,
                )
            )
            n += 1
            if len(batch) >= BATCH:
                _flush_funds(conn, batch)
                batch = []
        if batch:
            _flush_funds(conn, batch)
        counts["funds"] += n
        print(f"  funds {kind}: {n:,}", flush=True)


def _flush_funds(conn, batch):
    sql = f"""
        INSERT INTO form_adv_private_fund_rows (
            filing_uuid, filing_id, reference_id, fund_name, fund_id, state, country,
            exclusion_3c1, exclusion_3c7, master_fund, feeder_fund, master_fund_name,
            master_fund_id, identity_confidence, is_current, observed_from,
            source_row_digest, transform_version
        )
        SELECT l.filing_uuid, s.filing_id, s.reference_id, s.fund_name, s.fund_id, s.state, s.country,
               s.exclusion_3c1, s.exclusion_3c7, s.master_fund, s.feeder_fund, s.master_fund_name,
               s.master_fund_id, s.identity_confidence, FALSE, f.date_submitted,
               s.source_row_digest, '{TRANSFORM}'
        FROM stg_adv_funds s
        JOIN stg_adv_filing_lookup l ON l.dataset_kind=s.dataset_kind AND l.filing_id=s.filing_id
        JOIN form_adv_filings f ON f.id=l.filing_uuid
        ON CONFLICT (filing_uuid, source_row_digest) DO NOTHING
    """
    cols = [
        "dataset_kind", "filing_id", "reference_id", "fund_name", "fund_id", "state", "country",
        "exclusion_3c1", "exclusion_3c7", "master_fund", "feeder_fund", "master_fund_name",
        "master_fund_id", "identity_confidence", "source_row_digest", "observed_from",
    ]
    copy_insert(conn, "stg_adv_funds", cols, sql, batch, "funds")


SP_SPECS = [
    ("IA_Schedule_D_7B1A23_", "ria", "auditor", "Name of Auditing Firm", None, None),
    ("ERA_Schedule_D_7B1A23_", "era", "auditor", "Name of Auditing Firm", None, None),
    ("IA_Schedule_D_7B1A24_", "ria", "prime_broker", "Name of Prime Broker", "CRD Number", "SEC Number"),
    ("ERA_Schedule_D_7B1A24_", "era", "prime_broker", "Name of Prime Broker", "CRD Number", "SEC Number"),
    ("IA_Schedule_D_7B1A25_", "ria", "custodian", "Legal Name of Custodian", None, "SEC Number"),
    ("ERA_Schedule_D_7B1A25_", "era", "custodian", "Legal Name of Custodian", None, "SEC Number"),
    ("IA_Schedule_D_7B1A26_", "ria", "administrator", "Name of Administrator", None, None),
    ("ERA_Schedule_D_7B1A26_", "era", "administrator", "Name of Administrator", None, None),
    ("IA_Schedule_D_7B1A28_", "ria", "marketer", "Name of Marketer", "CRD Number", "SEC Number"),
    ("ERA_Schedule_D_7B1A28_", "era", "marketer", "Name of Marketer", "CRD Number", "SEC Number"),
    ("IA_Schedule_D_7B1A3a_", "ria", "general_partner_or_manager", "Name of Partner, etc.", None, None),
    ("ERA_Schedule_D_7B1A3a_", "era", "general_partner_or_manager", "Name of Partner, etc.", None, None),
]


def _ingest_sp(conn, zf, counts):
    for token, kind, role, name_col, crd_col, sec_col in SP_SPECS:
        it = iter_csv(zf, token)
        first = next(it, None)
        if not first:
            continue
        header, cmap = first
        if name_col not in cmap:
            continue
        if "website" in (find_member(zf, token) or "").lower() and role == "marketer":
            # websites table matched; skip if no marketer name
            if "Name of Marketer" not in cmap:
                continue
        i_fid = idx(cmap, "FilingID")
        i_ref = idx(cmap, "ReferenceID", "Reference ID")
        i_name = idx(cmap, name_col)
        i_crd = idx(cmap, crd_col) if crd_col else None
        i_sec = idx(cmap, sec_col) if sec_col else None
        i_lei = idx(cmap, "Legal Entity Identifier")
        i_city = idx(cmap, "City")
        i_st = idx(cmap, "State")
        i_cty = idx(cmap, "Country")
        i_rel = idx(cmap, "Related Person")
        batch = []
        n = 0
        for row, cm in it:
            if row is header:
                continue
            fid = get(row, i_fid)
            name = get(row, i_name)
            crd = normalize_crd(get(row, i_crd)) if i_crd is not None else ""
            sec = get(row, i_sec) if i_sec is not None else ""
            lei = get(row, i_lei)
            conf = named_party_identity_confidence(name=name, crd=crd, sec_number=sec, lei=lei)
            digest = source_row_digest(fid, get(row, i_ref), role, name, crd, sec, lei)
            batch.append(
                (
                    kind, fid, get(row, i_ref) or None, role, token, name or None, crd or None,
                    sec or None, lei or None, get(row, i_city) or None, get(row, i_st) or None,
                    get(row, i_cty) or None, get(row, i_rel) or None, conf, digest, None,
                )
            )
            n += 1
            counts[f"sp_{role}"] += 1
            if len(batch) >= BATCH:
                _flush_sp(conn, batch)
                batch = []
        if batch:
            _flush_sp(conn, batch)
        print(f"  sp {role} {kind}: {n:,}", flush=True)


def _flush_sp(conn, batch):
    sql = f"""
        INSERT INTO form_adv_fund_service_provider_rows (
            filing_uuid, filing_id, fund_reference_id, provider_role, source_table,
            provider_name, provider_crd, provider_sec_number, provider_lei, city, region,
            country, related_person_flag, identity_confidence, related_firm_id, is_current,
            observed_from, source_row_digest, transform_version
        )
        SELECT l.filing_uuid, s.filing_id, s.fund_reference_id, s.provider_role, s.source_table,
               s.provider_name, s.provider_crd, s.provider_sec_number, s.provider_lei, s.city, s.region,
               s.country, s.related_person_flag, s.identity_confidence, fi.firm_id, FALSE,
               f.date_submitted, s.source_row_digest, '{TRANSFORM}'
        FROM stg_adv_sp s
        JOIN stg_adv_filing_lookup l ON l.dataset_kind=s.dataset_kind AND l.filing_id=s.filing_id
        JOIN form_adv_filings f ON f.id=l.filing_uuid
        LEFT JOIN firm_identifiers fi ON fi.identifier_type='crd' AND fi.identifier_value=s.provider_crd
        ON CONFLICT (filing_uuid, source_row_digest) DO NOTHING
    """
    cols = [
        "dataset_kind", "filing_id", "fund_reference_id", "provider_role", "source_table",
        "provider_name", "provider_crd", "provider_sec_number", "provider_lei", "city", "region",
        "country", "related_person_flag", "identity_confidence", "source_row_digest", "observed_from",
    ]
    copy_insert(conn, "stg_adv_sp", cols, sql, batch, "sp")


def _ingest_offices(conn, zf, counts):
    for token, kind in (("IA_Schedule_D_1F_", "ria"), ("ERA_Schedule_D_1F_", "era")):
        it = iter_csv(zf, token)
        first = next(it, None)
        if not first:
            continue
        header, cmap = first
        i_fid = idx(cmap, "FilingID")
        i_s1 = idx(cmap, "Street 1")
        i_s2 = idx(cmap, "Street 2")
        i_city = idx(cmap, "City")
        i_st = idx(cmap, "State")
        i_pc = idx(cmap, "Postal Code")
        i_cty = idx(cmap, "Country")
        i_br = idx(cmap, "Branch Number")
        i_priv = idx(cmap, "Private Residence")
        i_tel = idx(cmap, "Telephone Number")
        i_emp = idx(cmap, "Employees")
        batch = []
        n = 0
        for row, cm in it:
            if row is header:
                continue
            fid = get(row, i_fid)
            br = get(row, i_br)
            key = office_source_key(
                street_1=get(row, i_s1), city=get(row, i_city), region=get(row, i_st),
                postal_code=get(row, i_pc), country=get(row, i_cty), branch_number=br,
            )
            conf = "HIGH_CONFIDENCE" if br else "REVIEW_REQUIRED"
            batch.append(
                (
                    kind, fid, get(row, i_s1) or None, get(row, i_s2) or None, get(row, i_city) or None,
                    get(row, i_st) or None, get(row, i_pc) or None, get(row, i_cty) or None,
                    br or None, get(row, i_priv) or None, get(row, i_tel) or None,
                    get(row, i_emp) or None, key, conf, None,
                )
            )
            n += 1
            if len(batch) >= BATCH:
                _flush_offices(conn, batch)
                batch = []
        if batch:
            _flush_offices(conn, batch)
        counts["offices"] += n
        print(f"  offices {kind}: {n:,}", flush=True)


def _flush_offices(conn, batch):
    sql = f"""
        INSERT INTO form_adv_other_office_rows (
            filing_uuid, filing_id, street_1, street_2, city, region, postal_code, country,
            branch_number, private_residence, telephone_number, employees, source_office_key,
            identity_confidence, is_current, observed_from, transform_version
        )
        SELECT l.filing_uuid, s.filing_id, s.street_1, s.street_2, s.city, s.region, s.postal_code, s.country,
               s.branch_number, s.private_residence, s.telephone_number, s.employees, s.source_office_key,
               s.identity_confidence, FALSE, f.date_submitted, '{TRANSFORM}'
        FROM stg_adv_offices s
        JOIN stg_adv_filing_lookup l ON l.dataset_kind=s.dataset_kind AND l.filing_id=s.filing_id
        JOIN form_adv_filings f ON f.id=l.filing_uuid
        ON CONFLICT (filing_uuid, source_office_key) DO NOTHING
    """
    cols = [
        "dataset_kind", "filing_id", "street_1", "street_2", "city", "region", "postal_code",
        "country", "branch_number", "private_residence", "telephone_number", "employees",
        "source_office_key", "identity_confidence", "observed_from",
    ]
    copy_insert(conn, "stg_adv_offices", cols, sql, batch, "offices")


def _ingest_relying(conn, zf, counts):
    it = iter_csv(zf, "IA_Firm_Download_SCH_R_")
    first = next(it, None)
    if not first:
        return
    header, cmap = first
    i_fid = idx(cmap, "Filing ID", "FilingID")
    i_bus = idx(cmap, "Relying Advisor Business Name")
    i_legal = idx(cmap, "Relying Advisor Legal Name")
    i_crd = idx(cmap, "Relying Advisor CRD Number")
    i_ref = idx(cmap, "Reference ID", "ReferenceID")
    batch = []
    n = 0
    for row, cm in it:
        if row is header:
            continue
        fid = get(row, i_fid)
        crd = normalize_crd(get(row, i_crd))
        name = get(row, i_legal) or get(row, i_bus)
        conf = firm_identity_confidence(crd) if crd else ("REVIEW_REQUIRED" if name else "UNRESOLVED")
        digest = source_row_digest(fid, get(row, i_ref), crd, name)
        batch.append(
            (
                "ria", fid, get(row, i_ref) or None, get(row, i_legal) or None,
                get(row, i_bus) or None, crd or None, conf, digest, None,
            )
        )
        n += 1
        if len(batch) >= BATCH:
            _flush_relying(conn, batch)
            batch = []
    if batch:
        _flush_relying(conn, batch)
    counts["relying"] += n
    print(f"  relying: {n:,}", flush=True)


def _flush_relying(conn, batch):
    sql = f"""
        INSERT INTO form_adv_relying_adviser_rows (
            filing_uuid, filing_id, reference_id, legal_name, business_name, relying_crd,
            identity_confidence, relying_firm_id, is_current, observed_from,
            source_row_digest, transform_version
        )
        SELECT l.filing_uuid, s.filing_id, s.reference_id, s.legal_name, s.business_name, s.relying_crd,
               s.identity_confidence, fi.firm_id, FALSE, f.date_submitted,
               s.source_row_digest, '{TRANSFORM}'
        FROM stg_adv_relying s
        JOIN stg_adv_filing_lookup l ON l.dataset_kind=s.dataset_kind AND l.filing_id=s.filing_id
        JOIN form_adv_filings f ON f.id=l.filing_uuid
        LEFT JOIN firm_identifiers fi ON fi.identifier_type='crd' AND fi.identifier_value=s.relying_crd
        ON CONFLICT (filing_uuid, source_row_digest) DO NOTHING
    """
    cols = [
        "dataset_kind", "filing_id", "reference_id", "legal_name", "business_name",
        "relying_crd", "identity_confidence", "source_row_digest", "observed_from",
    ]
    copy_insert(conn, "stg_adv_relying", cols, sql, batch, "relying")


def ingest_advw(conn, zpath: Path, release_id: str, counts: dict) -> None:
    with zipfile.ZipFile(zpath) as zf:
        name = find_member(zf, "ADVW_")
        if not name:
            return
        # prefer primary ADVW_ not W1/W2
        names = [n for n in zf.namelist() if n.lower().endswith(".csv") and "advw_" in n.lower().replace("\\", "/")]
        primary = [n for n in names if "w1" not in n.lower() and "w2" not in Path(n).name.lower()]
        target = primary[0] if primary else names[0]
        reader, fh, wrap = open_csv(zf, target)
        try:
            header = next(reader)
            cmap = colmap(header)
            i_fid = idx(cmap, "Filing ID", "FilingID")
            i_crd = idx(cmap, "CRD Number")
            i_sec = idx(cmap, "SEC File Number")
            i_ft = idx(cmap, "Form Type")
            i_flt = idx(cmap, "Filing Type")
            i_dt = idx(cmap, "Filing Date")
            i_legal = idx(cmap, "Full Legal Name")
            i_bus = idx(cmap, "Primary Business Name")
            batch = []
            n = 0
            for row in reader:
                fid = get(row, i_fid)
                crd = normalize_crd(get(row, i_crd))
                dt = parse_submitted(get(row, i_dt))
                conf = firm_identity_confidence(crd)
                batch.append(
                    (
                        fid, crd or None, get(row, i_sec) or None, get(row, i_ft) or None,
                        get(row, i_flt) or None, dt.date() if dt else None, get(row, i_legal) or None,
                        get(row, i_bus) or None, DS_ADVW, release_id, conf, TRANSFORM,
                    )
                )
                n += 1
                if len(batch) >= BATCH:
                    _flush_advw(conn, batch)
                    batch = []
            if batch:
                _flush_advw(conn, batch)
            counts["advw"] += n
            print(f"  ADV-W {zpath.name}: {n:,}", flush=True)
        finally:
            wrap.close()
            fh.close()


def _flush_advw(conn, batch):
    sql = f"""
        INSERT INTO form_adv_withdrawals (
            filing_id, crd, sec_file_number, form_type, filing_type, filing_date,
            legal_name, business_name, source_dataset_id, source_release_id,
            identity_confidence, firm_id, is_current, transform_version
        )
        SELECT s.filing_id, s.crd, s.sec_file_number, s.form_type, s.filing_type, s.filing_date,
               s.legal_name, s.business_name, s.source_dataset_id, s.source_release_id,
               s.identity_confidence, fi.firm_id, FALSE, s.transform_version
        FROM stg_adv_w s
        LEFT JOIN firm_identifiers fi ON fi.identifier_type='crd' AND fi.identifier_value=s.crd
        ON CONFLICT (source_dataset_id, filing_id) DO UPDATE SET
            crd=EXCLUDED.crd, filing_type=EXCLUDED.filing_type, filing_date=EXCLUDED.filing_date,
            firm_id=EXCLUDED.firm_id, identity_confidence=EXCLUDED.identity_confidence
    """
    cols = [
        "filing_id", "crd", "sec_file_number", "form_type", "filing_type", "filing_date",
        "legal_name", "business_name", "source_dataset_id", "source_release_id",
        "identity_confidence", "transform_version",
    ]
    copy_insert(conn, "stg_adv_w", cols, sql, batch, "advw")


def ingest_crs(conn, zpath: Path, release_id: str, counts: dict) -> None:
    with zipfile.ZipFile(zpath) as zf:
        name = next((n for n in zf.namelist() if n.lower().endswith(".csv")), None)
        if not name:
            return
        reader, fh, wrap = open_csv(zf, name)
        try:
            header = next(reader)
            cmap = colmap(header)
            i_fid = idx(cmap, "FLNG_ID")
            i_crd = idx(cmap, "FIRM_CRD_NB")
            i_crs = idx(cmap, "CRS_ID")
            i_file = idx(cmap, "CRS_FILE")
            i_dt = idx(cmap, "SBMTD_DT")
            batch = []
            n = 0
            for row in reader:
                crd = normalize_crd(get(row, i_crd))
                crs = get(row, i_crs)
                dt = parse_submitted(get(row, i_dt))
                conf = "CONFIRMED" if crd and crs else "REVIEW_REQUIRED"
                batch.append(
                    (
                        "form_crs", crs or None, get(row, i_file) or None, get(row, i_fid) or None,
                        crd or None, dt.date() if dt else None, None, DS_CRS, release_id,
                        conf, bool(crd), TRANSFORM,
                    )
                )
                n += 1
                if len(batch) >= BATCH:
                    _flush_docs(conn, batch)
                    batch = []
            if batch:
                _flush_docs(conn, batch)
            counts["crs"] += n
            print(f"  CRS {zpath.name}: {n:,}", flush=True)
        finally:
            wrap.close()
            fh.close()


def _flush_docs(conn, batch):
    sql = f"""
        INSERT INTO form_adv_documents (
            document_kind, official_document_id, official_file_name, filing_id, crd,
            submitted_on, source_url, source_dataset_id, source_release_id,
            identity_confidence, firm_id, mapped, is_current, transform_version
        )
        SELECT s.document_kind, s.official_document_id, s.official_file_name, s.filing_id, s.crd,
               s.submitted_on, s.source_url, s.source_dataset_id, s.source_release_id,
               s.identity_confidence, fi.firm_id, s.mapped, FALSE, s.transform_version
        FROM stg_adv_docs s
        LEFT JOIN firm_identifiers fi ON fi.identifier_type='crd' AND fi.identifier_value=s.crd
        ON CONFLICT (idemp_key)
        DO UPDATE SET submitted_on=EXCLUDED.submitted_on, firm_id=EXCLUDED.firm_id, mapped=EXCLUDED.mapped
    """
    cols = [
        "document_kind", "official_document_id", "official_file_name", "filing_id", "crd",
        "submitted_on", "source_url", "source_dataset_id", "source_release_id",
        "identity_confidence", "mapped", "transform_version",
    ]
    copy_insert(conn, "stg_adv_docs", cols, sql, batch, "docs")


def ingest_part2a_catalog(conn, root: Path, release_id: str, counts: dict) -> None:
    path = root / "data" / "reports" / "inv-nat-002-iapd-manifests.json"
    if not path.exists():
        print("  no Part 2A metadata", flush=True)
        return
    foia = json.loads(path.read_text(encoding="utf-8"))["foia_metadata"]["json"]
    batch = []
    n = 0
    for year, payload in (foia.get("advBrochures") or {}).items():
        if not str(year).isdigit():
            continue
        for meta in payload.get("files") or []:
            fn = meta.get("fileName")
            url = f"https://reports.adviserinfo.sec.gov/reports/foia/advBrochures/{year}/{fn}"
            batch.append(
                (
                    "part2a_brochure", None, fn, None, None, None, url, DS_P2A, release_id,
                    "REVIEW_REQUIRED", False, TRANSFORM,
                )
            )
            n += 1
    if batch:
        _flush_docs(conn, batch)
    counts["part2a"] += n
    print(f"  Part 2A catalog: {n:,}", flush=True)


def materialize_owners(conn) -> dict:
    conn.execute(
        """
        INSERT INTO form_adv_owner_entities (owner_kind, owner_id, display_name, identity_confidence, publication_allowed)
        SELECT owner_kind, owner_id, min(full_legal_name), 'HIGH_CONFIDENCE', FALSE
        FROM form_adv_schedule_ab_rows
        WHERE owner_id IS NOT NULL AND owner_id <> ''
          AND owner_kind IN ('PERSON','ORGANIZATION')
          AND full_legal_name IS NOT NULL AND full_legal_name <> ''
        GROUP BY owner_kind, owner_id
        ON CONFLICT (owner_kind, owner_id) DO NOTHING
        """
    )
    conn.execute(
        """
        INSERT INTO people (slug, display_name, professional_kinds, is_synthetic)
        SELECT 'iard-owner-person-' || e.owner_id, e.display_name, '{}'::text[], FALSE
        FROM form_adv_owner_entities e
        WHERE e.owner_kind='PERSON' AND e.person_id IS NULL
        ON CONFLICT (slug) DO NOTHING
        """
    )
    conn.execute(
        """
        UPDATE form_adv_owner_entities e
        SET person_id = p.id, updated_at=now()
        FROM people p
        WHERE e.owner_kind='PERSON'
          AND p.slug = 'iard-owner-person-' || e.owner_id
          AND e.person_id IS NULL
        """
    )
    conn.execute(
        """
        UPDATE form_adv_schedule_ab_rows r
        SET owner_entity_id = e.id,
            person_id = e.person_id
        FROM form_adv_owner_entities e
        WHERE r.owner_id = e.owner_id AND r.owner_kind = e.owner_kind
          AND r.owner_entity_id IS NULL
        """
    )
    conn.commit()
    people_n = conn.execute("SELECT count(*) FROM people WHERE slug LIKE 'iard-owner-person-%'").fetchone()[0]
    ents = conn.execute(
        "SELECT owner_kind, count(*) FROM form_adv_owner_entities GROUP BY 1"
    ).fetchall()
    return {"people": int(people_n), "entities": {k: int(v) for k, v in ents}}


def materialize_funds(conn) -> dict:
    conn.execute(
        """
        INSERT INTO products (slug, name, product_kind, is_synthetic)
        SELECT 'adv-fund-' || lower(replace(fund_id,'-','')),
               min(fund_name),
               'private_fund',
               FALSE
        FROM form_adv_private_fund_rows
        WHERE fund_id ~* '^805-[0-9]+$'
          AND fund_name IS NOT NULL AND fund_name <> ''
        GROUP BY fund_id
        ON CONFLICT (slug) DO NOTHING
        """
    )
    conn.execute(
        """
        INSERT INTO product_identifiers (product_id, identifier_type, identifier_value, issuing_authority_id, is_primary)
        SELECT p.id, 'other', 'ADV-PF-' || upper(replace(r.fund_id, '-', '')), 'sec', TRUE
        FROM form_adv_private_fund_rows r
        JOIN products p ON p.slug = 'adv-fund-' || lower(replace(r.fund_id,'-',''))
        WHERE r.fund_id ~* '^805-[0-9]+$'
        ON CONFLICT (identifier_type, identifier_value) DO NOTHING
        """
    )
    conn.execute(
        """
        UPDATE form_adv_private_fund_rows r
        SET product_id = p.id
        FROM products p
        WHERE r.product_id IS NULL
          AND p.product_kind='private_fund'
          AND p.slug = 'adv-fund-' || lower(replace(r.fund_id,'-',''))
        """
    )
    conn.commit()
    n = conn.execute("SELECT count(*) FROM products WHERE product_kind='private_fund'").fetchone()[0]
    return {"canonical_funds": int(n)}


def materialize_historical_candidates(conn) -> dict:
    conn.execute(
        """
        INSERT INTO form_adv_historical_firm_candidates (
            crd, legal_name, sec_file_number, first_seen_filing_id, first_seen_on,
            last_seen_filing_id, last_seen_on, on_current_roster, publication_allowed, status
        )
        SELECT f.crd,
               (ARRAY_AGG(f.legal_name ORDER BY f.date_submitted DESC NULLS LAST))[1],
               (ARRAY_AGG(f.sec_file_number ORDER BY f.date_submitted DESC NULLS LAST))[1],
               (ARRAY_AGG(f.filing_id ORDER BY f.date_submitted ASC NULLS LAST))[1],
               min(f.date_submitted),
               (ARRAY_AGG(f.filing_id ORDER BY f.date_submitted DESC NULLS LAST))[1],
               max(f.date_submitted),
               FALSE, FALSE, 'HISTORICAL_NO_ADV_W'
        FROM form_adv_filings f
        WHERE f.crd IS NOT NULL
          AND f.firm_id IS NULL
        GROUP BY f.crd
        ON CONFLICT (crd) DO UPDATE SET
            legal_name=EXCLUDED.legal_name,
            last_seen_filing_id=EXCLUDED.last_seen_filing_id,
            last_seen_on=EXCLUDED.last_seen_on
        """
    )
    conn.execute(
        """
        UPDATE form_adv_historical_firm_candidates c
        SET advw_filing_id = w.filing_id,
            advw_filed_on = w.filing_date,
            advw_filing_type = w.filing_type,
            status = CASE
                WHEN upper(coalesce(w.filing_type,'')) IN ('FULL','PARTIAL') THEN 'HISTORICAL_WITH_ADV_W'
                ELSE c.status
            END
        FROM (
            SELECT DISTINCT ON (crd) crd, filing_id, filing_date, filing_type
            FROM form_adv_withdrawals
            WHERE crd IS NOT NULL
            ORDER BY crd, filing_date DESC NULLS LAST
        ) w
        WHERE c.crd = w.crd
        """
    )
    conn.commit()
    rows = conn.execute(
        "SELECT status, count(*) FROM form_adv_historical_firm_candidates GROUP BY 1"
    ).fetchall()
    return {k: int(v) for k, v in rows}


def stamp_child_currentness(conn) -> None:
    for table in (
        "form_adv_schedule_ab_rows",
        "form_adv_related_person_rows",
        "form_adv_private_fund_rows",
        "form_adv_fund_service_provider_rows",
        "form_adv_other_office_rows",
        "form_adv_relying_adviser_rows",
    ):
        conn.execute(
            f"""
            UPDATE {table} r
            SET is_current = f.is_current
            FROM form_adv_filings f
            WHERE r.filing_uuid = f.id
              AND r.is_current IS DISTINCT FROM f.is_current
            """
        )
        print(f"  stamped currentness {table}", flush=True)
    conn.commit()


def reconcile(conn) -> dict:
    q = {}
    checks = {
        "firms": "SELECT count(*) FROM firms WHERE is_synthetic=false",
        "ria": "SELECT count(*) FROM registrations WHERE registration_type='registered_investment_adviser' AND is_synthetic=false",
        "era": "SELECT count(*) FROM registrations WHERE registration_type='exempt_reporting_adviser' AND is_synthetic=false",
        "attributes": "SELECT count(*) FROM form_adv_reported_attributes",
        "indexable": "SELECT count(*) FROM search_documents WHERE entity_kind='firm' AND is_synthetic=false AND indexable=true",
        "people": "SELECT count(*) FROM people",
        "products": "SELECT count(*) FROM products",
        "disclosure_events": "SELECT count(*) FROM disclosure_events",
        "filings": "SELECT count(*) FROM form_adv_filings",
        "filings_ria": "SELECT count(*) FROM form_adv_filings WHERE dataset_kind='ria'",
        "filings_era": "SELECT count(*) FROM form_adv_filings WHERE dataset_kind='era'",
        "filings_current": "SELECT count(*) FROM form_adv_filings WHERE is_current=true",
        "ab_a": "SELECT count(*) FROM form_adv_schedule_ab_rows WHERE schedule='A'",
        "ab_b": "SELECT count(*) FROM form_adv_schedule_ab_rows WHERE schedule='B'",
        "owner_entities": "SELECT count(*) FROM form_adv_owner_entities",
        "related": "SELECT count(*) FROM form_adv_related_person_rows",
        "funds": "SELECT count(*) FROM form_adv_private_fund_rows",
        "sp": "SELECT count(*) FROM form_adv_fund_service_provider_rows",
        "offices": "SELECT count(*) FROM form_adv_other_office_rows",
        "relying": "SELECT count(*) FROM form_adv_relying_adviser_rows",
        "advw": "SELECT count(*) FROM form_adv_withdrawals",
        "docs": "SELECT count(*) FROM form_adv_documents",
        "historical_candidates": "SELECT count(*) FROM form_adv_historical_firm_candidates",
    }
    for k, sql in checks.items():
        q[k] = int(conn.execute(sql).fetchone()[0])
    q["schema"] = [r[0] for r in conn.execute("SELECT filename FROM schema_migrations ORDER BY 1").fetchall()]
    return q


def default_counts() -> dict:
    return {
        "filings": 0, "filings_ria": 0, "filings_era": 0, "filings_blank_id": 0,
        "ab_a": 0, "ab_b": 0, "ab_unclassified": 0, "related": 0, "funds": 0,
        "offices": 0, "relying": 0, "advw": 0, "crs": 0, "part2a": 0,
        "sp_auditor": 0, "sp_prime_broker": 0, "sp_custodian": 0,
        "sp_administrator": 0, "sp_marketer": 0, "sp_general_partner_or_manager": 0,
    }


def main() -> int:
    root = find_repo_root(Path(__file__).resolve())
    load_local_env(root)
    dsn = os.environ["DATABASE_URL"]
    raw = root / "data" / "raw" / "sec" / "form-adv"
    publish = "--publish" in sys.argv
    print("TRANSFORM", TRANSFORM, "publish", publish, flush=True)
    if not publish:
        print("dry-run: parser/identity only; pass --publish to write")
        return 0
    conn = connect(dsn)
    ensure_staging(conn)
    man = json.loads((root / "data" / "reports" / "inv-nat-002-source-manifest.json").read_text(encoding="utf-8"))
    manifest_fp = source_row_digest(*(f["sha256"] for f in man["files"]))
    part1 = raw / "historical-part1-20111105-20241231" / "adv-filing-data-20111105-20241231-part1.zip"
    part2 = raw / "historical-part1-20111105-20241231" / "adv-filing-data-20111105-20241231-part2.zip"
    release_id = upsert_release(
        conn, DS_PART1, "inv-nat-002b-relational-2026-08-27", manifest_fp,
        "data/reports/inv-nat-002-source-manifest.json", 0, "INV-NAT-002B controlled relational ingest",
    )
    run_id = start_run(conn, release_id, f"inv-nat-002b-{manifest_fp[:16]}")
    print("run_id", run_id, "release", release_id, flush=True)
    counts = default_counts()
    metrics: dict[str, Any] = {"run_id": run_id, "transform_version": TRANSFORM, "manifest_fingerprint": manifest_fp}
    try:
        firm_crds = load_firm_crds(conn)
        print("roster crds", len(firm_crds), flush=True)
        print("PHASE filings", flush=True)
        r1 = upsert_release(conn, DS_PART1, "historical-part1-20111105-20241231-part1",
                            "f5f00ad7c9fd8cd61b830e45e4c059993ff20d58762aba7c149fd9d273a27e13",
                            str(part1), part1.stat().st_size, "historical part1")
        ingest_filings_from_zip(conn, part1, r1, firm_crds, counts)
        for z in sorted((raw / "iapd-part1-monthly").rglob("ADV_Filing_Data_*.zip")):
            rel = upsert_release(conn, DS_PART1, z.stem, "", str(z), z.stat().st_size, "monthly part1")
            ingest_filings_from_zip(conn, z, rel, firm_crds, counts)
        print("PHASE ADV-W", flush=True)
        advw = raw / "adv-w-20001019-20241231" / "advw-20001019-20241231.zip"
        rw = upsert_release(conn, DS_ADVW, "advw-20001019-20241231",
                            "fbc7ce895da441761c77ea39cfc28fbec7d4f3be322f60878ac9a34d58a730f5",
                            str(advw), advw.stat().st_size, "historical ADV-W")
        ingest_advw(conn, advw, rw, counts)
        for z in sorted((raw / "iapd-advw-monthly").rglob("ADVW_*.zip")):
            rel = upsert_release(conn, DS_ADVW, z.stem, "", str(z), z.stat().st_size, "monthly ADV-W")
            ingest_advw(conn, z, rel, counts)
        print("PHASE currentness filings", flush=True)
        metrics["filing_currentness"] = apply_currentness(conn)
        filing_lookup(conn)
        print("PHASE children historical part1", flush=True)
        ingest_child_zip(conn, part1, counts)
        print("PHASE children historical part2", flush=True)
        ingest_child_zip(conn, part2, counts)
        for z in sorted((raw / "iapd-part1-monthly").rglob("ADV_Filing_Data_*.zip")):
            print("PHASE children", z.name, flush=True)
            ingest_child_zip(conn, z, counts)
        print("PHASE CRS", flush=True)
        rcrs = upsert_release(conn, DS_CRS, "crs-mapping-2025-2026", "", "iapd-crs-mapping", 0, "CRS mappings")
        for z in sorted((raw / "iapd-crs-mapping").rglob("*.zip")):
            ingest_crs(conn, z, rcrs, counts)
        print("PHASE Part 2A catalog", flush=True)
        rp2 = upsert_release(conn, DS_P2A, "part2a-iapd-metadata-2025-2026", "", "iapd-manifests", 0, "brochure archives catalog")
        ingest_part2a_catalog(conn, root, rp2, counts)
        print("PHASE owner/fund materialize", flush=True)
        metrics["owners"] = materialize_owners(conn)
        metrics["funds"] = materialize_funds(conn)
        print("PHASE historical candidates", flush=True)
        metrics["historical_candidates"] = materialize_historical_candidates(conn)
        print("PHASE stamp child currentness", flush=True)
        stamp_child_currentness(conn)
        metrics["ingest_counts"] = counts
        metrics["reconcile"] = reconcile(conn)
        finish_run(conn, run_id, metrics, "published")
        out = root / "data" / "reports" / "inv-nat-002b-publish.json"
        out.write_text(json.dumps(metrics, indent=2, default=str), encoding="utf-8")
        print("wrote", out)
        print("reconcile", json.dumps(metrics["reconcile"], indent=2))
        return 0
    except Exception as exc:
        finish_run(conn, run_id, {"error": str(exc), "ingest_counts": counts}, "failed")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
