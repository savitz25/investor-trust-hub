# Firm search

`/firms` is the national SEC/IARD firm research directory.

## Query types

| Input | Behavior |
| --- | --- |
| CRD digits | Exact identifier match ranks first |
| SEC file number (`801-` / `802-`) | Exact identifier match ranks first |
| Firm name | Exact, prefix, then trigram similarity |
| City / ZIP | Location match against principal office |
| `state=NY` | Source-supported principal-office state only |
| `state=_none` | State not provided in the source record |

Shareable URLs:

```text
/firms?q=vanguard
/firms?state=FL
/firms?q=capital&state=NY
```

Query-string result pages are `noindex, follow`. The `/firms` landing page without query parameters may be indexed.

## Ranking

1. exact CRD
2. exact SEC file number
3. exact firm name
4. prefix firm name
5. trigram / location relevance

Never ranked by RAUM, paid placement, or business relationship.

## Indexes

Migration `0011_firm_research_search.sql` adds lookup indexes on slug, lowercased names, identifier values, and principal-office region/postal code. Existing `pg_trgm` / tsvector indexes on `search_documents` remain.

## Refresh

Search reads current canonical tables. A later SEC monthly publish updates names, locations, and facts without regenerating pages.
