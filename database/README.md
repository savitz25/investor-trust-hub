# Database

PostgreSQL 15+ (Supabase-compatible). Schema changes are versioned SQL in `migrations/`. Do not rely on ORM auto-sync.

## Apply locally

```bash
createdb investor_trust_hub
psql "$DATABASE_URL" -f database/migrations/0001_extensions.sql
psql "$DATABASE_URL" -f database/migrations/0002_source_registry.sql
psql "$DATABASE_URL" -f database/migrations/0003_ingestion.sql
psql "$DATABASE_URL" -f database/migrations/0004_evidence.sql
psql "$DATABASE_URL" -f database/migrations/0005_canonical_entities.sql
psql "$DATABASE_URL" -f database/migrations/0006_registrations_relationships.sql
psql "$DATABASE_URL" -f database/migrations/0007_filings_disclosures.sql
psql "$DATABASE_URL" -f database/migrations/0008_search.sql
psql "$DATABASE_URL" -f database/migrations/0009_future_user_rls.sql
psql "$DATABASE_URL" -f database/migrations/0010_sec_adv_ingestion.sql
```

Or run `python services/ingestion/scripts/apply_migrations.py` after the ingestion service is installed.

## Seed

Production-safe (source registry + SEC dataset rows only):

```bash
python services/ingestion/scripts/apply_and_seed.py
```

CI / local development may also apply synthetic fixtures:

```bash
psql "$DATABASE_URL" -f database/seed/0001_source_registry.sql
psql "$DATABASE_URL" -f database/seed/0002_synthetic_fixtures.sql
psql "$DATABASE_URL" -f database/seed/0003_sec_adv_datasets.sql
```

Synthetic seed data is **not** real regulatory evidence. Every seeded person, firm, registration, and disclosure is marked `is_synthetic = true`. Do not apply `0002_synthetic_fixtures.sql` to production unless intentionally requested.

## Types

There is no generated ORM client in Task 001. Domain TypeScript types live in `packages/domain`. When a generated client is added later (Supabase CLI or similar), document the regeneration command here.
