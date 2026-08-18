# Task 003.5 — Wave 1 observation

Observed: **2026-08-18T19:30:49Z**.

## Invariants

```text
official 23,622
indexable 1,000
held 22,622
synthetic indexed 0
algorithm crd-sha256-v1
membership drift 0
sitemap firms 1,000
sitemap ↔ DB bijection exact
```

## Metadata

003.4 “duplicate titles” were:

1. Next.js streaming a layout fallback before `generateMetadata`.
2. SVG `<title>InvestorTrustHub</title>` inside header/footer marks (not document titles).

Fixes:

- `pageMetadata` now sets `title.absolute` (`{name} — SEC/IARD Firm Research · InvestorTrustHub`).
- `htmlLimitedBots: /./` waits for metadata so the document title is in `<head>`.
- Logo SVGs keep `aria-label` and no longer emit a `<title>` tag.

Title QA after deploy: 30 Wave + 10 held = **40/40** one document title.

## HTTP health

```text
Wave 1 URLs: 1,000 / 1,000 PASS
Held sample:   100 / 100 PASS
temporary-unavailable: 0
```

## External indexation

```text
EXTERNAL INDEXATION NOT MEASURED — GSC ACCESS UNAVAILABLE
```

`indexable` ≠ “indexed by Google”. Do not use `site:` counts as a KPI.

## TLS

Encrypted yes. CA verification no. Unchanged.

## Wave 2

Not applied. Recommendation: **HOLD WAVE 2** until Search Console observation exists and the hung Task 003.4 Node CI job is confirmed green on a later SHA.

## Rollback (unchanged)

```text
SITE_INDEXING_ENABLED=false
python services/ingestion/scripts/firm_indexability_report.py --rollback --wave-id wave-1 --apply
```
