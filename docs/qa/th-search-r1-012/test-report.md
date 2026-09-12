# TH-SEARCH-R1-012 observed checks

Baseline: e1f57a1b5092233892365f1c02a21b2cc935a2f5, detached baseline worktree. Original defect gate: 5 failures, 1 pass. Portfolio/name fallback, unspecified Form ADV/disclosure, lost Austin city and registration/office substitution failed. Form ADV definition was already correct and remains protected. Baseline full suite: 251 tests passed; typecheck and lint passed.

Candidate: focused gate and complete repository suite execute real domain planning, SQL construction, source selection through an instrumented fixture adapter, public GET, native page rendering and structured execution. Fixtures deliberately separate city/state, RIA/ERA, office versus registration, held profiles and similarly named firms. No fixture writes to Production.

Three temporary mutations were detected: restoring portfolio-to-name fallback; replacing state registration with office state; removing the SQL city predicate. Logs and mutations.json retain actual failure evidence. All mutations were restored before clean tests/build/browser runs.

The existing oversized-query test expected silent truncation. It now expects INVALID_INPUT with no lookup, as required by this ticket; the 400-character bound is unchanged. Vitest uses the app's automatic JSX transform and @ alias to execute actual page rendering rather than a duplicate renderer.

Initial browser evidence is retained honestly: all 24 core cases passed, but URL-glob navigation assertions failed; corrected parameter assertions reached the selection flows. The 320px long intent label was a real layout issue and was repaired. The edit-to-miss assertion then exposed labeled CRD being inferred again as a name; this was a new implementation defect, corrected and covered by a regression. Final certification must use the final successful report, not these earlier reports.

Scope checks: supported Austin principal-office cohort is selected with city AND state before pagination. Independent read-only SQL observed 176 RIA and 65 ERA rows in this source window, kept as distinct classes, with combined unqualified list total 241. This is not a permanent count assertion. Wyoming approval is unavailable in the searchable published roster, so the retained registration condition receives a capability limitation and official recovery, never a Wyoming office substitute. NY/VA/CO state research remains on its existing published routes.

Official IAPD landing was opened in an authorized browser; observed firm CRD/SEC search controls. No live firm registration determination is claimed. Static URL policy is covered in the focused gate.

Regression coverage includes existing identity, structured API, RAUM, state intelligence, publication, claims/customer, metrics, sitemap/robots and bundle-secret tests. Additional NY, VA, CO, metrics and visual scripts passed. No gate relaxation or dependency upgrade. Existing npm audit reports eight findings (2 moderate, 5 high, 1 critical); no dependency changes in scope. Windows build reports an existing multiple-lockfile root warning; build succeeds without changing global files.

Review: separate self-review and automated checks; no independent human review claimed. CI additionally runs Python ingestion and isolated PostgreSQL fixture/migration jobs. Local tests do not write Production data. CI outcomes and exact release identities will be appended after they exist.

Final local result: focused 87/87 (57 new ticket tests), repository 308/308, typecheck/lint/build PASS. Optimized browser 24 cases + 10 flows, zero failures/page errors at 320/390/768/1280; core completion 99?1310 ms. See local-pass-browser.json.

Final release: 93 focused/63 R1-012, 322 repository tests across 48 files after preserving Illinois main; typecheck/lint/build PASS. CI browser 12/12; ingestion/database/metrics/preview/review PASS. Final optimized local and canonical Production each passed 24 cases + 10 flows at all four widths. Production core completion 246-4481 ms. Source-clock assertion is included; initial production-browser.json alone was not the final certificate. Final runtime deployment dpl_2R88zjWs3dfowVKrjoeKFxHJWgg4, SHA 12c995346dc8fc1daf97b06fd072fd4dc1096bbf.
