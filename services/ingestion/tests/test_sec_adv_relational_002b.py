"""INV-NAT-002B identity/currentness ingest contract tests.

Unit tests always run. Production-ingest tests skip unless DATABASE_URL is
available and Migration 0013 tables are populated.
"""
from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path

import pytest

from ith_ingestion.sec_adv import RELATIONAL_TRANSFORM_VERSION
from ith_ingestion.sec_adv.relational_identity import (
    classify_de_fe_i,
    classify_schedule,
    edge_is_current,
    filing_identity_key,
    firm_identity_confidence,
    fund_identity_confidence,
    historical_firm_publication_allowed,
    named_party_identity_confidence,
    normalize_crd,
    normalize_fund_id,
    owner_identity_confidence,
    parse_submitted,
    source_is_monthly_current_vintage,
    source_row_digest,
)

ROOT = Path(__file__).resolve().parents[3]
INGEST = ROOT / "services" / "ingestion" / "scripts" / "ingest_adv_relational.py"
MIGRATION = ROOT / "database" / "migrations" / "0013_adv_relational_graph.sql"
WEB_APP = ROOT / "apps" / "web" / "src" / "app"


def test_transform_version_locked():
    assert RELATIONAL_TRANSFORM_VERSION == "inv-nat-002b-relational-v1"


def test_crd_stays_canonical():
    assert normalize_crd("18217") == "18217"
    assert firm_identity_confidence("18217") == "CONFIRMED"
    assert firm_identity_confidence("801-30405") == "UNRESOLVED"
    assert firm_identity_confidence("802-123") == "UNRESOLVED"


def test_filing_source_family_preserved():
    a = ("ria", filing_identity_key("1000"))
    b = ("era", filing_identity_key("1000"))
    assert a != b
    text = MIGRATION.read_text(encoding="utf-8")
    assert "UNIQUE (source_dataset_id, dataset_kind, filing_id)" in text
    assert "dataset_kind keeps IA/ERA FilingID overlaps distinct" in text


def test_schedule_a_not_b():
    assert classify_schedule("A") == "A"
    assert classify_schedule("B") == "B"
    assert classify_schedule("A") != classify_schedule("B")


def test_direct_not_indirect():
    assert classify_schedule("A") == "A"
    assert classify_schedule("B") == "B"
    comment = MIGRATION.read_text(encoding="utf-8")
    assert "Schedule A = direct owners" in comment
    assert "Schedule B = indirect owners" in comment


def test_owner_id_is_not_crd():
    conf = owner_identity_confidence(owner_id="2491297", name="JANE DOE", kind="PERSON")
    assert conf == "HIGH_CONFIDENCE"
    assert conf != "CONFIRMED"
    assert classify_de_fe_i("I") == "PERSON"
    ingest = INGEST.read_text(encoding="utf-8")
    owners = ingest.split("def materialize_owners")[1].split("def materialize_funds")[0]
    assert "identifier_type='crd'" not in owners


def test_same_owner_id_preserves_multiple_historical_names():
    d1 = source_row_digest("1", "A", "99", "JANE DOE", "I")
    d2 = source_row_digest("1", "A", "99", "JANE SMITH", "I")
    assert d1 != d2
    ingest = INGEST.read_text(encoding="utf-8")
    assert "ON CONFLICT (filing_uuid, source_row_digest) DO NOTHING" in ingest
    assert "min(full_legal_name)" in ingest


def test_name_only_does_not_global_merge():
    assert owner_identity_confidence(owner_id=None, name="JANE DOE", kind="PERSON") == "REVIEW_REQUIRED"
    assert named_party_identity_confidence(name="ACME LLC", crd=None) == "REVIEW_REQUIRED"
    ingest = INGEST.read_text(encoding="utf-8")
    owners = ingest.split("def materialize_owners")[1].split("def materialize_funds")[0]
    assert "WHERE owner_id IS NOT NULL" in owners
    assert "GROUP BY owner_kind, owner_id" in owners


def test_one_fund_id_is_one_fund_despite_name_history():
    assert normalize_fund_id("805-123") == "805-123"
    assert fund_identity_confidence(fund_id="805-123", fund_name="ALPHA") == "CONFIRMED"
    assert fund_identity_confidence(fund_id="805-123", fund_name="ALPHA LP") == "CONFIRMED"
    ingest = INGEST.read_text(encoding="utf-8")
    funds = ingest.split("def materialize_funds")[1].split("def materialize_historical")[0]
    assert "GROUP BY fund_id" in funds
    assert "adv-fund-" in funds


def test_different_fund_ids_remain_separate_despite_same_name():
    assert normalize_fund_id("805-1") != normalize_fund_id("805-2")
    a = "adv-fund-" + normalize_fund_id("805-1").lower().replace("-", "")
    b = "adv-fund-" + normalize_fund_id("805-2").lower().replace("-", "")
    assert a != b


def test_aggregate_7b_does_not_create_funds():
    ingest = INGEST.read_text(encoding="utf-8")
    assert "IA_Schedule_D_7B1_" in ingest
    assert "Count of Private Funds" not in ingest
    assert "Item7B" not in ingest
    assert fund_identity_confidence(fund_id=None, fund_name=None) == "UNRESOLVED"


def test_advw_is_not_misconduct():
    ingest = INGEST.read_text(encoding="utf-8")
    assert "INSERT INTO disclosure_events" not in ingest
    mig = MIGRATION.read_text(encoding="utf-8")
    assert "not misconduct" in mig.lower()


def test_historical_relationship_not_current():
    assert edge_is_current(
        crd_on_current_roster=True,
        filing_is_latest_for_crd=True,
        source_is_current_snapshot=False,
    ) is False
    dt = parse_submitted("12/26/2024")
    assert source_is_monthly_current_vintage("historical-part1.zip", dt) is False
    assert "is_current BOOLEAN NOT NULL DEFAULT FALSE" in MIGRATION.read_text(encoding="utf-8")
    stamp = INGEST.read_text(encoding="utf-8").split("def stamp_child_currentness")[1].split("def reconcile")[0]
    assert "r.filing_id = f.filing_id" in stamp
    assert "r.filing_uuid = f.id" in stamp
    assert "SET is_current = TRUE" in stamp
    assert "SET is_current = f.is_current" not in stamp


def test_relying_adviser_exact_crd_only():
    assert firm_identity_confidence("12345") == "CONFIRMED"
    assert firm_identity_confidence(None) == "UNRESOLVED"
    assert named_party_identity_confidence(name="RELYING LLC", crd=None) == "REVIEW_REQUIRED"
    ingest = INGEST.read_text(encoding="utf-8")
    relying = ingest.split("def _ingest_relying")[1].split("def _flush_relying")[0]
    assert "normalize_crd" in relying
    assert "firm_identity_confidence(crd)" in relying


def test_no_indexability_writes():
    ingest = INGEST.read_text(encoding="utf-8")
    assert "INSERT INTO search_documents" not in ingest
    assert "UPDATE search_documents" not in ingest
    assert "indexable" in ingest  # read-only reconcile count
    assert "SET indexable" not in ingest


def test_no_new_public_pages():
    ingest = INGEST.read_text(encoding="utf-8")
    assert "publication_allowed" in ingest
    assert "FALSE, FALSE, 'HISTORICAL_NO_ADV_W'" in ingest or "publication_allowed, status" in ingest
    assert historical_firm_publication_allowed(False) is False
    assert not (WEB_APP / "people").exists()
    assert not (WEB_APP / "funds").exists()
    assert not (WEB_APP / "historical").exists()
    firm_routes = list((WEB_APP / "firms").glob("**/*")) if (WEB_APP / "firms").exists() else []
    assert firm_routes  # Wave 1 firm routes remain; no extra entity kinds


def test_deterministic_rerun_digest():
    a = source_row_digest("1", "A", "99", "JANE DOE", "I")
    b = source_row_digest("1", "A", "99", "JANE DOE", "I")
    assert a == b
    assert len(a) == 64


def test_idempotent_upserts_are_on_conflict_do_nothing_or_update():
    ingest = INGEST.read_text(encoding="utf-8")
    assert ingest.count("ON CONFLICT") >= 8
    assert "DO NOTHING" in ingest


def test_currentness_fail_closed_for_2024():
    dt = parse_submitted("12/26/2024")
    assert source_is_monthly_current_vintage("historical-part1.zip", dt) is False
    dt2 = parse_submitted("07/31/2026")
    assert source_is_monthly_current_vintage(
        "iapd-part1-monthly/2026/ADV_Filing_Data_20260701_20260731.zip", dt2
    ) is True


def test_parse_submitted_mixed_formats():
    assert parse_submitted("11/13/2012 01:39:54 PM").date().isoformat() == "2012-11-13"
    assert parse_submitted("2026-07-31").date().isoformat() == "2026-07-31"


def test_name_only_service_provider_is_hold():
    assert named_party_identity_confidence(name="BIG FOUR LLP", crd=None) == "REVIEW_REQUIRED"
    assert named_party_identity_confidence(name="PRIME LLC", crd="123") == "CONFIRMED"


def test_named_fund_without_fund_id_is_hold():
    assert fund_identity_confidence(fund_id=None, fund_name="ALPHA FUND LP") == "REVIEW_REQUIRED"
    ingest = INGEST.read_text(encoding="utf-8")
    funds = ingest.split("def materialize_funds")[1].split("def materialize_historical")[0]
    assert "fund_id ~* '^805-[0-9]+$'" in funds


def test_person_org_firm_stay_distinct():
    assert classify_de_fe_i("I") == "PERSON"
    assert classify_de_fe_i("DE") == "ORGANIZATION"
    assert classify_de_fe_i("FE") == "ORGANIZATION"
    ingest = INGEST.read_text(encoding="utf-8")
    owners = ingest.split("def materialize_owners")[1].split("def materialize_funds")[0]
    assert "INSERT INTO firms" not in owners
    assert "INSERT INTO people" in owners
    assert "owner_kind='PERSON'" in owners


def test_collision_holds_do_not_overwrite_history():
    ingest = INGEST.read_text(encoding="utf-8")
    assert "ON CONFLICT (owner_kind, owner_id) DO NOTHING" in ingest
    assert "ON CONFLICT (slug) DO NOTHING" in ingest
    ab = ingest.split("def _flush_ab")[1].split("def _ingest_related")[0]
    assert "DO NOTHING" in ab


# ---------------------------------------------------------------------------
# Production-ingest tests (read-only). Skip until 002B ingest has materialized.
# ---------------------------------------------------------------------------


def _load_prod_env() -> str | None:
    import sys

    scripts = str(ROOT / "services" / "ingestion" / "scripts")
    if scripts not in sys.path:
        sys.path.insert(0, scripts)
    from load_env import find_repo_root, load_local_env

    load_local_env(find_repo_root(ROOT / "README.md"))
    return os.environ.get("DATABASE_URL")


@pytest.fixture(scope="module")
def prod():
    dsn = _load_prod_env()
    if not dsn:
        pytest.skip("DATABASE_URL not configured")
    import psycopg

    conn = psycopg.connect(dsn, connect_timeout=30)
    conn.execute("SET default_transaction_read_only = on")
    conn.execute("SET statement_timeout = '600s'")
    try:
        schema = [r[0] for r in conn.execute("SELECT filename FROM schema_migrations ORDER BY 1").fetchall()]
        if "0013_adv_relational_graph.sql" not in schema:
            pytest.skip("Migration 0013 not applied")
        filings = conn.execute("SELECT count(*) FROM form_adv_filings").fetchone()[0]
        if int(filings) < 600000:
            pytest.skip("form_adv_filings not fully ingested")
        hist = conn.execute("SELECT count(*) FROM form_adv_historical_firm_candidates").fetchone()[0]
        if int(hist) == 0:
            pytest.skip("INV-NAT-002B ingest not finished (historical candidates empty)")
        yield conn
    finally:
        conn.close()


def test_prod_baseline_unchanged(prod):
    firms = prod.execute("SELECT count(*) FROM firms WHERE is_synthetic=false").fetchone()[0]
    ria = prod.execute(
        "SELECT count(*) FROM registrations WHERE registration_type='registered_investment_adviser' AND is_synthetic=false"
    ).fetchone()[0]
    era = prod.execute(
        "SELECT count(*) FROM registrations WHERE registration_type='exempt_reporting_adviser' AND is_synthetic=false"
    ).fetchone()[0]
    attrs = prod.execute("SELECT count(*) FROM form_adv_reported_attributes").fetchone()[0]
    indexable = prod.execute(
        "SELECT count(*) FROM search_documents WHERE entity_kind='firm' AND is_synthetic=false AND indexable=true"
    ).fetchone()[0]
    assert firms == 23622
    assert ria == 17018
    assert era == 6604
    assert attrs == 5149596
    assert indexable == 1000


def test_prod_crd_canonical_and_source_family(prod):
    bad = prod.execute(
        "SELECT count(*) FROM form_adv_filings WHERE crd LIKE '801-%' OR crd LIKE '802-%'"
    ).fetchone()[0]
    assert bad == 0
    kinds = {r[0] for r in prod.execute("SELECT DISTINCT dataset_kind FROM form_adv_filings").fetchall()}
    assert "ria" in kinds and "era" in kinds
    overlap = prod.execute(
        """
        SELECT count(*) FROM (
            SELECT filing_id FROM form_adv_filings
            WHERE dataset_kind IN ('ria','era')
            GROUP BY filing_id HAVING count(DISTINCT dataset_kind) > 1
        ) x
        """
    ).fetchone()[0]
    assert overlap >= 1624


def test_prod_a_not_b_and_direct_not_indirect(prod):
    a, b = prod.execute(
        "SELECT count(*) FILTER (WHERE schedule='A'), count(*) FILTER (WHERE schedule='B') FROM form_adv_schedule_ab_rows"
    ).fetchone()
    assert a > 0 and b > 0
    assert a != b


def test_prod_owner_id_not_stored_as_crd(prod):
    n = prod.execute(
        """
        SELECT count(*) FROM person_identifiers pi
        JOIN form_adv_owner_entities e ON e.person_id = pi.person_id
        WHERE pi.identifier_type = 'crd' AND pi.identifier_value = e.owner_id
        """
    ).fetchone()[0]
    assert n == 0


def test_prod_same_owner_id_name_history_held(prod):
    collisions = prod.execute(
        """
        SELECT count(*) FROM (
            SELECT owner_id FROM form_adv_schedule_ab_rows
            WHERE owner_id IS NOT NULL AND owner_id <> ''
              AND owner_kind='PERSON' AND full_legal_name IS NOT NULL
            GROUP BY owner_id HAVING count(DISTINCT lower(btrim(full_legal_name))) > 1
        ) x
        """
    ).fetchone()[0]
    assert collisions >= 1000
    people_for_one_owner = prod.execute(
        """
        SELECT count(*) FROM people p
        JOIN form_adv_owner_entities e ON e.person_id = p.id
        WHERE e.owner_kind='PERSON'
        GROUP BY e.owner_id
        HAVING count(*) > 1
        LIMIT 1
        """
    ).fetchone()
    assert people_for_one_owner is None


def test_prod_name_only_not_global_merged(prod):
    name_only_people = prod.execute(
        """
        SELECT count(*) FROM form_adv_schedule_ab_rows
        WHERE (owner_id IS NULL OR owner_id = '')
          AND owner_kind='PERSON'
          AND person_id IS NOT NULL
        """
    ).fetchone()[0]
    assert name_only_people == 0


def test_prod_one_fund_id_one_product(prod):
    split = prod.execute(
        """
        SELECT count(*) FROM (
            SELECT fund_id, count(DISTINCT product_id) n
            FROM form_adv_private_fund_rows
            WHERE fund_id ~* '^805-[0-9]+$' AND product_id IS NOT NULL
            GROUP BY fund_id HAVING count(DISTINCT product_id) > 1
        ) x
        """
    ).fetchone()[0]
    assert split == 0
    name_only_products = prod.execute(
        """
        SELECT count(*) FROM form_adv_private_fund_rows
        WHERE (fund_id IS NULL OR fund_id !~* '^805-[0-9]+$')
          AND product_id IS NOT NULL
        """
    ).fetchone()[0]
    assert name_only_products == 0


def test_prod_different_fund_ids_not_merged(prod):
    merged = prod.execute(
        """
        SELECT count(*) FROM (
            SELECT product_id, count(DISTINCT fund_id) n
            FROM form_adv_private_fund_rows
            WHERE product_id IS NOT NULL AND fund_id ~* '^805-[0-9]+$'
            GROUP BY product_id HAVING count(DISTINCT fund_id) > 1
        ) x
        """
    ).fetchone()[0]
    assert merged == 0


def test_prod_advw_not_misconduct(prod):
    events = prod.execute("SELECT count(*) FROM disclosure_events").fetchone()[0]
    assert events == 0
    advw = prod.execute("SELECT count(*) FROM form_adv_withdrawals").fetchone()[0]
    assert advw > 0


def test_prod_current_vs_historical(prod):
    cur, hist = prod.execute(
        "SELECT count(*) FILTER (WHERE is_current), count(*) FILTER (WHERE NOT is_current) FROM form_adv_filings"
    ).fetchone()
    assert cur > 0
    assert hist > cur
    leaked = prod.execute(
        """
        SELECT count(*) FROM form_adv_schedule_ab_rows r
        JOIN form_adv_filings f ON f.id = r.filing_uuid
        WHERE r.is_current = TRUE AND f.is_current = FALSE
        """
    ).fetchone()[0]
    assert leaked == 0


def test_prod_relying_exact_crd(prod):
    confirmed = prod.execute(
        """
        SELECT count(*) FROM form_adv_relying_adviser_rows
        WHERE relying_crd IS NOT NULL AND identity_confidence='CONFIRMED'
        """
    ).fetchone()[0]
    name_only = prod.execute(
        """
        SELECT count(*) FROM form_adv_relying_adviser_rows
        WHERE (relying_crd IS NULL OR relying_crd = '')
          AND identity_confidence IN ('REVIEW_REQUIRED','UNRESOLVED')
        """
    ).fetchone()[0]
    linked_without_crd = prod.execute(
        """
        SELECT count(*) FROM form_adv_relying_adviser_rows
        WHERE (relying_crd IS NULL OR relying_crd = '') AND relying_firm_id IS NOT NULL
        """
    ).fetchone()[0]
    assert confirmed > 0
    assert name_only >= 0
    assert linked_without_crd == 0


def test_prod_no_indexability_or_public_expansion(prod):
    indexable = prod.execute(
        "SELECT count(*) FROM search_documents WHERE entity_kind='firm' AND is_synthetic=false AND indexable=true"
    ).fetchone()[0]
    assert indexable == 1000
    people_idx = prod.execute(
        "SELECT count(*) FROM search_documents WHERE entity_kind IN ('person','product','people','fund')"
    ).fetchone()[0]
    assert people_idx == 0
    pub_hist = prod.execute(
        "SELECT count(*) FROM form_adv_historical_firm_candidates WHERE publication_allowed=true"
    ).fetchone()[0]
    assert pub_hist == 0
    pub_owners = prod.execute(
        "SELECT count(*) FROM form_adv_owner_entities WHERE publication_allowed=true"
    ).fetchone()[0]
    assert pub_owners == 0
