# SEO launch gates

Three independent conditions control whether a Firm Trust Report may appear in search engines.

## Gate A — Site launch

```text
SITE_INDEXING_ENABLED
```

Server-only. Missing, empty, or any value other than `true` / `1` / `yes` means **false**.

## Gate B — Approved host

```text
INDEXABLE_HOSTS
```

Comma-separated hostnames. Default is empty (nothing is approved).

Always blocked:

- `*.vercel.app`
- `*.vercel.sh`
- Vercel Preview (`VERCEL_ENV=preview`)

## Gate C — Firm content

`evaluateFirmIndexability` plus `search_documents.indexable`.

A firm URL may be indexed only when:

```text
SITE_INDEXING_ENABLED = true
AND
request host ∈ INDEXABLE_HOSTS
AND
search_documents.indexable = true
```

Shell pages need Gates A + B only. Query strings (`/firms?q=`, `/firms?state=`) stay noindex.

These gates must not be collapsed.

## Canonical URLs

`NEXT_PUBLIC_SITE_URL` is the application control for canonical generation. `CANONICAL_HOST` plus `INDEXABLE_HOSTS` drive apex/www 301 redirects at build time.

`.vercel.app` stays reachable (Option A): `noindex, follow` plus `X-Robots-Tag`, canonical pointing at `NEXT_PUBLIC_SITE_URL` once that is the permanent origin.

## Permanent-domain sequence

```text
Attach domain on Vercel project investor-trust-hub-web
→ valid HTTPS
→ NEXT_PUBLIC_SITE_URL + INDEXABLE_HOSTS + CANONICAL_HOST
→ confirm canonical HTML and redirects
→ confirm .vercel.app and Preview stay noindex
→ SITE_INDEXING_ENABLED=true
→ Wave 1 --wave-size 1000 --apply
→ monitor
```

The permanent origin is `https://www.investortrusthub.com`. Apex and `.vercel.app` 308 to www.

Gate A is on in Production. Wave 1 (1,000 firms) is applied. Remaining official firms stay noindex until a later wave. Parameterized `/firms` queries stay noindex.
