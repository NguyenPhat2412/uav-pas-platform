# M1 Test Report

## Environment

- Branch: `codex/m1-monorepo-foundation`
- Baseline/current HEAD: `6ecc85111a28e53679b2a6d8ac7ec93730d80be4`
- Node: `v20.20.2`
- npm: `10.8.2`
- Java: `21.0.11`

## Commands and outcomes

| Command | Exit | Result |
|---|---:|---|
| `npm install --ignore-scripts` (repository root) | 0 | PASS |
| `npm run lint --workspaces` | 0 | PASS |
| `npm run typecheck --workspaces` | 0 | PASS |
| `npm run test --workspaces` | 0 | PASS |
| `npm run build --workspaces` | 0 | PASS; all four Next builds and seven package typechecks |
| `npm --workspace=@uav/<app> run start -- -p <port>` + `GET /health` | 0 | PASS; web 3100, customer 3101, operations 3102, admin 3103 all returned 204 |
| `docker build --check -f apps/<app>/Dockerfile .` | 0 | PASS for all four apps; web image also built and returned 204 from a running container |
| `npm run lint && npm run typecheck && npm test && npm run build` in `frontend/` | 0 | PASS |
| `env -u UAV_STABILIZATION_DB_URL -u UAV_STABILIZATION_MINIO_ENDPOINT ./mvnw -q test` in `backend/` | 0 | PASS |
| `npm audit --omit=dev --audit-level=high` | 0 | PASS; no production vulnerability reported |
| `npm audit --audit-level=high` | 1 | Five high dev-toolchain advisories; npm proposes a breaking ESLint/Next downgrade, so it was not applied |

## Baseline preservation

The baseline command set recorded before M1 was frontend lint/typecheck/test/build = 0 and backend Maven test = 0. Current SHA-256 comparisons match the baseline for every tracked frontend and backend file examined: 88 frontend files and 249 backend files. The working tree still contains the user’s pre-existing Lombok/package changes.

## Security scan state

Codex Security scan `715164bc-1b82-43e5-aa9b-052936d4b76e` has a saved threat model and partial discovery coverage. It is still running because the worker-slot capability is unresolved; no clean-scan claim is made. The standard audit must be resumed before production security sign-off.
