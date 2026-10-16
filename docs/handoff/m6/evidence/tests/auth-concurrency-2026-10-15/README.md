# Auth concurrency evidence — 2026-10-15

Read [the detailed report](../../../M6_AUTH_CONCURRENCY_2026_10_15.md), `summary.json` and `source-manifest.json`. This fixes M6-B9 and related refresh/logout/failed-attempt races without changing the public auth contract. The wider project remains PARTIAL / NOT_READY.

- `auth-login-before-result.json`: fresh six-pair 200/500 reproduction before the patch.
- `api-auth-before-result.json`: 14 groups, four genuine concurrency failures before the fix.
- `backend-before-summary.json`: three real PostgreSQL red regressions.
- `backend-after-summary.json` / `harness-corrections.json`: intermediate test-fixture Instant→Timestamp correction, not a product workaround.
- `backend-final-summary.json` / `backend-auth-scoped-summary.json`: final 77 targeted tests, including 17 H2 + 17 PostgreSQL concurrency/behavior cases.
- `backend-suite-summary.json`: final full Maven suite, PostgreSQL/MinIO enabled; targeted totals are included, not additional.
- `api-auth-after-result.json`: final 14 HTTP/PostgreSQL groups, full auth payload/response shape checks, concurrency and exact-token logout policy.
- `browser-auth-result.json`: actual three-portal login/refresh/logout/protected-route checks and simultaneous login from two independent browsers.

## Re-run on disposable data only

Copy scripts to `work/uav-auth-concurrency-20261015` under `/Volumes/D/Codex/projects/uav-pas-platform`. Confirm isolated ports free. Use `runtime.py infra`, `runtime.py backend`, `runtime.py seed`; run root/legacy `gates.py` and `backend-gates.py`. `api-auth.mjs` reads `UAV_BROWSER_WORK` and `UAV_AUTH_PHASE=before|after`. Its SQL fixtures are restricted to the owned Compose container.

For browser natural expiry, stop only the owned backend (`runtime.py stop-backend`), set `APP_JWT_EXPIRATION_MS=5000` inside the private work env file, restart backend, then `runtime.py frontends`. Do not change product config. Set `UAV_BROWSER_WORK`, `UAV_BROWSER_SCREENSHOTS`, `UAV_AUTH_ACCESS_TTL_MS=5000`, `PLAYWRIGHT_MODULE`, `CHROMIUM_EXECUTABLE`, and run `browser-auth.mjs` with Node20. Do not run another same-account login suite while the browser session cases are active.

Scripts retain tokens in memory only. Published evidence omits credentials, auth response bodies, tokens, signed URLs, HAR and browser storage snapshots. After checks, run `runtime.py cleanup`, remove owned raw test targets, verify source fingerprints and `git diff --check`. No commit/push/deploy is part of this work.
