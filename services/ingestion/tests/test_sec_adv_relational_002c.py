"""INV-NAT-002C publication regression. Production tests skip until DATABASE_URL is set."""
from __future__ import annotations

import os
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]
WEB_APP = ROOT / "apps" / "web" / "src" / "app"
DOMAIN = ROOT / "packages" / "domain" / "src" / "adv-profile-intelligence.ts"


def test_002c_no_new_public_entity_routes():
    assert not (WEB_APP / "person").exists()
    assert not (WEB_APP / "people").exists()
    assert not (WEB_APP / "owner").exists()
    assert not (WEB_APP / "historical").exists()
    assert (WEB_APP / "fund" / "[slug]").exists()  # Wave 1 route remains; not populated from ADV funds
    assert (WEB_APP / "professional" / "[slug]").exists()
    robots = (WEB_APP / "robots.ts").read_text(encoding="utf-8")
    assert "'/professional/'" in robots
    assert "'/fund/'" in robots
    sitemap = (WEB_APP / "sitemap.ts").read_text(encoding="utf-8")
    assert "/firm/${slug}" in sitemap
    assert "/fund/${" not in sitemap
    assert "/person/" not in sitemap


def test_002c_gate_and_copy_exist():
    text = DOMAIN.read_text(encoding="utf-8")
    assert "export function mayPublishAdvRelationship" in text
    assert "investor-trust-report-v2" in text
    assert "Reported direct owner" in text
    assert "fee-only" in text
    assert "INSERT INTO disclosure_events" not in text


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
    conn.execute("SET statement_timeout = '60s'")
    try:
        yield conn
    finally:
        conn.close()


def test_prod_publication_regression(prod):
    indexable = prod.execute(
        "SELECT count(*) FROM search_documents WHERE entity_kind='firm' AND is_synthetic=false AND indexable=true"
    ).fetchone()[0]
    assert indexable == 1000
    firms = prod.execute("SELECT count(*) FROM firms WHERE is_synthetic=false").fetchone()[0]
    assert firms == 23622
    events = prod.execute("SELECT count(*) FROM disclosure_events").fetchone()[0]
    assert events == 0
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
