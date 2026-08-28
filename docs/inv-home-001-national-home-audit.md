# INV-HOME-001 — National Homepage Intelligence Baseline Audit

Locked: 2026-08-28. Audit-only. No production homepage change. No ingestion. No indexing change. No Wave 2. No BrokerCheck scrape.

Code + production database + live production behavior are authoritative over stale milestone text (for example `docs/source-registry.md` still says IAPD individuals are not ingested; the production database now contains an `iapd_iar_compilation` release retrieved 2026-08-28 17:27Z).

---

# A. STATUS

**COMPLETE**

The production/repository/data baseline is locked. `investor-home-intel-v1` can be produced from existing data without new ingestion. INV-HOME-002 can implement the national homepage from this contract without guessing.

No HARD STOP discrepancy: canonical domain, Vercel project, GitHub `main`, and production deployment SHA all agree.

---

# B. REPO / PRODUCTION BASELINE

| Field | Value |
| --- | --- |
| Repo | `https://github.com/savitz25/investor-trust-hub.git` |
| Reference SHA (task brief) | `ec6ee5b81015024be2a74a3b9f5ab9d0fa3fc5e8` |
| Actual starting `origin/main` SHA | `ec6ee5b81015024be2a74a3b9f5ab9d0fa3fc5e8` |
| SHA comparison | Exact match. `main` has not moved forward. |
| Isolated worktree | `C:\Users\makei\investor-trust-hub-inv-home-001` |
| Branch | `inv-home-001-national-home-audit` |
| Shared checkout | `C:\Users\makei\investor-trust-hub` was **not** used (it was behind at an older SHA). |
| Canonical domain | `https://www.investortrusthub.com` |
| Apex | `https://investortrusthub.com` serves the same Vercel project (host is in `INDEXABLE_HOSTS`) |
| Vercel team | `savitz25-s-projects` (`team_1vxGqSSLGF4xmg7XRqpkLSKi`) |
| Vercel project | **`investor-trust-hub-web`** (resolved from the canonical domain, not guessed from name) |
| Project ID | `prj_Qu2DT0AIy8R7XYTQiHgNcDYjE9i8` |
| Root directory | `apps/web` |
| Framework | Next.js (Node 24 on Vercel) |
| Production deployment | `dpl_CFnzBFkrwm769ApyjLDhEWj4WzNE` (Ready, ~2026-08-28 09:08 EDT) |
| Production SHA | `ec6ee5b81015024be2a74a3b9f5ab9d0fa3fc5e8` |
| Main / production match | **YES** |
| Production environment | Production; `SITE_INDEXING_ENABLED=true`; `INDEXABLE_HOSTS=www.investortrusthub.com,investortrusthub.com`; `CANONICAL_HOST=www.investortrusthub.com` |
| Preview / `*.vercel.app` | Remain noindex via `isHostLaunchIndexable` + middleware `X-Robots-Tag` |
| Production database | Supabase project `ghjhcxfirxnszfnymdxb`, pooler `aws-0-us-east-2.pooler.supabase.com`, database `postgres`. Read-only census only. |

Census artifacts (read-only queries, no mutation):

- `docs/inv-home-001-census.json`
- `docs/inv-home-001-census-extra.json`
- `scripts/inv_home_001_census.py`
- `scripts/inv_home_001_census_extra.py`

AGENTS.md was read before changes. ERA is not an RIA. No Trust Score. Missing ≠ clean. No SEC-approval language.

---

# C. CURRENT HOMEPAGE

## Route and implementation

- Route: `/`
- Page: `apps/web/src/app/page.tsx` — **server component**, no database fetch, no `revalidate` export (static RSC).
- Layout: `apps/web/src/app/layout.tsx` — `SiteHeader` (skip link `#main`), `main#main`, `SiteFooter`. Chassis `TH_CHASSIS_VERSION = 2026.08.21-visual-v1` (`data-th-chassis`). Network `data-hub="investor"`.
- Header nav (`PRIMARY_ROUTES`): Home, Professionals, Firms, Research, Tools, Methodology, Sources, About. Sticky header, mobile drawer, Switch Hub menu, skip-to-content.
- Footer: brand line plus legal (`/disclaimer`, `/privacy`, `/terms`) and methodology/sources.

## Hero

`HomeHero`:

- Eyebrow: “InvestorTrustHub · Independent research”
- H1: **Research before you invest.**
- Supporting copy + philosophy line from `@ith/domain`
- Primary CTA: **Research a professional → `/professionals`** (this is a synthetic directory — see Search)
- Secondary CTA: How we research → `/methodology`
- Aside card: “Evidence, not endorsement” (registration as reported, identifiers, disclosures as source text, no trust score)

## Paths / cards

`HomePaths` from `HOME_PATHS`:

| Card | Href | Status in copy |
| --- | --- | --- |
| Verify an investment professional | `/professionals` | Labeled **Foundation** — **incorrect for live data** (synthetic fixtures) |
| Research an investment firm | `/firms` | Foundation — **true** |
| Understand what you are paying | `/tools` | Coming soon |
| Understand what you own | `/tools` | Coming soon |
| Explore retirement decisions | `/tools` | Coming soon |
| Research an investment offer | `/research` | Coming soon |

Copy correctly says some paths are coming soon. It incorrectly treats professional search as a working foundation.

## Other sections

- `HomePrinciples`: research questions + “What this is not”
- `StatusLegend`: allowed status vocabulary
- No national metrics, no charts, no source ledger, no State of the Record

## Indexing / share / structured data

- Title: `Research before you invest. · InvestorTrustHub`
- Description: `Research investment professionals, firms, fees, and financial decisions using regulatory and public-source evidence.`
- Canonical: `https://www.investortrusthub.com/`
- Robots on production: `index, follow`
- JSON-LD: Organization only (Ask Trust Hub parent)
- Open Graph / Twitter: site-wide share image via `SHARE_HUB`
- Sitemap: `/` plus other `INDEXABLE_PATHS` plus Wave-1 indexable firm slugs (cap 5,000; currently 1,000)
- Homepage does **not** query ADV observations

## Cache

Homepage is static. `/firms` is `force-dynamic` with `unstable_cache` (search 120s, directory metrics 300s, profiles 1800s).

## Mobile / overflow (production, no layout mutation)

Chrome DevTools measurement of live `https://www.investortrusthub.com/`:

| Viewport | Horizontal overflow |
| --- | --- |
| 1440×900 | none (`scrollWidth` 1425 vs client 1425) |
| 768×1024 | none |
| 390×844 | none |

Screenshot files could not be written through Chrome DevTools MCP (workspace-root restriction). Visual inspection used the live production DOM; overflow is the quantitative baseline.

## KEEP / MODIFY / REMOVE / MISSING

### KEEP

- Mission/philosophy copy and anti-score language
- Status legend and “what this is not”
- Chassis header/footer / skip link / Switch Hub
- Firm search at `/firms` (name, CRD, SEC file number, principal-office state)
- Methodology + sources pages
- Wave-1 Trust Reports (`/firm/...`, 1,000 indexable)
- Organization JSON-LD pattern and share-image infrastructure

### MODIFY

- Hero primary CTA must not point at synthetic professionals
- `HOME_PATHS` professional card must not be labeled Foundation as if live
- Homepage must consume a server `investor-home-intel-v1` payload
- Coming-soon Decision Lab cards must not dominate the first screen
- `/professionals` nav remains in the shell but V1 homepage must not advertise it as working search

### REMOVE (from homepage narrative, not from the repo)

- Implied live professional research
- Unfinished tools presented as equal “start here” paths
- Any future score/ranking/best-adviser language (none exists today; keep it that way)

### MISSING (Intelligence OS V1)

- Intelligence hero with truthful search scope
- State of the Record
- Exactly three national findings
- Trace This Number / provenance
- Evidence depth
- Geography explorer (principal office, with unresolved count)
- Ask the Market (curated questions → structured content)
- Tools after intelligence (only live routes)
- Source ledger + limitations

---

# D. CURRENT NATIONAL DATA CENSUS

Definitions used below:

- **SEC IARD roster** = rows in `form_adv_firm_facts` (and matching firm `registrations`) from the monthly SEC RIA + ERA compilations. This is the V1 national firm universe.
- **Canonical firms** = all rows in `firms` with official (non-synthetic) identity. Includes roster firms plus extra identities that do not currently have ADV facts.
- **Wave-1 indexable** = `search_documents` where `entity_kind = firm` and `indexable = true`. Content gate, not a quality ranking.

| Metric | Count | Definition |
| --- | --- | --- |
| Canonical firms (official) | **25,777** | `firms` official; 0 synthetic firms |
| SEC IARD roster | **23,622** | `form_adv_firm_facts` = firm registrations |
| Extra firms without ADV facts / `firm_kinds` | **2,155** | Do **not** mix into RIA+ERA totals. Consistent with `iapd_state_compilation` presence; not the V1 SEC roster. |
| RIA facts | **17,018** | `dataset_kind = ria` / `firm_kinds = registered_investment_adviser` |
| RIA registered | **16,783** | Normalized registration status `registered` |
| RIA pending | **235** | Status `pending` (e.g. 120-day language). Not “SEC approved.” |
| ERA facts | **6,604** | `dataset_kind = era`. **ERA is not an RIA.** |
| ERA reporting | **6,604** | Status `reporting` |
| Wave-1 indexable Trust Reports | **1,000** | `search_documents.indexable` |
| Non-indexable firm search docs | **24,777** | Searchable internally/directory-gated; not sitemap Wave 1 |
| Main-office branches | **23,622** | `source_location_key` principal office from the roster |
| ADV reported attributes | **5,149,596** | Normalized Item-level observations |
| ADV filings | **635,269** | Filing rows (architecture for history; not a V1 change series) |
| Owner entities | **158,560** | Schedule A/B entity table |
| Schedule A/B rows | **4,158,438** | Ownership observations |
| ADV-W rows | **22,592** | Withdrawal filings; historical; not misconduct |
| Successor links | **16** | Rare |
| `disclosure_events` | **0** | No enforcement-event table population |
| Products (internal) | **197,588** | **Not** a V1 public funds metric; 0 `public_status = published` |
| Issuers | **0** | Not represented |
| People (official) | **207,384** | Includes internal owner-person rows; **not** a public professional census |
| People with IAR kind + individual CRD | **50,749** | Identity-anchored IAR rows |
| Person–firm associations | **51,389** | Official associations |
| Person registrations | **0** | No public person registration rows |
| Evidence records | **165,354** | Provenance graph |
| Source snapshots | **23,622** | One current roster snapshot per facts row |
| Source releases | **48** | Including IAPD firm/IAR compilations and ADV-W months |

### Identifiers (firms)

| Type | Rows | Firms |
| --- | --- | --- |
| `crd` | 25,777 | 25,777 |
| `sec_file_number` | 23,621 | 23,621 |
| `cik` | 4,884 | 4,884 |

One roster firm lacks a usable SEC file number in identifiers (23,622 facts vs 23,621 `sec_file_number`). Do not treat SEC file number as 100% complete.

### Primary source vintage (firm roster)

Latest IAPD SEC firm compilation in `source_releases`:

- Dataset: `iapd_sec_compilation`
- Label: `IA_FIRM_SEC_Feed_08_27_2026`
- Published: 2026-08-27
- Retrieved: 2026-08-28 16:36:30Z

Companion: `iapd_state_compilation` `IA_FIRM_STATE_Feed_08_27_2026` (same retrieve time). IAR compilation `IA_INDVL_Feed_08_27_2026` retrieved 2026-08-28 17:27:51Z — **after** the production deployment timestamp. Public `/professionals` still does not use it.

### RAUM (RIA only, Item 5F(2)(c))

Denominator: 17,018 RIA facts. ERA does not file this item.

| Bucket | Count |
| --- | --- |
| Null | 0 |
| Reported zero | 613 |
| Positive | 16,405 |
| `< $25m` | 371 |
| `$25m–<$100m` | 759 |
| `$100m–<$1b` | 9,887 |
| `$1b–<$10b` | 4,023 |
| `≥ $10b` | 1,365 |
| Max observed | ~$11.09T (outlier — band, do not headline a sum) |

Band sum including zeros = 17,018.

### Item 11 disclosure indicator (`form_adv_firm_facts.disclosure_indicator`)

| Class | Y | N | Null |
| --- | --- | --- | --- |
| RIA | 876 | 16,141 | 1 |
| ERA | 80 | 6,524 | 0 |

Attribute field `11` REPORTED_YES = 956 (876+80). This is a filer checkbox, not an enforcement count.

### Geography (principal office)

All canonical firms by `firms`/branch region (includes extra 2,155):

- Null region: **7,780**
- Top states: NY 3,152; CA 2,699; TX 1,302; FL 1,284; MA 803; …

Roster-only principal office (`docs/inv-home-001-census-extra.json`):

- With region: **17,997**
- Null region: **5,625** (23.8% of 23,622)

V1 geography explorer **must use roster principal office**, show unresolved, and never say “serves [state].”

### Compensation methods (RIA Item 5.E, Y/N; ERA = NOT_FILED_BY_FORM_TYPE 6,604)

Among 17,018 RIA facts:

| Field | Typical meaning | REPORTED_YES | REPORTED_NO |
| --- | --- | --- | --- |
| 5E(1) | Percentage of assets | 16,246 | 772 |
| 5E(2) | Hourly | 4,925 | 12,093 |
| 5E(3) | Subscription | 181 | 16,837 |
| 5E(4) | Fixed fee | 7,707 | 9,311 |
| 5E(5) | Commission | 324 | 16,694 |
| 5E(6) | Performance-based | 6,078 | 10,940 |
| 5E(7) | Other | 2,380 | 14,638 |

These are methods, not rates.

### Dual-registration / BD

- 6A(1) other business as BD: YES 451 / NO 23,171 (across facts rows)
- 7A(1) related person BD: YES 2,900 / NO 20,722

Filer-reported Form ADV flags only. **FINRA BrokerCheck dual-registration: `NOT AVAILABLE FOR V1 NATIONAL METRIC`.**

### Client types (Item 5.D FOIA names)

`5D(1)(a)` … `5D(1)(m)`: **NOT_PRESENT_IN_SOURCE** for 17,017 RIA rows. **Not a V1 story.** Do not start a new ingestion project to fill this for the homepage.

---

# E. ENTITY CLASS READINESS

## Firms

| Class | Present | Public | V1 homepage |
| --- | --- | --- | --- |
| SEC RIA | Yes (17,018 facts) | Directory + 1,000 Trust Reports | Yes, labeled RIA |
| ERA | Yes (6,604 facts) | Directory; not labeled as RIA | Yes, labeled ERA separately |
| Other firm regulatory classes | Extra 2,155 without `firm_kinds` | Search documents exist; no ADV class | Exclude from V1 population totals |
| Broker-dealers as a class | ADV flags only | No BD product | Not a population metric |

## Professionals

| Layer | State |
| --- | --- |
| Domain model | Exists (`people`, associations, identifiers) |
| Database tables | Exist; 207,384 official people rows |
| Real regulatory data | Partial: 50,749 individual CRD; IAR compilation ingested 2026-08-28 17:27Z |
| Canonical identity | Individual CRD for 50,749; many owner-person rows are internal |
| Public profile | **Synthetic fixtures only** (`SYNTHETIC_PEOPLE` on `/professionals` and `/professional/[slug]`) |
| Search | Client filter of synthetic haystack. Not IAPD search |
| Publication allowed | **No** live professional publication |

Do not design V1 homepage language implying searchable professionals.

## Other entities

| Entity | State | Homepage |
| --- | --- | --- |
| Broker-dealers | ADV affiliation/activity flags only | `NOT AVAILABLE` as a class total |
| Issuers | 0 rows | Unavailable |
| Funds/products | 197,588 internal; 0 published | Do not cite as a public fund census |
| Affiliates / related firms | Schedule/related tables exist for profiles | Not a V1 national total |
| Control persons / owners | Schedule A/B + internal owner people | Profile/Explorer later; not a homepage headcount |

Do not collapse unlike entities into “advisers researched.”

---

# F. FORM ADV FIELD INVENTORY

Consumer-facing families (not a column dump). Coverage is qualitative unless a clean denominator exists.

## Identity — AVAILABLE FOR SEC FIRMS

- Display / legal name
- Organization CRD (25,777 firms; roster 23,622)
- SEC file number (23,621)
- CIK when present (4,884) — optional, not a V1 headline
- Registration class RIA vs ERA
- Source status text preserved; never display “SEC approved”

## Filing metadata — AVAILABLE FOR SEC FIRMS

- Latest ADV filing date on facts
- Form version
- SEC status effective date
- Source release label / retrieved_at / checksum on `source_releases`
- Raw snapshot payload retained

## Regulatory AUM — AVAILABLE FOR SEC RIA FIRMS

- Fields: `raum_discretionary`, `raum_nondiscretionary`, `raum_total` from 5F(2)(a)/(b)/(c)
- Completeness: 17,018 non-null total RAUM for RIAs; 613 zeros; ERA not filed
- Firm-level only
- Banding is defensible (locked in `V1_RIA_RAUM_BANDS`)
- Not performance; not quality; max outlier must not be summed into a national AUM boast

## Client types — NOT READY (V1)

- 5D FOIA field names are `NOT_PRESENT_IN_SOURCE` in this extract
- Do not invent shares of “individuals vs institutions”

## Services — PARTIAL / AVAILABLE AS FLAGS FOR RIA

- Item 5.G Y/N flags (e.g. 5G(1) financial planning YES 7,906 / NO 9,112 among RIAs; 5G(2) YES 11,094)
- ERA not filed
- Usable as an explorer later; **not** selected as a V1 featured story (compensation methods are clearer nationally)

## Fees / compensation — AVAILABLE AS METHODS FOR RIA

- Item 5.E Y/N methods, `READY_FOR_PUBLIC_PROFILE` in Tier-1 map
- Must not be reduced to a single advertised rate
- “Fee-only” is not a derived claim from 5E(1) alone

## Ownership / control — PARTIAL

- 158,560 owner entities; 4.16M Schedule A/B rows
- Profile contract already restricts public display to high-confidence / confirmed logic
- Not a V1 national ownership pie chart
- Name-only joins remain forbidden

## Affiliations / other business — SOURCE-LIMITED

- Item 6 / 7 flags (including 6A(1) BD 451 YES; 7A(1) related BD 2,900 YES)
- Filer-reported; not a FINRA BD census
- Named related organizations are profile-scoped, confidence-gated

## Custody — PARTIAL (profile-ready, not a V1 story)

- Item 9 Y/N exists in Tier-1 / INV-NAT-002C as `READY_WITH_LIMITATIONS`
- ERA does not file Item 9
- Not selected as a national homepage finding

## Disclosures — SOURCE-LIMITED

- Firm-level `disclosure_indicator` Y/N
- Item 11 category checkboxes exist as attributes (`INTERNAL_ONLY` for 11A–11H on profiles)
- `disclosure_events` empty
- No external enforcement source in the public product
- ADV disclosure ≠ proven violation

---

# G. IDENTITY / RELATIONSHIP READINESS

| Question | Answer |
| --- | --- |
| Firm CRD | Universal for canonical firms (25,777). V1 roster uses CRD via facts. |
| SEC file number | 23,621 / 23,622 roster. Safe for search; not a 100% completeness claim. |
| Name-only identity joins | Forbidden. Not used for V1 metrics. |
| Professional identity | 50,749 `individual_crd`. Remaining people rows are largely internal owners (INV-NAT-002C: 156,635 internal owner people = 207,384 − 50,749). |
| PERSON → FIRM relationship table | `person_firm_associations` (51,389 official) |
| Relationship type / dates / confidence | Present in schema; **not** public-eligible today |
| Public eligibility | Not allowed. `/professionals` is synthetic. |
| Search safety | Must not expose IAR associations on V1 homepage/search copy |
| Affiliations | ADV flags only for national use; named links stay profile-gated |

Professional linkage **does not block** the national homepage. It **does** change V1 search/CTA copy: firms only.

---

# H. GEOGRAPHY READINESS

| Field | Semantic meaning | V1 use |
| --- | --- | --- |
| Principal / main office | Address the filer reports as main office on the IARD roster (`branches` main office) | National map/table **with unresolved** |
| Mailing office | Correspondence address if present in snapshot | Not a V1 aggregate |
| Registered office | Not a separate normalized national series | Do not invent |
| State registration / notice filing | Jurisdictions where the firm notice-files; **not** principal office | **Not separately supported** as a V1 metric (`registrationByState` omitted) |
| Branch / other locations | Profile-scoped other offices (confidence-gated) | Not a national branch census |
| Service territory | Not in source as “serves state X” from principal office | **Never inferred** |

**Principal office in Florida ≠ serves Florida.**

National state map: **viable for V1 as an explorer**, not as a featured “coverage of America” claim, because 5,625 roster firms have null principal-office region (23.8%). Always show unresolved.

Do not use the 7,780 all-firm null count (that mixes extra non-roster firms).

---

# I. DISCLOSURE / ENFORCEMENT READINESS

| Artifact | Count / state | Correct interpretation |
| --- | --- | --- |
| Item 11 indicator Y | 956 of 23,622 facts (876 RIA + 80 ERA) | Filer reported “yes” to the disclosure information question |
| Item 11 indicator N | 22,665 | Filer reported “no” in this extract — **not** a clean-record badge |
| Indicator null | 1 RIA | Unresolved |
| Item 11A–11H categories | Present as attributes, internal-only on profiles | Category flags, still not verdicts |
| `disclosure_events` | 0 | No case-level enforcement census |
| External SEC litigation / FINRA actions | Not integrated as homepage evidence | Unavailable |
| ADV-W | 22,592 rows | Withdrawal history; not misconduct |

Homepage V1 may mention the indicator **only** with the limitation that it is an observation, not a grade, and is **not** one of the three featured stories (too easy to misread as a Disclosure Grade, which is forbidden).

Absence of a disclosure in researched sources is not proof that no issue exists.

---

# J. SOURCE / PROVENANCE READINESS

Every V1 homepage number must answer: what is counted, who is in/out, which source, which as-of/retrieved dates, which denominator, which limitation.

| Proposed metric | Traceable? | Source |
| --- | --- | --- |
| SEC IARD roster 23,622 | Yes | `iapd_sec_compilation` + ERA file in the same monthly pair; `form_adv_firm_facts` |
| RIA 17,018 / ERA 6,604 | Yes | `dataset_kind` / `firm_kinds` |
| Wave-1 1,000 | Yes | `search_documents.indexable` (content gate) |
| RAUM bands | Yes | Item 5F(2)(c) on RIA facts |
| 5E compensation methods | Yes | `form_adv_reported_attributes` field_name 5E(*) |
| Principal-office by state | Yes, with 5,625 unresolved | Main-office branches |
| Extra 2,155 firms | Yes as an exclusion | Canonical firms minus facts |
| Client-type mix | **No** | 5D not present — omit |
| Dual-registered BD total | **No** as FINRA fact — omit |
| Professionals searchable | **No** as a public metric — omit |
| National AUM sum | **No** (outlier + filer quality) — omit |
| What Changed | **No** comparable vintage — omit |

Untraceable statistics do not go on the homepage.

Reuse existing provenance types in `packages/domain/src/provenance.ts` plus `MetricWithProvenance` in `packages/domain/src/investor-home-intel.ts`.

---

# K. HISTORICAL / CHANGE READINESS

| Capability | Classification | Why |
| --- | --- | --- |
| Filing version rows | PARTIAL | 635,269 `form_adv_filings` exist |
| Current roster snapshot | READY NOW | 23,622 `source_snapshots` / facts |
| Superseded current-row history for homepage comparison | NOT READY | No locked prior homepage vintage |
| Effective / retrieved dates | READY NOW | On facts + `source_releases` |
| Source fingerprints | PARTIAL | Some releases have SHA-256; some ADV-W/Part2 labels have empty checksum |
| Immutable raw storage | PARTIAL | Snapshots exist; not all families equally archived |
| Structured versions for “what changed in the market” | NOT READY | Would fake change detection |

**What Changed module: NOT READY.** `changeModule.status = UNSUPPORTED`.

ADV-W and filing history remain profile/internal evidence, not a national CHANGE story.

---

# L. SEARCH READINESS

## Firm search — LIVE

- Route: `/firms` (`force-dynamic`)
- Parser: `parseFirmSearchInput` — firm name, CRD, SEC file number (`801`/`802`/`803`/`8-` patterns), principal-office state, `_none` for missing state
- Backend: `searchOfficialFirms` + `unstable_cache` 120s
- Result type: **firm** only
- Empty state: official IAPD home + SEC catalog links (`OFFICIAL_IAPD_HOME`, `OFFICIAL_SEC_ADV_CATALOG`)
- Directory metrics cached 300s
- Query-result pages: `indexable: false`; bare `/firms`: indexable on production host
- Synthetic firms: 0 in production DB; synthetic firm slugs stay noindex

## Professional search — UNAVAILABLE (placeholder)

- `/professionals` filters **labeled synthetic fixtures**
- Copy on the page already admits this is not live CRD/IAPD search
- Homepage hero CTA currently contradicts that honesty
- Individual CRD data exists internally and must not be advertised until publication rules exist

## Other identifiers

- CIK exists on 4,884 firms — **not** a first-class search parser field today
- Professional names / individual CRD — not in firm search

V1 homepage search copy: **Firm name, CRD, or SEC file number.** Not “firm, professional, CRD, SEC file number.”

---

# M. TOOL / ROUTE INVENTORY

| Route | Classification | Homepage CTA |
| --- | --- | --- |
| `/firms` firm search | LIVE | Allowed |
| `/firm/[slug]` Wave-1 Trust Reports | LIVE BUT LIMITED (1,000 indexable; others may resolve but stay noindex unless gated) | Allowed as “read a Trust Report” into the directory, not as 25,777 public profiles |
| `/methodology` | LIVE | Allowed |
| `/sources` | LIVE | Allowed |
| `/research` | LIVE BUT LIMITED (educational questions, not a live offer-verifier) | Allowed as education, not as a built tool |
| `/about` | LIVE | Allowed |
| `/disclaimer` `/privacy` `/terms` | LIVE | Footer only |
| `/professionals` `/professional/[slug]` | PLACEHOLDER (synthetic) | **Not allowed** |
| `/compare` | PLACEHOLDER | Not allowed |
| `/tools` Decision Lab | NOT IMPLEMENTED | Not allowed |
| `/my-investor-trust-hub` | PLACEHOLDER (no accounts) | Not allowed |
| `/fund/[slug]` `/company/[slug]` | PLACEHOLDER / reserved | Not allowed |
| `/internal/sec-adv` | INTERNAL | Not allowed |

`robots.ts` disallows `/professional/`, `/fund/`, `/company/`, `/compare`, `/my-investor-trust-hub`, `/internal/`. It does **not** disallow `/professionals` (listing) or `/firm/` (per-page `indexable` flag). **Do not change this in INV-HOME-001 or accidentally in INV-HOME-002.**

---

# N. `investor-home-intel-v1` CONTRACT

Repo-aligned types live in `packages/domain/src/investor-home-intel.ts` and are re-exported from `packages/domain/src/index.ts`.

Implementation rule for INV-HOME-002:

- One server-side / precomputed payload.
- No browser queries against 5.1M ADV attributes.
- `score: null`, `ranking: null` always.
- `changeModule.status: 'UNSUPPORTED'`.
- `clientTypes` omitted (`never`) until 5D is actually present.
- `geography.registrationByState` omitted until notice-filing is a real national series.

Conceptual payload (locked fields):

```ts
type InvestorHomeIntelV1 = {
  contract: 'investor-home-intel-v1';
  generatedAt: string;
  payloadFingerprint: string;
  score: null;
  ranking: null;
  changeModule: { status: 'UNSUPPORTED'; reason: string };
  metadata: {
    canonicalUrl: 'https://www.investortrusthub.com/';
    primarySourceDataset: 'iapd_sec_compilation';
    primaryReleaseLabel?: string;
    retrievedAt?: string;
    publishedAt?: string;
  };
  populations: {
    firms: {
      secIardRoster: 23622;
      ria: 17018;
      era: 6604;
      indexableTrustReports: 1000;
      canonicalFirmsIncludingNonRoster: 25777; // exclusion / methodology only
    };
    professionals: {
      ingestedPeople: number;
      withIndividualCrd: number;
      associations: number;
      publicSearch: 'unavailable';
      publicProfiles: 'synthetic_only';
      status: 'unavailable';
    };
  };
  recordState: { universe: MetricWithProvenance[]; current: MetricWithProvenance[]; observations: MetricWithProvenance[]; geography: MetricWithProvenance[]; asOf: EvidenceDate[] };
  featuredFindings: FeaturedFinding[]; // exactly the three story IDs
  aumDistribution: DistributionWithProvenance; // RIA only
  feeStructures: DistributionWithProvenance; // 5E methods, RIA only
  disclosures?: DistributionWithProvenance; // optional, not a featured story
  geography: { principalOfficeByState: StateMetric[] };
  evidenceCoverage: EvidenceCoverageItem[];
  evidenceJourney: EvidenceJourneyStep[];
  sourceLedger: SourceLedgerItem[];
  limitations: string[]; // start from V1_LOCKED_LIMITATIONS
  tools: HomepageToolState[]; // V1_HOMEPAGE_TOOLS
};
```

Every displayed metric uses `MetricWithProvenance`:

- `metricId`, `label`, `value`
- `cohortDefinition`
- `sourceIds`
- `sourceAsOf` / `filingDate` / `retrievedAt` as applicable
- `denominator`
- `exclusions`
- `limitation` (required)
- `grain`

**PROPOSED FOR INV-HOME-002 (not created now):** either

1. a cached server builder that aggregates `form_adv_firm_facts` (23,622) plus filtered 5E attributes (not the full 5.1M scan in the request path), `unstable_cache` ≥ 1 hour; or
2. a committed/generated JSON artifact built by a read-only script.

No production migration is required to finish V1 if (1) or (2) is used.

---

# O. V1 STATE OF THE RECORD

Recommended metrics (each with provenance on the page):

1. **Universe — SEC IARD roster:** 23,622 firms. Cohort: current monthly RIA+ERA facts. Exclusion: 2,155 extra canonical firms; products; people.
2. **Current — RIA:** 17,018 (16,783 registered + 235 pending). ERA is not included.
3. **Current — ERA:** 6,604 reporting. ERA is not an RIA.
4. **Current — Wave-1 Trust Reports:** 1,000 indexable firm profiles. This is a publication cohort, not “the best 1,000.”
5. **Observations — ADV attributes:** 5,149,596 normalized Item observations supporting profiles/explorer — cite as evidence depth, not as a quality score.
6. **Geography — principal office known:** 17,997 roster firms with a region; **5,625 unresolved.**
7. **As-of:** IAPD SEC firm feed `IA_FIRM_SEC_Feed_08_27_2026`, published 2026-08-27, retrieved 2026-08-28 16:36Z.

Do **not** put on State of the Record:

- 25,777 as the headline universe
- 207,384 people as “professionals researched”
- 197,588 products
- summed national RAUM
- dual-registered BD count
- disclosure Y rate as a safety statistic

---

# P. V1 THREE NATIONAL STORIES

Exactly three. All **BENCHMARK**. No CHANGE story.

## 1. `sec-iard-ria-vs-era` — Market structure (BENCHMARK)

- **Cohort:** 23,622 SEC IARD roster firms (`form_adv_firm_facts`).
- **Metric:** 17,018 RIA vs 6,604 ERA.
- **Why useful:** Consumers confuse “on IARD” with “SEC-registered RIA.” This is the core classification lesson.
- **Visualization:** Split bars or two-count comparison with plain-English definitions.
- **Source:** IAPD SEC monthly RIA + ERA compilations (`IA_FIRM_SEC_Feed_08_27_2026`).
- **Limitation:** Extra 2,155 firms excluded. Pending RIA (235) stays inside RIA, labeled pending in methodology, not as approval. ERA must never be captioned as RIA.
- **Confidence:** high.
- **Ready for V1:** yes.

## 2. `ria-reported-raum-bands` — Reported regulatory AUM (BENCHMARK)

- **Cohort:** 17,018 RIA facts. ERA excluded (does not file 5F).
- **Metric:** Band counts in `V1_RIA_RAUM_BANDS` (zeros kept as their own band).
- **Why useful:** Explains reported firm-size structure without ranking quality.
- **Visualization:** Horizontal banded bars + text equivalent. No national dollar sum.
- **Source:** Form ADV Item 5F(2)(c) on the current RIA extract.
- **Limitation:** Filer-supplied. Zero ≠ missing. Not performance. Outlier max must not be headline. Bands are research conveniences, not SEC official size classes.
- **Confidence:** high.
- **Ready for V1:** yes.

## 3. `ria-compensation-methods-5e` — How RIAs report being paid (BENCHMARK)

- **Cohort:** 17,018 RIA facts. ERA = not filed.
- **Metric:** Item 5.E Y/N method flags (assets, hourly, subscription, fixed, commission, performance-based, other).
- **Why useful:** Teaches that compensation is a reported method set, not a recommendation and not a single “fee.”
- **Visualization:** Method flags / small-multiples bars with denominator 17,018. Never a dollar rate.
- **Source:** `form_adv_reported_attributes` 5E(1)–5E(7).
- **Limitation:** Methods overlap (a firm may check several). Not “fee-only.” Not a price. Brochure narrative is not reduced to these boxes.
- **Confidence:** high for Y/N completeness; medium for consumer interpretation (needs definitions).
- **Ready for V1:** yes.

### Rejected candidates (and why)

| Candidate | Decision |
| --- | --- |
| Client composition (5D) | NOT READY — fields not in source extract |
| Services (5G) | Data exists as flags; weaker than 5E for a first national story; keep for later explorer |
| Disclosures (Item 11) | Defensible counts; too easy to become a forbidden Disclosure Grade; keep in evidence coverage |
| Geography as featured story | Viable explorer; 23.8% unresolved makes a “national map story” misleading |
| Dual registration | NOT AVAILABLE FOR V1 NATIONAL METRIC |
| What Changed | NOT READY |

---

# Q. V1 EVIDENCE COVERAGE

This is evidence depth, not trustworthiness. No fake completeness percentages.

| Family | Status | Note |
| --- | --- | --- |
| Identity | Available for SEC firms | CRD universal on canonical firms; SEC# 23,621/23,622 |
| Registration | Available for SEC firms | RIA vs ERA; pending vs registered vs reporting |
| Ownership / affiliations | Partial | Schedule A/B + Item 6/7 flags; named links confidence-gated |
| Services / client types | Partial / source-limited | 5G flags exist; 5D client types not present |
| Fees / compensation | Available for SEC RIA firms | 5E methods only |
| Regulatory disclosures | Source-limited | Indicator + internal categories; 0 events |
| Geography | Partial | Principal office; 5,625 unresolved; no service territory |
| Professional relationships | Unavailable (public) | Internal rows exist; public product is synthetic |

---

# R. V1 EVIDENCE JOURNEY

Visual states: `connected` | `unavailable` | `source_conflict`. Never green “approved/safe.”

| Step | Source family | Implementation today | Status | Visual | Provenance pointer | Limitation |
| --- | --- | --- | --- | --- | --- | --- |
| SEC/IARD firm identity | IAPD / Form ADV | `firms` + identifiers | available | connected | CRD, legal/display name | Extra non-roster firms exist |
| CRD / SEC file number | IAPD | `firm_identifiers` | available | connected | crd; sec_file_number | One roster SEC# gap |
| Form ADV filing | Form ADV | facts + filings + snapshots | available | connected | latest_adv_filing_date; release | Current extract, not a change feed |
| Ownership / control | Schedule A/B | owner entities + rows | partial | connected | Schedule A/B provenance | Public subset only |
| Services / clients / fees | Items 5.G / 5.D / 5.E | reported_attributes | partial | connected for 5E/5G; unavailable for 5D | field_name + presence_status | 5D missing; ERA not filed |
| Regulatory disclosures | Item 11 | disclosure_indicator; empty events | partial | connected (indicator) / unavailable (cases) | indicator Y/N | Not misconduct; not complete universe of issues |
| Professional relationships | IAPD IAR compilation | associations + people | unavailable (public) | unavailable | internal CRD only | Synthetic public directory |
| InvestorTrustHub profile | Publication gate | 1,000 indexable Trust Reports | partial | connected | `search_documents.indexable` | Wave 1, not all roster firms |

---

# S. FORM ADV EXPLORER READINESS

Do **not** build Form ADV Explorer in homepage V1. It belongs in **V1.1 / later** as a profile or dedicated route.

| Explorer question | Rating | Why |
| --- | --- | --- |
| Who owns/controls the firm? | PARTIAL | A/B present; public confidence gates; name-only hidden |
| How large is the firm? | READY | RIA RAUM; ERA N/A |
| Who does it serve? | NOT READY | 5D not in extract |
| What services does it report? | PARTIAL | 5G Y/N flags |
| What compensation/fee structures are reported? | PARTIAL | 5E methods, not rates |
| What custody information is reported? | PARTIAL | Item 9 Y/N on profiles |
| What disciplinary disclosures are reported? | PARTIAL | Indicator; categories internal; no events |
| What affiliations/other business activities are reported? | PARTIAL | Item 6/7 flags; not FINRA |

**Overall: PARTIAL.** Homepage V1 should link to methodology + a Wave-1 Trust Report, not ship an Explorer module.

---

# T. V1 HOMEPAGE COMPONENT MAP

Implement in INV-HOME-002 against TrustHub Intelligence OS V1.1, using Investor copy and this payload. Do not invent V1.2.

| # | Section | Source | Notes |
| --- | --- | --- | --- |
| 1 | Intelligence Hero | Static copy + firm search CTA to `/firms` | H1 can keep “Research before you invest.” Primary CTA: research a **firm**. Optional CRD/SEC# hint. No professional CTA. |
| 2 | State of the Record | `recordState` + `populations.firms` | Four to six provenanced numbers. Trace This Number on each. |
| 3 | What the Data Says | `featuredFindings` | Exactly the three stories. Definitions for RIA, ERA, RAUM, 5.E. |
| 4 | Evidence Depth | `evidenceCoverage` | Qualitative families. Not a score. |
| 5 | Explore the Market | `geography.principalOfficeByState` + link to `/firms?state=` | Unresolved explicit. No “serves.” Map optional; table acceptable if map would clip on mobile. |
| 6 | Ask the Market | Existing `RESEARCH_QUESTIONS` → `/research` and `/firms` | Educational. Not an LLM that picks advisers. |
| 7 | Use the Research | `tools` where `homepageCtaAllowed` | Firms, methodology, sources, research questions. Not Decision Lab, compare, save, professionals. |
| 8 | Evidence / Sources / Limitations | `sourceLedger` + `limitations` | Include IAPD catalog URL, retrieve dates, ERA≠RIA, RAUM≠performance, missing≠clean. |

Tone: institutional, calm, evidence-heavy, non-promotional. Not a Bloomberg terminal.

Reuse: `SiteHeader`/`SiteFooter`, `StatusLegend`, `pageMetadata`, chassis tokens, firm search form patterns.

---

# U. MOBILE / ACCESSIBILITY CONTRACT

Acceptance criteria for INV-HOME-002 (not implemented here).

Current baseline: skip link, `main#main`, sticky header drawer with Escape/focus, production overflow **0** at 1440 / 768 / 390. Homepage H1 is a real heading. Search lives on `/firms`, not the homepage today — V1 hero search must be labeled.

INV-HOME-002 must:

- Keep horizontal overflow = 0 at ~1440, 768–1024, 390–430.
- Stack cards; no unreadably small charts; text equivalent for every chart.
- No hover-only information.
- Search remains prominent and keyboard-reachable; form controls labeled.
- Evidence/provenance in expand-collapse, not a giant table on mobile.
- Touch targets ≥ 44px on primary CTAs (existing `th-btn-hero` pattern).
- Visible focus; color contrast on teal/navy/paper tokens.
- Define RIA, ERA, ADV, CRD, AUM, BD in plain English near first use.
- Drawer/dialog: existing header semantics; do not trap focus incorrectly.
- Link names must not be “click here.”
- Do not use color alone to mean RIA vs ERA.

---

# V. SEO CONTRACT

**Do not change Wave-1 firm indexability, `SITE_INDEXING_ENABLED`, `INDEXABLE_HOSTS`, preview noindex, or sitemap cohort size in INV-HOME-002 unless a later task explicitly says so.**

Current homepage:

- Indexable on production hosts
- Canonical `https://www.investortrusthub.com/`
- Organization JSON-LD only
- `/professionals` is currently in `INDEXABLE_PATHS` even though it is synthetic — **out of scope to change here**; V1 homepage must not send link equity copy that claims live professional search

Recommended future homepage metadata (INV-HOME-002, still index,follow on canonical hosts):

- Title: keep mission phrasing; may add “SEC/IARD firm research” without “top advisers”
- Description: firms, Form ADV evidence, no professional-search promise
- H1: mission line
- JSON-LD: keep Organization; optional WebSite with SearchAction **only if** it targets `/firms` (not `/professionals`)
- OG/Twitter: existing share image pipeline
- Sitemap: homepage weekly remains correct; still Wave-1 firms only

Forbidden metadata: best/top/safest, SEC approved, FINRA approved, trust score.

---

# W. PERFORMANCE CONTRACT

Current homepage: static RSC, no ADV query, modest client JS (header drawer). Fonts: Inter + Source Serif 4 with `display: swap`. CLS risk is low (no homepage charts today). `/firms` already caches metrics/search.

INV-HOME-002 must:

- Render `investor-home-intel-v1` on the server (RSC).
- Precompute or cache aggregates; never ship 5.1M rows to the browser.
- Prefer CSS/SVG or small server-rendered bars over heavy client chart libraries.
- Keep images to existing OG/logo assets.
- Target no layout-shifting metric counters (reserve space).
- Revalidate payload on the order of hours, not per request against raw attributes.
- If a builder must read reported_attributes, filter `field_name IN (5E…)` server-side.

Homepage should not become a dashboard that queries Postgres from the client.

---

# X. TEST BASELINE

Commands run in worktree `C:\Users\makei\investor-trust-hub-inv-home-001` during INV-HOME-001:

| Command | Result | Notes |
| --- | --- | --- |
| Read-only Python census scripts | PASS | Wrote `docs/inv-home-001-census.json` and `docs/inv-home-001-census-extra.json` |
| `npm test -- packages/domain/tests/investor-home-intel.test.ts` | PASS | 8 tests; locks ERA≠RIA, 23,622, 1,000, RAUM partition, no professional CTA |
| `npm test` | PASS | 16 files, 85 tests |
| `npm run typecheck` | PASS | All workspaces `tsc --noEmit` |
| Production homepage overflow evaluate | PASS | 0 overflow at 1440/768/390 |
| Chrome MCP screenshot to disk | FAIL | Path not in MCP workspace roots — pre-existing tool constraint, not a product defect |
| `npm run ci` full suite | Not used to “fix” unrelated failures | INV-HOME-001 must not silently repair unrelated lint/e2e |

No production smoke mutation. Live GET of `/` only.

If `npm run lint` / `npm test` / `npm run typecheck` report failures that exist on `ec6ee5b` without this branch’s files, record them as pre-existing and do not “fix” them as homepage work.

---

# Y. BLOCKERS

None that block INV-HOME-002 from building the national homepage from existing data.

Non-blocking constraints (must not be treated as license to ingest):

1. Professional public search is not ready — change copy, do not scrape BrokerCheck or publish IAR pages in INV-HOME-002.
2. Item 5.D client types are not in the extract — omit the story; do not start a new national ingest for it.
3. FINRA dual-registration is not available — omit.
4. What Changed is not ready — omit.
5. Screenshot PNG artifacts were not persisted via MCP — overflow measurements stand.
6. Extra 2,155 firms must remain an exclusion, not a mystery total mixed into RIA+ERA.

No canonical-domain / SHA / database-binding HARD STOP.

---

# Z. RECOMMENDED INV-HOME-002 SCOPE

**INV-HOME-002 — National Intelligence Homepage Implementation**

Build the production homepage from this locked contract. Do not redesign identity, ADV parsing, Wave-1 indexability, or professional publication.

### In scope

1. Implement a server builder for `investor-home-intel-v1` using existing tables (`form_adv_firm_facts`, filtered attributes, main-office branches, `search_documents`, `source_releases`). Cache or precompute. Fingerprint the payload.
2. Replace `/` composition with Intelligence OS sections 1–8 in section T. Keep chassis/header/footer.
3. Change hero CTA from `/professionals` to `/firms`. Search copy: firm name, CRD, SEC file number.
4. Relabel or demote the professional `HOME_PATHS` card so it is not “Foundation.”
5. Render exactly three findings (`V1_FEATURED_STORY_IDS`) with provenance, definitions, and limitations.
6. State of the Record using section O metrics only.
7. Principal-office explorer with unresolved 5,625 and links into `/firms?state=`.
8. Source ledger + `V1_LOCKED_LIMITATIONS`.
9. Tools row only where `homepageCtaAllowed`.
10. Tests: contract/census lock, copy guardrails (no best/top/score/SEC approved/professional-search promise), overflow at 1440/768/390, SEO robots still noindex preview, Wave-1 still 1,000.
11. Visual QA on production **preview**, not a silent Production promote unless the operator explicitly promotes later.

### Out of scope

- Production promote as an automatic step (operator-gated)
- Wave 2 expansion
- New federal/state ingest, BrokerCheck, IAR public pages
- Form ADV Explorer UI
- Compare, Decision Lab, accounts
- What Changed
- Client-type or dual-registration metrics
- Materialized production schema unless the builder cannot meet performance — if needed, `PROPOSED` a cache table in the INV-HOME-002 report first
- Changing `search_documents.indexable` semantics

### Copy guardrails (absolute)

No top/best advisers, no scores/grades, no SEC/FINRA endorsement, no clean-record from missing data, no AUM-as-performance, no principal-office-as-territory, no name-only joins.

### Success

Preview homepage tells the truth about 23,622 SEC IARD firms, 17,018 RIA vs 6,604 ERA, RIA RAUM bands, and RIA 5.E methods, with traceable provenance — and does not promise professional search.
