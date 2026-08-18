# Firm indexability gate

Indexability means only that a Firm Trust Report contains enough sourced information to justify a useful standalone search result.

It does **not** mean trusted, approved, recommended, high quality, safe, or preferred.

## Function

`evaluateFirmIndexability(firm)` in `packages/domain/src/firm-indexability.ts` is the source of truth.

It returns:

```text
decision: eligible | not_eligible
trustReportEligible
geoDiscoveryEligible
reasonCodes[]
```

## Trust Report eligibility

A firm is Trust Report eligible only if all of the following are true:

1. not synthetic
2. valid CRD
3. firm name present
4. clear RIA / ERA / pending classification
5. current official source observation
6. source release present
7. at least one evidence record
8. raw source snapshot present
9. at least one additional consumer fact (city, usable U.S. state, postal code, SEC file number, legal structure, RAUM, or website)

Missing principal state does **not** by itself make the Trust Report ineligible.

## Geographic discovery eligibility

Separate from the Trust Report gate.

Requires Trust Report eligibility **and** a usable two-letter U.S. state code in the source principal office.

Firms with blank state, `ZZ` country, or non-U.S. regions are not geo-discovery eligible.

## Activation

Site indexing now has three gates: `SITE_INDEXING_ENABLED` (A), approved request host (B), and `search_documents.indexable` (C). See `docs/seo-launch-gates.md`.

`search_documents.indexable` stays `false` until an operator applies a wave. Dry-run is always safe:

```text
python services/ingestion/scripts/firm_indexability_report.py
python services/ingestion/scripts/firm_indexability_report.py --wave-size 1000
python services/ingestion/scripts/firm_indexability_report.py --wave-size 1000 --apply
```

`--apply` without `--wave-size`, `--crds`, or `--all-eligible` is refused. Selection uses `crd-sha256-v1` (not RAUM, fame, or paid status). Synthetic rows remain false.

Do not apply a wave while Gate A is false or while the permanent domain is unassigned.
