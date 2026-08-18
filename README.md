# InvestorTrustHub

**Research before you invest.**

InvestorTrustHub is an independent consumer research and decision-intelligence platform for researching investment professionals, investment firms, fees, retirement decisions, funds, and eventually investment products.

It will sit in the [AskTrustHub](https://www.asktrusthub.com) network.

> We organize the evidence. The consumer decides.

This repository is an independent research platform. It does not give financial advice, rank advisors, or pick investments.

## Current milestone

**Task 003 — Production Firm Trust Reports and national firm search**

Official SEC adviser firms are searchable at `/firms` and readable at `/firm/sec-crd-{CRD}`. Pages become indexable only after a deterministic content gate. BrokerCheck and individual professionals are not included yet.

- Monorepo with Next.js App Router, TypeScript strict mode, Tailwind CSS
- Domain models for people, firms, products, issuers, registrations, evidence
- PostgreSQL / Supabase-compatible schema with provenance and temporal hooks
- Python ingestion service interfaces (download → publish, idempotent)
- Product shell and Trust Report design system
- Labeled synthetic development fixtures
- Tests and GitHub Actions CI
- Official SEC RIA + ERA firm ingest (discover → dry-run → publish), CRD identity, provenance, quarantine

## What this is not

- A stock-picking service
- An investment recommendation engine
- An advisor lead-generation marketplace
- A ranking / pay-to-play directory
- A brokerage or robo-advisor
- A financial-advice service
- A generic finance blog

## Repository layout

```text
/apps/web                 Next.js App Router product
/packages/domain          Typed domain models, identifiers, fixtures
/packages/config          Source registry, routes, env, brand, copy
/packages/ui              Trust Report design system
/services/ingestion       Python pipeline foundation
/database/migrations      Versioned PostgreSQL schema
/database/seed            Source registry + synthetic fixtures
/docs                     Architecture and product documentation
/.github/workflows        CI
```

Domain logic does not live in React components. Regulatory interpretation, source mappings, and future calculations belong in `packages/domain` or `services/ingestion`.

## Local setup

### Requirements

- Node.js 20+ (22 LTS recommended)
- Python 3.11+
- PostgreSQL 15+ (optional for the web shell; required to apply migrations)

### Web application

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js development server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript across workspaces |
| `npm run lint` | ESLint for the web app |
| `npm test` | Vitest (domain, config, web) |
| `npm run ci` | typecheck + lint + test + build |

### SEC ADV ingest

```bash
python -m ith_ingestion sec-adv discover
python -m ith_ingestion sec-adv ingest --latest --dry-run
python -m ith_ingestion sec-adv ingest --latest --publish
```

Production publish is an operator action. It must not run in CI. Prefer archived official CSVs if the SEC catalog HTML returns 403.

```bash
python services/ingestion/scripts/check_database.py
python services/ingestion/scripts/apply_and_seed.py
python -m ith_ingestion sec-adv ingest --ria-csv <ria.csv> --era-csv <era.csv> --release-label 2026-08-03 --dry-run
python -m ith_ingestion sec-adv ingest --ria-csv <ria.csv> --era-csv <era.csv> --release-label 2026-08-03 --publish
python services/ingestion/scripts/production_integrity.py
python services/ingestion/scripts/qa_sec_sample.py
```

Raw zips stay in `data/raw/` (gitignored). See [`docs/task-002-sec-adviser-ingestion.md`](docs/task-002-sec-adviser-ingestion.md) and [`docs/task-002-1-production-publish.md`](docs/task-002-1-production-publish.md).

### Python ingestion

```bash
cd services/ingestion
python -m venv .venv
.venv\Scripts\activate
pip install -e ".[dev]"
ruff check src tests scripts
pytest
```

### Database

```bash
createdb investor_trust_hub
python services/ingestion/scripts/apply_migrations.py
python services/ingestion/scripts/apply_and_seed.py
```

CI may also apply `database/seed/0002_synthetic_fixtures.sql`. Production publish omits synthetic fixtures unless `--include-synthetic` is requested.

See [`database/README.md`](database/README.md).

## Environment variables

Copy [`.env.example`](.env.example). Never commit secrets.

- Public: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SITE_NAME`
- Server-only: `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `INGESTION_DATABASE_URL`

## Ingestion overview

The Python service defines a staged pipeline:

download → checksum → archive → parse → validate → normalize → entity resolution → stage → transactional publish → rollback → provenance → metrics

The same release/idempotency key must not duplicate published records. Prefer no identity match to the wrong match.

## Synthetic data

Development fixtures live in `packages/domain/src/fixtures.ts` and `database/seed/0002_synthetic_fixtures.sql`.

Every record is marked synthetic and uses `SYN-` identifiers. The required label is:

**Synthetic development data — not a real person or firm.**

These pages are `noindex`. They are not official evidence.

## Documentation

- [`AGENTS.md`](AGENTS.md) — rules for future AI builders
- [`docs/architecture.md`](docs/architecture.md)
- [`docs/data-model.md`](docs/data-model.md)
- [`docs/source-registry.md`](docs/source-registry.md)
- [`docs/product-principles.md`](docs/product-principles.md)
- [`docs/product-roadmap.md`](docs/product-roadmap.md)
- [`docs/compliance-boundaries.md`](docs/compliance-boundaries.md)
- [`docs/versions.md`](docs/versions.md)
- [`docs/task-002-sec-adviser-ingestion.md`](docs/task-002-sec-adviser-ingestion.md)
- [`docs/task-002-1-production-publish.md`](docs/task-002-1-production-publish.md)
- [`docs/task-003-firm-trust-reports.md`](docs/task-003-firm-trust-reports.md)
- [`docs/firm-indexability-gate.md`](docs/firm-indexability-gate.md)
- [`docs/firm-search.md`](docs/firm-search.md)

## Future milestones

See [`docs/product-roadmap.md`](docs/product-roadmap.md). Do not start the next milestone from this README automatically.

Recommended next milestone: **Task 004 — associated professionals and BrokerCheck as a research citation**, still isolated from prospecting. Do not start it from this README.
