# Architecture

InvestorTrustHub is a monorepo designed for national-scale regulatory research, not a static directory.

## Runtime shape

| Layer | Location | Role |
| --- | --- | --- |
| Product UI | `apps/web` | Next.js App Router, server-rendered pages, minimal client JS |
| Design system | `packages/ui` | Trust Report components and brand primitives |
| Domain | `packages/domain` | Identifiers, entities, evidence, search contracts, fixtures |
| Config | `packages/config` | Source registry, routes, env, security headers, copy |
| Ingestion | `services/ingestion` | Python pipeline for future official datasets |
| Database | `database/` | Versioned PostgreSQL / Supabase-compatible schema |

## Why this split

Regulatory interpretation and financial math must stay out of React trees. Pages compose typed objects. Ingestion publishes those objects with provenance. The UI renders status vocabulary; it does not decide what a disclosure “means.”

## Scale assumptions

The schema and indexes anticipate:

- 700,000+ professionals
- tens of thousands of firms
- 100,000+ branches
- thousands of funds
- millions of evidence / filing / disclosure rows
- recurring source refreshes and historical snapshots

Search is a `search_documents` table plus trigram / GIN indexes. Task 001 does not implement a production search cluster.

## Web

- Next.js App Router, React 19, TypeScript strict
- Server Components by default
- Client components only for header menu, directory filter, and compare toggle
- Security headers from `packages/config`
- Synthetic and reserved routes are `noindex`

## Data path (future)

```text
official source
  → download / checksum / archive
  → parse / validate / normalize
  → conservative entity resolution
  → stage
  → transactional publish (idempotent)
  → evidence_records + current snapshot
  → source_snapshots / registration_status_history
  → search_documents (indexable only when sourced content is sufficient)
  → Trust Report UI
```

## Supabase compatibility

Tables use UUID primary keys, `gen_random_uuid()`, and optional `auth.uid()` RLS policies when the `auth` schema exists. User workspace tables already have RLS enabled. Service-role keys are server-only.

## Identity resolution

The ingestion resolver refuses low-confidence merges. Creating a new unmatched entity is preferred to attaching a record to the wrong person or firm.
