# Maintenance and UAV redispatch evidence — 2026-10-15

Read `summary.json` and `../../../M6_UAV_MAINTENANCE_REDISPATCH_2026_10_15.md` for scope/results. `source-manifest.json` identifies the dirty working tree actually tested.

- `backend-suite-summary.json`: full Maven suite with PostgreSQL/MinIO opt-in, zero skipped expected.
- `maintenance-test-summary.json`, `dispatch-*-summary.json`, `assignment-validation-test-summary.json`: before/after targeted regressions. Do not add their counts to the full-suite count.
- `browser-result.json`: main three-role mission UI with real upload/download and admin audit.
- `maintenance-dispatch-ui-result.json`: new maintenance/redispatch UI; one group is API fixture setup.
- `browser-negative-result.json`: stale forms, orphan repair, wrong operator, fail/cancel states; mode fields distinguish UI and API assertions.
- `browser-negative-ux-before-result.json`: intentional failing alert focus/viewport check before UI fix; preserved as before evidence, not final failure.
- `api-negative-result.json`: real PostgreSQL HTTP concurrency, ownership and input validation.
- `first-runtime-observation.json`: missing quantity produced500; resolved by business DTO validation, no auth changes.
- `harness-corrections.json`: harness assumptions corrected without relaxing business expectations.

## Re-run (disposable only)

Scripts expect repository `/Volumes/D/Codex/projects/uav-pas-platform` and private work directory `work/uav-dispatch-20261015`; copy scripts there before use. Run `runtime.py infra`, `runtime.py backend`, `runtime.py seed`, `gates.py root`, `gates.py legacy`, `backend-gates.py`, then `runtime.py frontends`. Check that isolated ports are free before starting. Do not reuse a production database.

Browser scripts read `UAV_BROWSER_WORK`, `UAV_BROWSER_SCREENSHOTS`, `PLAYWRIGHT_MODULE`, `CHROMIUM_EXECUTABLE`; use an installed Playwright and Chromium and output screenshots under `/Volumes/D/Codex/outputs`. Node20 is required by this verification environment. No browser storage state, passwords, bearer tokens or signed URLs are written. API script requires only `UAV_BROWSER_WORK`. Browser-negative SQL fixture uses only the owned `uav-ui-dispatch-20261015-postgres-1` container. See script constants before rerunning.

Finally run `runtime.py cleanup`, remove test target report directories that may contain generated framework passwords, and check `git diff --check`. No commit/push/deploy is part of these scripts.
