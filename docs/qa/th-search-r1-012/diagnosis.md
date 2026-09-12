# TH-SEARCH-R1-012 baseline diagnosis

Model: GPT-6 Astra / High — USER-CONFIRMED; no independent active-session metadata or setting change claimed.

Starting origin/main: e1f57a1b5092233892365f1c02a21b2cc935a2f5. Verified Investor remote, root AGENTS.md, open PRs and all registered local worktree statuses. No visible overlapping ticket assignment; two unrelated dirty worktrees remain untouched. Fresh branch/worktree th-search-r1-012. New York PR #29 is already merged and protected.

Production observations on 2026-09-12: portfolio management becomes Name contains; unspecified Form ADV requests execute an unfiltered cohort; Austin/Texas becomes principal-office TX; Wyoming state-RIA language executes the WY office predicate. These are still failing. The Form ADV definition is already correct. Existing state-specific guards protect some NY/VA/CO phrases but do not establish a general registration contract.

Root causes: permissive simple-name fallback; missing task/identity requirement; state-before-city interpretation; one geography variable reused for regulatory language; separate native English-appended filters versus API q/page. SQL already supports exact city, but without simultaneous state. Several count/aggregate paths independently reassemble filters. Exact CRD capture stops at the first digit group. Public API projection omits some interpretation fields.

## Source and capability matrix

| Source | Established grain | Use in this ticket |
| --- | --- | --- |
| Current SEC/IARD firm facts + CRD + main-office branches | Firm RIA/ERA, SEC status, principal-office city/state, current ADV fields | Existing bounded exact/name/office/RAUM execution; compound predicates |
| Operational registrations | SEC registered RIA, SEC pending RIA, SEC reporting ERA only in inspected non-synthetic rows | Never substitute for state IA or notice filing |
| CO/VA/NY published state snapshots | StateRgstn jurisdiction + APPROVED, separate ERA and NoticeFiled grains | Preserve published state research and relevant recovery; no new cohort/index/publication |
| Item 11 disclosure catalog | INTERNAL_ONLY | No new disclosure cohort or private field publication; exact identity and honest evidence limitation with official recovery |
| Source release metadata for state compilation | Acquired release exists, not equivalent to executable published state-registration rows | Do not infer Wyoming approval from mere source presence or principal office |

Read-only independent SQL found Austin/TX 176 RIA and 65 ERA current firm-fact rows in the inspected window. These are QA observations, not permanent test constants. CRD 105958 is VANGUARD GROUP INC, Malvern/PA. The SEC compilation release is 2026-08-27, retrieved 2026-08-28T16:36:30.264282Z, SHA256 967217b0cdb4548f496407f7232eff30deba12217c36447fad0cee757473b65c. No data writes or acquisition.

Plan: strengthen the existing interpreter/executor with typed operation and distinct conditions; keep exact identifier precedence; require identity for firm evidence; use bounded source-name candidates and server-revalidated selection; apply office city/state before count/order/pagination; preserve unsupported registration/evidence meaning and give relevant working actions. Unify native/API typed overrides and validate full input. Add behavioral source-predicate and negative-invocation tests, mutation sensitivity, independent review pass and bounded browser proof before normal release.
