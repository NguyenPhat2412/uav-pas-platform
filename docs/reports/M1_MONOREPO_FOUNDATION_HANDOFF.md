# M1 Monorepo Foundation Handoff

## Status

The M1 foundation is complete on branch `codex/m1-monorepo-foundation`. The branch still points at baseline commit `6ecc85111a28e53679b2a6d8ac7ec93730d80be4`; no commit, merge, rebase or push was performed. Existing uncommitted frontend/backend work was preserved.

M1 adds a root npm workspace with four independent Next.js shells:

| App | Local port | Health endpoint |
|---|---:|---|
| `@uav/web` | 3100 | `GET /health` → 204 |
| `@uav/customer` | 3101 | `GET /health` → 204 |
| `@uav/operations` | 3102 | `GET /health` → 204 |
| `@uav/admin` | 3103 | `GET /health` → 204 |

The seven approved shared packages are `@uav/api-client`, `@uav/auth-contracts`, `@uav/config`, `@uav/design-tokens`, `@uav/query`, `@uav/types` and `@uav/ui`. Each app uses standalone output, `transpilePackages`, an environment example and an app-specific Dockerfile. No app imports another app.

The legacy `frontend/` tree remains in place and was not migrated, renamed or deleted. Backend business logic was not changed by M1. A hash comparison against the M1 baseline found zero changes in 249 backend files and zero changes in 88 frontend files; the pre-existing Lombok/package edits remain visible in the working tree.

## Verification

Using Node `v20.20.2` and npm `10.8.2` through the explicit local runtime path:

| Check | Result |
|---|---|
| Workspace install and lockfile generation | PASS |
| Workspace lint | PASS |
| Workspace typecheck | PASS |
| Workspace tests | PASS, 2 structural tests run for each workspace |
| Four app production builds | PASS |
| Four app runtime health checks | PASS, all returned HTTP 204 |
| Four Dockerfile syntax checks | PASS; web image also built and returned 204 from a container health check |
| Legacy frontend lint/typecheck/test/build | PASS, all exit 0 |
| Backend `./mvnw -q test` | PASS, exit 0 |
| `npm audit --omit=dev --audit-level=high` | PASS, 0 vulnerabilities |

Full `npm audit --audit-level=high` reports five high advisories through the ESLint development toolchain (`braces` → `micromatch` → `fast-glob`). npm only offers a breaking downgrade of `eslint-config-next`; no forced downgrade was applied. The issue is recorded for tooling maintenance and does not affect production dependencies in this foundation.

## Security scan

The requested Codex Security Standard scan was started as scan `715164bc-1b82-43e5-aa9b-052936d4b76e`. Its threat model checkpoint is saved and its repository discovery remains running with partial coverage because the active worker-slot capability is unknown. The scan is intentionally not described as clean or complete. An independent baseline review returned unvalidated candidates in pre-existing auth, token storage, infrastructure defaults and upload paths; M1 did not change those areas and no security remediation was folded into this foundation.

## M2 boundary

M2 has not started. The next implementation may populate `apps/operations` using the route ownership matrix, but it must preserve legacy routes, use real API contracts and keep backend authorization authoritative. Complete the outstanding security scan and resolve the ESLint tooling advisory before production release or M6 integration sign-off.
