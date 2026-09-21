"""EA-INV-002-INDEX static safety tests. No production writes, no DB required."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SCRIPT = ROOT / "services" / "ingestion" / "scripts" / "adv_relational_filing_uuid_indexes.py"
MIGRATION = ROOT / "database" / "migrations" / "0013_adv_relational_graph.sql"
RUNNER = ROOT / "services" / "ingestion" / "scripts" / "apply_migrations.py"

SIX_TABLES = [
    "form_adv_schedule_ab_rows",
    "form_adv_related_person_rows",
    "form_adv_private_fund_rows",
    "form_adv_fund_service_provider_rows",
    "form_adv_other_office_rows",
    "form_adv_relying_adviser_rows",
]


def _src() -> str:
    assert SCRIPT.exists(), "adv_relational_filing_uuid_indexes.py must exist"
    return SCRIPT.read_text(encoding="utf-8")


def _code_only(src: str) -> str:
    """Source with the leading module docstring stripped, so assertions check
    actual code/SQL, not prose that happens to mention a forbidden word."""
    if src.startswith('"""'):
        end = src.index('"""', 3) + 3
        return src[end:]
    return src


def test_audits_exactly_the_six_named_tables():
    src = _src()
    for table in SIX_TABLES:
        assert f'"{table}"' in src, f"{table} must be in the audited TABLES list"


def test_apply_path_uses_autocommit_not_a_shared_transaction():
    src = _src()
    assert "autocommit=True" in src


def test_apply_sets_short_lock_timeout_and_never_statement_timeout():
    src = _code_only(_src())
    assert "SET lock_timeout = '5s'" in src
    assert "statement_timeout" not in src


def test_create_index_is_always_concurrently_and_idempotent():
    src = _code_only(_src())
    for line in src.splitlines():
        stripped = line.strip()
        if stripped.startswith("#"):
            continue
        if "CREATE INDEX" in line:
            assert "CONCURRENTLY" in line, f"non-concurrent CREATE INDEX found: {line!r}"
            assert "IF NOT EXISTS" in line, f"CREATE INDEX must be idempotent: {line!r}"


def test_apply_requires_explicit_production_confirmation_flag():
    src = _src()
    assert "--i-understand-this-touches-production" in src
    assert "args.apply and not args.confirm" in src


def test_check_is_fail_closed_on_invalid_leftover_or_missing_table():
    src = _src()
    assert "BLOCKER_INVALID_LEFTOVER_CONCURRENT_BUILD" in src
    assert "BLOCKER_TABLE_MISSING" in src
    assert "if check_result[\"blockers\"]:" in src


def test_catalog_lookups_are_schema_qualified_to_public():
    src = _src()
    assert "nspname = 'public'" in src
    assert "tn.nspname = 'public'" in src


def test_never_falls_back_to_non_concurrent_create_index_on_failure():
    src = _src()
    # No except/try wrapping the CREATE INDEX CONCURRENTLY call with a second,
    # plain CREATE INDEX as a fallback.
    idx = src.index("CREATE INDEX CONCURRENTLY")
    tail = src[idx : idx + 400]
    assert "except" not in tail.split("\n")[0]
    assert tail.count("CREATE INDEX") == 1


def test_no_new_credentials_requested_when_db_access_is_missing():
    src = _src()
    assert "PENDING_DB_ACCESS" in src
    assert "No credentials were requested" in src
    lowered = src.lower()
    assert "request new" not in lowered
    assert "ask the user for" not in lowered


def test_no_production_writes_reingestion_or_identity_mutation():
    src = _code_only(_src())
    assert not any(
        verb in src
        for verb in ("INSERT INTO", "UPDATE form_adv", "DELETE FROM", "identity_confidence =")
    )
    assert "ingest" not in src.lower()


def test_migration_runner_wraps_all_pending_files_in_one_shared_transaction():
    runner_src = RUNNER.read_text(encoding="utf-8")
    assert "with psycopg.connect(database_url" in runner_src
    assert "conn.commit()" in runner_src
    # No autocommit=True on the standard runner's connection -- confirms why a
    # separate script is required for CREATE INDEX CONCURRENTLY.
    connect_idx = runner_src.index("with psycopg.connect(database_url")
    connect_line = runner_src[connect_idx : connect_idx + 200].splitlines()[0]
    assert "autocommit" not in connect_line


def test_all_six_tables_declare_a_filing_uuid_leading_unique_constraint():
    migration_src = MIGRATION.read_text(encoding="utf-8")
    for table in SIX_TABLES:
        table_start = migration_src.index(f"CREATE TABLE IF NOT EXISTS {table} (")
        table_end = migration_src.index(");", table_start)
        block = migration_src[table_start:table_end]
        assert "UNIQUE (filing_uuid," in block, (
            f"{table} is expected to declare UNIQUE (filing_uuid, ...) -- "
            "if this ever changes, the index audit's assumption must be re-verified."
        )
