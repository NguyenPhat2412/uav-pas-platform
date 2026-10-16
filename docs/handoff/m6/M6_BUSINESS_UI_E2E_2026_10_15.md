# M6 — authenticated business UI verification, 2026-10-15

> **Cập nhật tích hợp main — 16/10/2026:** xem [M6_MAIN_INTEGRATION_2026_10_16.md](M6_MAIN_INTEGRATION_2026_10_16.md) cho source và kiểm chứng mới nhất. Phần dưới giữ lịch sử của nhánh/lượt kiểm tương ứng; migration hồ sơ hiện là V10, bảo trì là V9, auth browser giữ cookie của main. Toàn hệ thống vẫn PARTIAL / NOT_READY.

**Result: PASS for the local synthetic main workflow and selected negative/session checks. Overall M1–M6 remains PARTIAL / NOT_READY.**

Baseline: branch `codex/m1-monorepo-foundation`, HEAD `65d1b23da3d888d1ef8120462f2689da8cffd7cb`, initially clean. This continuation has an uncommitted product/test/documentation patch. `evidence/tests/ui-business-2026-10-15/summary.json` records the SHA-256 of each tested changed product/test file. No backend source, auth contract, dependency version, Git history, remote branch or production deployment changed.

## Reproduced failures and fixes

| Finding | Before | Fix | Verification |
|---|---|---|---|
| UI-01 — signed media upload | Operator reached IN_PROGRESS, but upload displayed `Request failed with status 400`. Shared API client automatically attached the application's bearer token to a MinIO presigned PUT. Legacy client had the same automatic forwarding logic. | Automatic bearer, refresh/retry and permission invalidation now apply only to the configured API origin in both clients. Explicit caller-provided headers retain their contract. | New origin-boundary tests failed on both clients before the patch and pass afterwards. Actual browser upload, attach, customer download and content assertion pass. |
| UI-02 — stale customer action | Two tabs opened the same draft. First submitted successfully; the second received 409 `MISSION_INVALID_STATUS`, raised an unhandled rejection and stayed at DRAFT without an application error message. | Use the mutation's handled callback API, show an accessible error, disable the pending button, and invalidate/refetch mission/list/timeline after either success or failure. Clear an earlier action error before starting another action. | Actual stale-tab 409 renders the Vietnamese message, reloads PENDING_CONFIRMATION and produces no page error. A subsequent cancellation renders CANCELLED and clears the old error. |
| UI-03 — operator overview | Operator overview called `/api/v1/dashboard/missions` without `DASHBOARD_MISSION`, receiving 403. | Wait for effective permissions, call only permitted summary APIs, discard late effects and render a link to assigned missions for accounts without aggregate permission. | Operator overview renders the scoped explanation; final happy-path run has zero unexpected API failures and zero browser console/page errors. |

## Environment and real workflow

Browser plugin not available; regular Playwright Chromium used with dedicated browser contexts. Node 20.20.2; frontend origins `http://localhost:3101`, `:3102`, `:3103`; backend `http://127.0.0.1:18080`; disposable PostgreSQL `55444`; disposable MinIO `9014`. Public app `3100` was started and included in build regression; this run did not re-test its public content/SEO behavior. Port 8080 and unrelated containers were untouched.

Operations/Admin Turbopack dev initially failed loading the native CSS binary under the host's mixed Node runtimes. The browser run used Node 20 and `next dev --webpack` for those two apps. The normal production `next build` commands later passed using Turbopack. This was an environment issue, not a dependency/source patch.

Fixture setup registered four unique synthetic users, assigned the operator/admin roles only inside the disposable database, and created station/UAV/equipment stock via APIs. Fixtures are prerequisites, not proof of administration CRUD through the UI. No mission lifecycle endpoint was called directly by the happy-path harness: all mission transitions, upload and download were initiated by UI controls against real backend/storage services; no business responses were mocked.

Main interaction sequence:

1. Customer login → create draft → submit → PENDING_CONFIRMATION.
2. Admin logs into Operations → confirm → assign station, UAV, operator and equipment → RESOURCE_RESERVED.
3. Operator logs into a separate browser context → accept assignment.
4. Admin marks ready → operator starts → uploads a synthetic text result → completes.
5. Customer reloads the mission → sees COMPLETED, timeline and media → downloads and verifies actual file content.
6. Admin logs into Admin portal → audit page → verifies a COMPLETED row for that mission.
7. Desktop 1440×1000 and mobile 390×844 screenshots, page overflow and navigation controls are checked. Audit uses an intentionally horizontally scrollable table on mobile.

Admin readiness matches the current UI; this run does not claim operator readiness controls. Each origin is logged into separately. This is not SSO.

## Acceptance and evidence

Evidence base: `evidence/tests/ui-business-2026-10-15/`.

| Group | Result | Evidence / scope |
|---|---|---|
| Main authenticated business UI | PASS | `browser-result.json`: 23 named checks covering workflow, audit, selected responsive navigation and no unexpected API/browser errors |
| Ownership and stale-action recovery | PASS | `negative-result.json`: customer B direct-ID 403 with no media control, empty own list, admin audit page, stale-submit 409 recovery, and successful cancellation after recovery with no stale error |
| Natural session expiry | PASS | `session-result.json`: customer/operator/admin each encounter actual expiry (disposable access TTL 5000 ms), observe 401→refresh 200, retain protected page, logout 200 and redirect to login afterwards; operator denied admin user table |
| FE root workspaces | PASS | `root-{lint,typecheck,test,build}.log`: 4 apps + 7 shared packages; each command exit 0 |
| Legacy FE | PASS | `legacy-{lint,typecheck,test,build}.log`: each exit 0; existing 5 session tests plus 2 origin-boundary tests |
| Backend default suite | PASS with explicit infrastructure skips | `backend-tests-summary.log`: 205 tests, 0 failures/errors, 7 skipped |
| PostgreSQL/MinIO/migration suite | PASS | `infra-tests-summary.log`: those 7 infrastructure tests run separately, 0 skipped/failures/errors |
| SSO/CSRF contract change | BLOCKED pending approval | No change implemented; JSON bearer/localStorage remains origin-local |
| Staging / hosted CI / complete security coverage | NOT_VERIFIED in this run | Local UI evidence does not close these gates |

Screenshots in `screenshots/`: customer-completed, operator-completed, admin-audit, customer-mobile, operator-mobile, admin-mobile, customer-b-denied, customer-conflict-recovered. Copies are also under `/Volumes/D/Codex/outputs/uav-ui-business-20261015/`.

`before-media-fix.json` and `before-conflict-fix.json` preserve partial pre-fix observations. Early harness failures (an exact-text selector that omitted the media role, assuming Customer had a drawer menu, and login before backend readiness) were corrected in the harness and are not classified as product failures. Final evidence comes from the saved replay scripts.

## Commands and replay prerequisites

Run from the repository root, using a working Node/npm installation consistently on PATH. Start `docker-compose.stabilization.yml` under a **new disposable `uav-ui-*` Compose project** with freshly generated credentials supplied through the environment, then start Spring with the stabilization profile, isolated database/storage bindings and `SERVER_PORT=18080`. Allow exact frontend origins, enable the test bucket and set storage CORS for `http://localhost:3102`. Wait for `/actuator/health/readiness` to return 200 before browser login. Start the three portal dev servers with `NEXT_PUBLIC_API_URL=http://127.0.0.1:18080`.

Set `UAV_BROWSER_WORK` to a private, ignored directory under `work/`, `UAV_BROWSER_POSTGRES_CONTAINER` to that disposable Compose PostgreSQL container, and `UAV_BROWSER_SCREENSHOTS` to an output directory. Set `PLAYWRIGHT_MODULE` and `CHROMIUM_EXECUTABLE` to the existing Playwright module/browser installation. The fixture script validates the disposable Compose project label and creates `fixture.json`; never commit or print that file.

```sh
python3 docs/handoff/m6/evidence/tests/scripts/seed-business-browser.py
node docs/handoff/m6/evidence/tests/scripts/business-browser-e2e.mjs
node docs/handoff/m6/evidence/tests/scripts/business-browser-negative.mjs
```

The negative script uses the successful main run's private `mission.json`. For the expiry script, restart only the disposable backend with `APP_JWT_EXPIRATION_MS=5000`, wait for readiness, then:

```sh
node docs/handoff/m6/evidence/tests/scripts/browser-session-expiry.mjs
npm run lint
npm run typecheck
npm test
npm run build
npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend test
npm --prefix frontend run build
```

Backend commands, from `backend/`:

```sh
./mvnw test
./mvnw -Dtest=StabilizationPostgresTest,StabilizationMinioTest,MigrationUpgradePostgresTest test
```

For the second command, supply `UAV_STABILIZATION_DB_URL`, `UAV_STABILIZATION_DB_USER`, `UAV_STABILIZATION_DB_PASSWORD`, `UAV_STABILIZATION_MINIO_ENDPOINT`, `UAV_STABILIZATION_MINIO_USER`, `UAV_STABILIZATION_MINIO_PASSWORD`, and an isolated `UAV_STABILIZATION_MINIO_BUCKET`. Credentials were passed privately; no credential values, bearer/refresh tokens, signed URLs, browser storage dumps or HARs are included in evidence.

## Remaining scope and cleanup

Still open: draft-edit UI acceptance, remaining cancel/reject/fail/conflict/rollback workflows, lock/revoke UI, resource CRUD, all permission combinations, signed-URL expiry in browser, complete accessibility coverage, staging HTTPS, hosted CI, dependency remediation and full security scan. The visible terminal-mission conflict control and unused detail tabs need a separate behavior review; this happy path does not validate those controls. No task is closed merely because its happy path passes.

Owned frontend/backend processes were stopped, disposable containers/network were removed, and generated-only Next files were restored to baseline. Temporary credentials and raw backend logs were removed after extracting sanitized test summaries. Product fixes, replay scripts and evidence remain uncommitted for review. No production deployment or remote push occurred in this continuation.
