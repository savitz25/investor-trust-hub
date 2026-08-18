from urllib.parse import urlparse

from ith_ingestion.env import redact_database_url, resolve_database_url


def test_redact_hides_password() -> None:
    url = "postgresql://postgres:super-secret@db.example.supabase.co:5432/postgres"
    redacted = redact_database_url(url)
    assert "super-secret" not in redacted
    assert "db.example.supabase.co" in redacted


def test_rewrites_unresolvable_direct_host(monkeypatch) -> None:
    def fail(*_args, **_kwargs):
        raise OSError("nope")

    monkeypatch.setattr("ith_ingestion.env.socket.getaddrinfo", fail)
    url = "postgresql://postgres:secret%24@db.abcdefghijklmnop.supabase.co:5432/postgres"
    out = resolve_database_url(url, pooler_region="us-east-2")
    parsed = urlparse(out)
    assert parsed.hostname == "aws-0-us-east-2.pooler.supabase.com"
    assert parsed.username == "postgres.abcdefghijklmnop"
    assert parsed.port == 5432
    assert "sslmode=require" in out
    assert "secret" in (parsed.password or "") or "%24" in out


def test_keeps_resolvable_direct_host(monkeypatch) -> None:
    monkeypatch.setattr(
        "ith_ingestion.env.socket.getaddrinfo",
        lambda *_args, **_kwargs: [(0, 0, 0, "", ("1.2.3.4", 5432))],
    )
    url = "postgresql://postgres:secret@db.abcdefghijklmnop.supabase.co:5432/postgres"
    out = resolve_database_url(url)
    assert "db.abcdefghijklmnop.supabase.co" in out
    assert "sslmode=require" in out


def test_localhost_is_not_rewritten() -> None:
    url = "postgresql://postgres:postgres@localhost:54322/postgres"
    assert resolve_database_url(url) == url
