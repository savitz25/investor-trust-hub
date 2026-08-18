"""Load local operator env files without printing secret values."""

from __future__ import annotations

import os
import socket
from pathlib import Path
from urllib.parse import parse_qsl, quote, unquote, urlencode, urlparse, urlunparse


def find_repo_root(start: Path | None = None) -> Path:
    here = start or Path.cwd()
    for candidate in [here, *here.parents]:
        if (candidate / "database" / "migrations").is_dir() and (candidate / "AGENTS.md").is_file():
            return candidate
    for candidate in Path(__file__).resolve().parents:
        if (candidate / "database" / "migrations").is_dir() and (candidate / "AGENTS.md").is_file():
            return candidate
    return here


def redact_database_url(url: str) -> str:
    parsed = urlparse(url)
    host = parsed.hostname or ""
    user = parsed.username or ""
    dbname = (parsed.path or "").lstrip("/")
    return f"{parsed.scheme}://{user}@{host}:{parsed.port}/{dbname}"


def _ensure_sslmode(url: str) -> str:
    parsed = urlparse(url)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    host = (parsed.hostname or "").lower()
    if "supabase.co" in host or "pooler.supabase.com" in host:
        query.setdefault("sslmode", "require")
    if not query:
        return url
    return urlunparse(parsed._replace(query=urlencode(query)))


def resolve_database_url(url: str, *, pooler_region: str | None = None) -> str:
    """If a Supabase Direct host does not resolve, use session-mode pooler."""
    parsed = urlparse(url)
    host = parsed.hostname or ""
    if not (host.startswith("db.") and host.endswith(".supabase.co")):
        return _ensure_sslmode(url)
    try:
        socket.getaddrinfo(host, parsed.port or 5432, type=socket.SOCK_STREAM)
        return _ensure_sslmode(url)
    except OSError:
        pass
    ref = host.split(".")[1]
    password = parsed.password or ""
    encoded_pw = quote(unquote(password), safe="")
    user = parsed.username or "postgres"
    if "." not in user:
        user = f"{user}.{ref}"
    dbname = (parsed.path or "/postgres").lstrip("/") or "postgres"
    region = pooler_region or os.environ.get("SUPABASE_POOLER_REGION") or "us-east-2"
    return (
        f"postgresql://{user}:{encoded_pw}"
        f"@aws-0-{region}.pooler.supabase.com:5432/{dbname}?sslmode=require"
    )


def load_local_env(root: Path | None = None) -> None:
    root = root or find_repo_root()
    for name in ("env.local", "env.local.txt", ".env.local", ".env"):
        path = root / name
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            text = line.strip()
            if not text or text.startswith("#") or "=" not in text:
                continue
            key, value = text.split("=", 1)
            value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key.strip(), value)
        break
    if not os.environ.get("INGESTION_DATABASE_URL") and os.environ.get("DATABASE_URL"):
        os.environ["INGESTION_DATABASE_URL"] = os.environ["DATABASE_URL"]
    for key in ("DATABASE_URL", "INGESTION_DATABASE_URL"):
        value = os.environ.get(key)
        if value:
            os.environ[key] = resolve_database_url(value)
