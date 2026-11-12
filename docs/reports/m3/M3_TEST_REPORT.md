# M3 Test Report

Baseline `6ecc85111a28e53679b2a6d8ac7ec93730d80be4`. Commands were run with Node 20.20.2 PATH. Exit codes and full output are kept under `evidence/logs/`.

| Check | Result |
|---|---|
| Admin lint | PASS (`npm run lint --workspace @uav/admin`) |
| Admin typecheck | PASS (`npm run typecheck --workspace @uav/admin`) |
| Admin production build | PASS; routes `/dashboard`, `/users`, `/users/[id]`, `/access-control`, `/role-templates`, `/permissions`, `/audit-logs` |
| Admin structural tests | PASS: 6 tests, 0 failures |
| Root lint/typecheck/build/test | PASS; workspaces and shared packages passed |
| Operations regression | PASS: build and M2 structural tests |
| Legacy frontend build | PASS (`frontend/npm run build`) |
| Backend Maven tests | PASS: 204 tests, 0 failures, 6 skipped |
| Admin runtime smoke | PASS: `GET /health` 204, `GET /login` 200, `GET /dashboard` 200 on localhost:3103; browser opened the login form |
| Production dependency audit | PASS: `npm audit --omit=dev --audit-level=high` reports 0 vulnerabilities |
| Responsive/browser screenshots | NOT_VERIFIED |
| Direct permission API security tests | NOT_VERIFIED |
| Delegated security scan | IN_PROGRESS / resumable |

Tests cover route ownership, independent port/health route, actual endpoint strings, no direct fetch in Admin feature source and Operations mission ownership. They do not replace authenticated backend integration tests.
