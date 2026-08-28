"""Complete INV-NAT-002B remaining phases after child graph load.

Safe to run after materialize_funds has committed (products > 0).
Re-runnable: historical ON CONFLICT, stamp is fail-closed SET TRUE, finish_run updates.
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from load_env import find_repo_root, load_local_env

SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from ingest_adv_relational import (  # noqa: E402
    TRANSFORM,
    Db,
    finish_run,
    materialize_funds,
    materialize_historical_candidates,
    reconcile,
    stamp_child_currentness,
)


def main() -> int:
    root = find_repo_root(Path(__file__).resolve())
    load_local_env(root)
    db = Db(os.environ["DATABASE_URL"])
    conn = db
    try:
        funds = int(conn.execute("SELECT count(*) FROM products WHERE product_kind='private_fund'").fetchone()[0])
        hist = int(conn.execute("SELECT count(*) FROM form_adv_historical_firm_candidates").fetchone()[0])
        print("pre funds", funds, "hist", hist, flush=True)
        if funds == 0:
            print("PHASE fund materialize (resume)", flush=True)
            metrics_funds = materialize_funds(conn)
            print("funds", metrics_funds, flush=True)
        else:
            metrics_funds = {"canonical_funds": funds}
        if hist == 0:
            print("PHASE historical candidates", flush=True)
            metrics_hist = materialize_historical_candidates(conn)
            print("hist", metrics_hist, flush=True)
        else:
            metrics_hist = {"already": hist}
        print("PHASE stamp child currentness", flush=True)
        stamp_child_currentness(conn)
        metrics = {
            "run_id": "e083373e-3d99-487b-8a3d-179ab6a3ccf8",
            "transform_version": TRANSFORM,
            "finished_via": "finish_adv_relational_002b",
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "funds": metrics_funds,
            "historical_candidates": metrics_hist,
            "reconcile": reconcile(conn),
        }
        finish_run(conn, metrics["run_id"], metrics, "published")
        out = root / "data" / "reports" / "inv-nat-002b-publish.json"
        out.write_text(json.dumps(metrics, indent=2, default=str), encoding="utf-8")
        print("wrote", out, flush=True)
        print("reconcile", json.dumps(metrics["reconcile"], indent=2), flush=True)
        return 0
    except Exception as exc:
        print("FAILED", type(exc).__name__, exc, flush=True)
        raise
    finally:
        try:
            db.close()
        except Exception:
            pass


if __name__ == "__main__":
    raise SystemExit(main())
