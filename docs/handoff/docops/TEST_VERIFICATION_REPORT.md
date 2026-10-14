# Test verification report

All commands below were run against the current source tree during this audit. Exit files contain the shell exit code. Logs under this directory are sanitized where a runtime could print environment-sensitive lines.

## Backend

| Command | Exit | Result |
|---|---:|---|
| `cd backend && ./mvnw -q test` | 0 | 204 tests, 0 failures, 0 errors, 6 skipped; the aggregate was read from 54 Surefire XML reports. |
| `cd backend && ./mvnw -q package -DskipTests` | 0 | Production package completed from the current source tree. |

The skipped tests are the environment-gated PostgreSQL/MinIO stabilization tests when their explicit test environment variables are absent. Unit and H2-backed Spring tests completed successfully.

Evidence: `evidence/test-results/backend-final-verification-2026-10-07.log`, `backend-final-verification-2026-10-07.exit`, `backend-test-summary.txt`, and `backend-package-2026-10-07.log` with its exit file.

## Frontend

| Command | Exit | Result |
|---|---:|---|
| `cd frontend && npm test` | 0 | 5 session/API-client tests passed. |
| `cd frontend && npm run typecheck` | 0 | TypeScript check passed. |
| `cd frontend && npm run lint` | 0 | ESLint passed. |
| `cd frontend && npm run build` | 0 | Next.js production build completed; 12 application routes were generated. |

Evidence: `evidence/test-results/frontend-final-verification-2026-10-07.log` and its exit file, plus the individual `frontend-*.log` and matching `.exit` files.

## Runtime/API smoke

The local Docker stack was already running at inspection time. `GET http://localhost:8080/actuator/health` returned HTTP 200 with `status: UP`; `GET http://localhost:8080/v3/api-docs` returned HTTP 200. The OpenAPI export contains 64 paths and is saved as `openapi.json`. A separate current-HEAD runtime on port 8093 also returned `UP` and produced the matching 64-path export at `evidence/infra/openapi-8093.json` (server URL is the only normalized difference).

This smoke does not prove authenticated business behavior, data correctness or media transfer. No secrets, tokens or signed URLs are included in the saved evidence.

## Coverage limits

Current full-suite evidence does not constitute full end-to-end verification. In particular, the audit did not rerun every browser route, every authenticated role, an actual protected media upload/download against configured MinIO, payment, AI/KV260, rescue or notification. A fresh disposable PostgreSQL stabilization run passed all five gated cases; the configured MinIO gate remains unverified after the Docker Hub image pull failed, and those limits remain classified in the handoff and backlog.
