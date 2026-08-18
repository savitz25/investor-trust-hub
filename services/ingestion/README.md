# InvestorTrustHub ingestion service

Python foundation for future scheduled regulatory-data pipelines.

Task 001 establishes interfaces only. It does **not** ingest SEC, FINRA, IARD, NFA, or EDGAR production datasets.

## Pipeline stages

1. download
2. checksum
3. archive
4. parse
5. validate
6. normalize
7. entity resolution
8. stage
9. transactional publish
10. rollback
11. provenance recording
12. metrics / error reporting

Every run has an identifiable `idempotency_key`. Publishing the same release twice must not duplicate records.

## Commands

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -e ".[dev]"
ruff check src tests scripts
pytest
python scripts/apply_migrations.py
```

## Design rules

- Prefer no match to the wrong match.
- Never silently merge uncertain identities.
- Preserve raw source values.
- BrokerCheck extracts must not become a prospecting database.
- Synthetic fixtures stay labeled synthetic.
