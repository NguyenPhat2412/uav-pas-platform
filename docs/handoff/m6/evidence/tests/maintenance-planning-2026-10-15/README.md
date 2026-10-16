# Maintenance planning evidence — 2026-10-15

Read `summary.json` and [the detailed report](../../../M6_MAINTENANCE_PLANNING_2026_10_15.md). Maintenance scope is complete; the project remains PARTIAL / NOT_READY. Concurrent same-account login has a real unresolved failure, explicitly preserved in `auth-concurrency-observation.json`.

- `backend-suite-summary.json`: final full Maven suite with PostgreSQL/MinIO enabled, 356 tests, zero skipped.
- `backend-maintenance-scoped-summary.json`, `backend-package-alignment-summary.json`: targeted checks, already included in the full-suite total. `full-suite-first-failures.json` records the earlier architecture failure, fixed before the final run.
- `api-maintenance-result.json`: 9 HTTP/PostgreSQL groups for permission, lifecycle, cost/rounding, stale edits, concurrency, busy UAV and rollback guards. This is API coverage.
- `maintenance-happy-ui-result.json`: 14 groups including API fixture setup; actual UI schedule/order/material/start/complete/cancel workflow with authoritative read-back.
- `browser-maintenance-negative-result.json`: 10 groups including API fixture setup; mode fields distinguish browser actions, concurrent API actors and read-back.
- `maintenance-audit-ui-result.json`: 2 final Vietnamese audit checks. Before-translation result only asserted record presence; the screenshot identified the missing translations.
- `maintenance-pagination-before-result.json`, `maintenance-pagination-stale-cache-before-result.json` and `maintenance-pagination-result.json`: actual empty-page failure, intermediate stale-count failure and repaired UI path when the last matching item disappears from page two.
- `browser-result.json`, `maintenance-dispatch-ui-result.json`, `api-negative-result.json`: main mission and previous UAV redispatch regressions repeated on final sources.
- `source-manifest.json`: baseline versus tested working tree, auth/security unchanged, old migrations unchanged.

## Re-run on disposable data only

Scripts expect `/Volumes/D/Codex/projects/uav-pas-platform` and `work/uav-maintenance-planning-20261015`; copy the scripts into that work directory. Verify isolated ports are free. Run `runtime.py infra`, `runtime.py backend`, `runtime.py seed`, `gates.py root`, `gates.py legacy`, `backend-gates.py`, then `runtime.py frontends`. Use Node20 and installed Playwright/Chromium; no new dependency installation is required.

Browser scripts read `UAV_BROWSER_WORK`, `UAV_BROWSER_SCREENSHOTS`, `PLAYWRIGHT_MODULE`, `CHROMIUM_EXECUTABLE`. API scripts need `UAV_BROWSER_WORK`. Run suites sequentially, because concurrent login to the same account exposes the separately documented auth race. Audit UI must follow maintenance happy UI because it checks that completed order. Scripts label API fixture setup separately from browser coverage.

Evidence omits passwords, bearer/refresh tokens, browser storage state and signed URLs. Only method/path/status network metadata is retained. Finally run `runtime.py cleanup`, remove the owned test target directories (raw test reports can contain generated framework passwords), and verify cleanup and `git diff --check`. No commit, push or deployment is part of these scripts.
