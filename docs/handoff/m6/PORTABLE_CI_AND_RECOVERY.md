# Portable browser CI and isolated recovery rehearsal

This runbook uses synthetic data, an actual backend, PostgreSQL and MinIO. It does not establish production readiness, cross-domain SSO, real access-token TTL expiry, hardware readiness, or payment-provider integration. No HTTPS staging environment was available for the local rehearsal.

## Prerequisites and ordinary local run

Use Node 22.23.2, Java 21, Python 3, Docker with Compose v2, and access to the package/image registries for initial dependency installation. Run from the repository root with the final frontend candidate applied. Existing live or preview source and databases are not test destinations.

```sh
npm ci --prefix frontend
npm ci --prefix frontend/legacy
(cd frontend && npx --no-install playwright install chromium)
python3 backend/infra/ci/run.py \
  --project uav-my-disposable-e2e \
  --work-dir docs/work/my-e2e-private \
  --result-dir docs/work/my-e2e-safe
```

The private work directory must be new. The runner refuses occupied ports, an existing owned project, or preexisting named volumes. It generates all secrets and users, masks generated secrets under GitHub Actions before using them, compiles the backend into its private target, builds the production frontend workspaces and legacy app, starts production servers, seeds synthetic users/resources, executes browser assertions, and stops its processes and removes its disposable containers/volumes in `finally`. It never reads a developer `.env`, uses demo authentication, or installs a canned successful API response.

Default ports: database 55446, storage 9044/9045, backend 18584, web/customer/operations/admin 3410/3411/3412/3413, legacy 3430. Override individual values with `UAV_E2E_DB_PORT`, `UAV_E2E_STORAGE_PORT`, `UAV_E2E_STORAGE_CONSOLE_PORT`, `UAV_E2E_BACKEND_PORT`, `UAV_E2E_WEB_PORT`, `UAV_E2E_CUSTOMER_PORT`, `UAV_E2E_OPERATIONS_PORT`, `UAV_E2E_ADMIN_PORT`, and `UAV_E2E_LEGACY_PORT`. API origin is supplied at build time. `--reuse-build` requires a matching source/origin manifest from this runner, not merely an existing build directory.

For private source validation, supply `--frontend <private-copy>/frontend` after installing dependencies there. Keep a sibling backend source snapshot when running root frontend contract tests; several contracts deliberately inspect actual backend routes/migrations. Do not alter assertions when a validation layout is incomplete.

## Browser coverage and evidence boundaries

`frontend/tests/e2e/mission.mjs` exercises real login for customer/admin/operator, unauthenticated route protection, own profile editing/reload, customer mission draft/submit, dispatcher confirm/resource assignment, operator acceptance before ready/start, stale assignment rejection and reacceptance, conflict recovery, required completion notes and equipment condition, required handover upload, unsupported/oversized upload rejection, interrupted upload recovery, actual MinIO PUT/download, terminal-state immutability, signed-upload replay denial, customer timeline/result download, second-customer/unassigned-operator isolation, audit events, and logout.

The mission fixture is AREA_INSPECTION. The shared requirement for AERIAL_PHOTOGRAPHY and DATA_COLLECTION remains covered by backend policy tests; this browser run must not be described as three mission-type end-to-end runs. Failed-upload tests abort a network request intentionally; they do not replace responses with successful fixtures. No refresh response is induced by this suite and no real TTL/cross-domain conclusion follows. Existing private refresh-trigger probes and direct cookie refresh endpoint probes have separate scopes.

Only `browser.json` and `runner.json` are browser CI artifacts. They contain assertion names/results, normalized method/path/status, counts and hashes. No screenshots, environment files, fixture values, bodies, raw server logs, HAR, traces, storage state, cookies, signed URLs or tokens are uploaded. A launch failure still writes a safe summary. Detailed diagnostics remain private and avoid dumping exception objects. Local private logs, synthetic backups and fixtures use restrictive permissions; delete the private directory after review. GitHub jobs delete it automatically. The backup includes synthetic password hashes and must never be published as an artifact.

## CI gates

`.github/workflows/m1-foundation.yml` preserves workspace, legacy and complete Maven jobs, and adds independent audit and browser jobs. All jobs have timeouts and read-only repository permissions. CI performs all workspace and legacy lint/typecheck/test/build commands, `npm run test:contracts` (all root contract files), full Maven `./mvnw -B test` with actual PostgreSQL/MinIO environment, and real browser checks against production builds. The complete Maven wrapper emits only counts and failed test identifiers; private Maven/server logs are not artifacts. Job cleanup runs on failure and browser cleanup also has a label-scoped fallback.

```sh
python3 backend/infra/ci/audit.py --frontend frontend --output docs/work/audit-safe
```

Audits always run both production and full trees for root and legacy. Production findings gate the job; remaining full-tree high findings also leave the job failing. There is no suppression or implicit risk acceptance. On 2026-10-17 both production trees had zero findings; each full tree had five high findings in the braces/micromatch/fast-glob/Next ESLint chain. [The primary braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) lists affected versions through 3.0.3 and no patched version. The proposed major downgrade was not applied. Recheck before release; this is not a clean full audit.

The current work is uncommitted and has not executed hosted CI. A workflow file and a local run do not prove branch protection or hosted success. Configure required checks after the first reviewed hosted run; keep the full audit failure visible until remediated or a separately authorized decision is made.

## Named-volume recovery and restart rehearsal

```sh
python3 backend/infra/ci/run.py \
  --project uav-my-disposable-recovery \
  --work-dir docs/work/my-recovery-private \
  --result-dir docs/work/my-recovery-safe \
  --recovery \
  --rollback-classes /path/to/immutable/prior-release/classes
```

`--rollback-classes` is optional and must identify a separately reviewed compatible prior release. The runner copies it before execution. Never use original-user databases or an unreviewed old artifact with outbound workers. The test keeps webhook dispatch and the payment provider off and verifies no active subscriptions before the prior-artifact window. It makes no financial mutations during that window.

The rehearsal creates a pending invoice event with the worker disabled, physically terminates/restarts the backend with the worker enabled, induces a deterministic local database notification failure, removes that trigger, and verifies successful retry. A second backend restart and retry verifies one invoice, zero payment transactions, exactly one local notification, unchanged quota, and zero webhook deliveries. This is durable local financial-event evidence; it is not a signed payment-provider replay test. Auto-invoice and payment-provider settings remain off by default; the manually created amount is synthetic.

After an actual confirmed browser upload, the runner stops writes, privately backs up PostgreSQL with `pg_dump -Fc` and MinIO's stopped data directory, restores into fresh destination named volumes, and verifies counts, mission/media association, completed mission status and downloaded SHA-256. It physically restarts the PostgreSQL/MinIO containers and backend and repeats readback. It then attempts the copied prior application artifact without a Flyway downmigration, restores the final application artifact, and checks data again. An incompatible prior artifact is a failing rollback check, never relabeled as success. These disposable volumes are persistence evidence; the separate tmpfs integration database is not.

The bounded local load probe performs 40 authenticated mission-list requests with concurrency 4, 15-second request timeouts, and reports duration, errors, p50, p95 and maximum latency. This small synthetic local result is not a production SLA or capacity test.

## Remaining environment-specific checks

HTTPS staging still needs actual secure-cookie/domain/SameSite/CORS behavior across intended origins, direct refresh/revocation/TTL behavior, reverse-proxy upload/download limits, object-store CORS and retention, HTTPS webhook allowlists with a controlled receiver, real provider signature/idempotency tests, backup credentials/retention/access control and an operator-owned restore drill. Hardware telemetry, flight controls, AI device integration and external payment-provider behavior require their actual equipment/services. Root/runtime ownership controls real-user backup and final cutover. This runner does not authorize deployment or replace that work.
