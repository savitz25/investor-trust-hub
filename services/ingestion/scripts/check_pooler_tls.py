"""Report whether the configured DATABASE_URL verifies with a public CA.

Does not print the DSN, password, or certificate PEM.
"""

from __future__ import annotations

import os
import ssl
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from load_env import load_local_env  # noqa: E402


def main() -> int:
    load_local_env(ROOT)
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        print("DATABASE_URL missing")
        return 1
    parsed = urlparse(dsn)
    host = parsed.hostname or ""
    port = parsed.port or 5432
    pooler = "pooler.supabase.com" in host or host.endswith("supabase.co")
    report = {
        "endpoint_class": "supabase_session_pooler" if "pooler.supabase.com" in host else "postgres",
        "host_kind": "pooler" if "pooler.supabase.com" in host else ("supabase" if "supabase" in host else "other"),
        "port": port,
        "tls_encrypted": True if pooler or parsed.query.find("sslmode") >= 0 else None,
    }
    try:
        import psycopg

        ctx = ssl.create_default_context()
        try:
            with psycopg.connect(dsn, connect_timeout=15, sslmode="verify-full", sslrootcert="system"):
                report["ca_verification"] = "yes"
                report["verify_full"] = "pass"
        except Exception as exc:  # noqa: BLE001
            report["ca_verification"] = "no"
            report["verify_full"] = "fail"
            report["reason_class"] = type(exc).__name__
            message = str(exc)
            report["reason_observed"] = (
                "certificate verify failed"
                if "certificate" in message.lower()
                else "connection/auth error during verify-full"
            )
            try:
                with psycopg.connect(dsn, connect_timeout=15):
                    report["tls_encrypted"] = True
                    report["unverified_connect"] = "pass"
            except Exception as fallback:  # noqa: BLE001
                report["unverified_connect"] = type(fallback).__name__
        _ = ctx
    except Exception as exc:  # noqa: BLE001
        report["error"] = type(exc).__name__
    print(__import__("json").dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
