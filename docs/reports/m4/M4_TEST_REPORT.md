# M4 Test Report

## M4 STATUS: PARTIAL

Baseline: branch `codex/m1-monorepo-foundation`, HEAD `6ecc85111a28e53679b2a6d8ac7ec93730d80be4` before M4 edits.

| Check | Result |
|---|---|
| Customer lint | PASS |
| Customer typecheck | PASS after production build regenerated `.next` types |
| Customer structural tests | PASS: 5 tests |
| Customer production build | PASS; routes `/dashboard`, `/services`, `/missions`, `/missions/create`, `/missions/[id]`, `/profile`, auth routes |
| Root lint/typecheck/test/build | PASS |
| Operations/Admin builds and typechecks | PASS through root workspaces |
| Legacy frontend build | PASS in prior M3 baseline; no legacy files changed by M4 |
| Backend Maven tests | PASS: 204 run, 0 failures, 6 skipped |
| Production npm audit | PASS: 0 vulnerabilities |
| `git diff --check` | PASS |
| Customer runtime smoke | PASS: `GET /health` 204; public routes returned 200 on port 3101 |
| Authenticated booking E2E | NOT_VERIFIED; no synthetic account supplied |
| Cross-customer ownership/media test | NOT_VERIFIED |
| Responsive screenshots | NOT_VERIFIED; browser login AX inspection completed, files not fabricated |
| Delegated security scan | IN_PROGRESS |
