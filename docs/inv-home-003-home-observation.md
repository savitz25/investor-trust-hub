# INV-HOME-003 — National Homepage Post-Launch Observation

Observation + chrome honesty. No ingestion. No Wave 2. No professional publication. `db_writes = 0`.

---

# A. STATUS

**COMPLETE**

Live INV-HOME-002 homepage verified. Residual public-nav honesty fix applied: synthetic `/professionals` removed from header/footer and sitemap; route retained, noindex.

---

# B. REPO / PRODUCTION LOCK

| Field | Value |
| --- | --- |
| Repo | `https://github.com/savitz25/investor-trust-hub.git` |
| Starting `origin/main` | `9da25e7a0483145d31f4ba38d7de5805cb2594cd` |
| Commits since 9da25e7 | none |
| Branch / worktree | `inv-home-003-home-observation` / `C:\Users\makei\investor-trust-hub-inv-home-003` |
| Canonical | `https://www.investortrusthub.com` |
| Vercel project | `investor-trust-hub-web` (`prj_Qu2DT0AIy8R7XYTQiHgNcDYjE9i8`) |
| Production deployment (pre-change) | `dpl_DF9Ytvhb8fwfKa5noCDZQEmctiW1` |
| Production SHA (pre-change) | `9da25e7` |

---

# C. LIVE HOMEPAGE VALIDATION

GET `/` 200. Server HTML:

- One H1: `Understand investment advisers before you choose one.`
- Title: `Investment adviser intelligence · InvestorTrustHub`
- Description: Independent SEC/IARD and Form ADV research…
- Canonical: `https://www.investortrusthub.com`
- Robots: `index, follow`
- JSON-LD + SearchAction targeting `/firms`
- Census present: 23,622 / 17,018 / 6,604 / 1,000 / 16,783 / 235 / 17,997 / 5,625
- State of the Record, Trace this number, ERA is not an RIA
- No “Research a professional”
- Trust Score only in negation
- No “best adviser”; no “serves this state”
- No empty loading shell

---

# D. CENSUS REGRESSION

| Metric | Expected | Live HTML |
| --- | ---: | --- |
| SEC/IARD roster | 23,622 | present |
| RIA | 17,018 | present |
| ERA | 6,604 | present |
| RIA registered | 16,783 | present |
| RIA pending | 235 | present |
| Wave-1 | 1,000 | present |
| Geography known | 17,997 | present |
| Geography unresolved | 5,625 | present |

Equations: `17018+6604=23622`, `16783+235=17018`. Extra 2,155 not used as roster.

---

# E. PROFESSIONALS CHROME AUDIT

| Surface | Classification | Action |
| --- | --- | --- |
| Header “Professionals” → `/professionals` | **MISLEADING** | Removed from `PRIMARY_ROUTES` |
| Footer Explore same link | **MISLEADING** | Removed via same list |
| Homepage hero/tools | SAFE (no professional CTA) | None |
| `/professionals` page | SYNTHETIC DEV ONLY | Route kept; noindex; robots disallow |
| `/professional/[slug]` | SYNTHETIC DEV ONLY | Already noindex |
| Footer “investment professionals” prose | SAFE (category, not a product CTA) | Unchanged |

Option 1 implemented. Domain models retained.

---

# F. SYNTHETIC SAFETY

Exact fixture phrase remains on the professionals page. Synthetic people are not in homepage counts or Wave-1. Listing no longer in sitemap/`INDEXABLE_PATHS`.

---

# G. SEARCH OBSERVATION

Homepage lookup: firm name, CRD, or SEC file number; explicitly not a live IAR directory.

Production `/firms` queries all 200: `vanguard`, `801-`, `99999999`, `xyzzy-no-such-firm-zzzz`.

---

# H. IMPLEMENTATION

Smallest honesty fix:

- Drop `/professionals` from public nav
- Drop from `INDEXABLE_PATHS`
- `shouldNoIndex('/professionals')` true
- `robots.ts` disallows `/professionals`
- Page metadata `indexable: false`

No homepage intelligence, census, or Wave-1 firm gate changes.

---

# I. TESTS

| Command | Result |
| --- | --- |
| `npm test` | 95/95 PASS |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `node scripts/assert-visual-003.mjs` | PASS |
| `npm run build` | recorded in closeout |

---

# J. PUBLICATION SAFETY

- Wave-1 remains 1,000
- No professional publication
- No Wave 2
- Sitemap: `/professionals` removed (not expanded)
- `db_writes = 0`

---

# K. REMAINING GAPS

- Public professional research still not ready (internal IAR rows only)
- Item 5.D client types omitted
- FINRA dual-registration omitted
- What Changed unsupported
- Form ADV Explorer not a homepage module
- Tools/Decision Lab still not implemented

---

# L. HOMEPAGE CLOSURE

Recommendation after Production promotion of this honesty fix:

**INVESTORTRUSTHUB NATIONAL HOMEPAGE: OPERATIONALLY CLOSED**

This is a chrome-honesty close of INV-HOME-002, not a new data product. Remaining gaps in K are future InvestorTrustHub opportunities and are out of homepage scope.

---

# M. PRE-CHANGE LIVE PROOF (002)

Captured 2026-08-29 from `https://www.investortrusthub.com`:

| Check | Result |
| --- | --- |
| GET `/` | 200, 210,250 bytes |
| H1 | Understand investment advisers before you choose one. |
| Census in HTML | 23,622 / 17,018 / 6,604 / 1,000 / 16,783 / 235 / 17,997 / 5,625 |
| ERA is not an RIA | present |
| Item 5F(2)(c) RAUM | present |
| Item 5.E independent methods | present |
| Trace this number | present |
| Research a professional | absent |
| Header nav | Professionals, Firms, Research, Tools, Methodology, Sources, About |
| Footer `/professionals` | present |
| GET `/professionals` robots | `index, follow` |
| Synthetic phrase on listing | present |
| Sitemap loc count | 1,011 = 1,000 Wave-1 firms + 11 static including `/professionals` |

That nav/indexability of synthetic professionals is the residual honesty defect.

---

# N. DEFINITION OF DONE

| Criterion | Verdict |
| --- | --- |
| Live INV-HOME-002 verified | YES — census, H1, RIA/ERA, RAUM, compensation, Trace |
| National census remains locked | YES — 23,622 = 17,018 + 6,604; 17,018 = 16,783 + 235 |
| RIA/ERA semantics remain correct | YES — ERA is not an RIA; extra 2,155 excluded |
| RAUM and compensation stories remain correctly interpreted | YES — RIA-only 5F(2)(c) bands; 5.E independent Y/N |
| Every major number remains traceable | YES — Trace this number on census metrics |
| Synthetic professionals not advertised as a real research product | YES after this fix ships — removed from nav, sitemap, robots |
| No unsupported feature promoted | YES — Decision Lab / compare / What Changed not homepage CTAs |
| Mobile / accessibility / SEO remain healthy | YES — visual-003 assert, skip link, one H1, canonical, JSON-LD `/firms` |
| Wave-1 indexability remains unchanged | YES — 1,000 firm URLs; sitemap not expanded |
| No new ingestion / publication | YES — `db_writes = 0` |
| Operational closure decision | **CLOSED** once Production HTML no longer lists Professionals in header/footer |
