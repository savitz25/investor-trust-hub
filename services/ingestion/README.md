# InvestorTrustHub ingestion service

Python foundation for scheduled regulatory-data pipelines.

Task 002 implements SEC IARD registered-adviser and exempt-reporting-adviser **firm** ingest. It does **not** ingest BrokerCheck or individual professionals.

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
python -m ith_ingestion sec-adv discover
python -m ith_ingestion sec-adv ingest --latest --dry-run
python -m ith_ingestion nj-bos discover
python -m ith_ingestion nj-bos dry-run
python -m ith_ingestion nj-intel inspect
```

NJ-INV-002 (`nj-intel`) is internal-only state intelligence: exam topics, filing classes, policy observations, and coverage. See [`docs/nj-inv-002-production-runbook.md`](../../docs/nj-inv-002-production-runbook.md). The public New Jersey page stays off.

NJ-INV-001 (`nj-bos`) is internal-only Bureau of Securities enforcement ingest. See [`docs/nj-inv-001-production-runbook.md`](../../docs/nj-inv-001-production-runbook.md). Raw PDFs are gitignored. First corpus is baseline-only and must not emit historical alerts.

Production publish is an operator action. See [`docs/task-002-1-production-publish.md`](../../docs/task-002-1-production-publish.md). CI uses fixture CSVs only and must not receive a production `DATABASE_URL`.

## Design rules

- Prefer no match to the wrong match.
- Never silently merge uncertain identities.
- Preserve raw source values.
- BrokerCheck extracts must not become a prospecting database.
- Synthetic fixtures stay labeled synthetic.
