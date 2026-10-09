# M6 baseline report

**Status: PARTIAL.** The integrated workspace is available and M1-M5 artifacts are present, but they are an uncommitted dirty worktree on one branch. There are no separate milestone commits or merge states to verify.

- Branch: codex/m1-monorepo-foundation
- HEAD: 6ecc85111a28e53679b2a6d8ac7ec93730d80be4
- Worktree: /Volumes/D/Codex/projects/uav-pas-platform
- Worktrees: one checkout
- Working-tree entries at discovery: 779
- M1-M5: source and handoff files present in the current workspace; no milestone-specific branch/commit exists.
- M6 changes: only independent start ports and local app origins for customer, operations and admin. Backend source was not changed by M6.

The baseline is therefore **HEAD plus the current dirty workspace**, not a clean release candidate. Architecture documents and M1-M5 handoffs were reviewed.

## Baseline command evidence

| Scope | Command | Result |
|---|---|---|
| Root workspaces | npm run lint | PASS, exit 0 |
| Root workspaces | npm run typecheck | PASS, exit 0 |
| Root workspaces | npm test | PASS, exit 0 |
| Root workspaces | npm run build | PASS, exit 0 |
| Legacy frontend | npm run lint | PASS, exit 0 |
| Legacy frontend | npm run typecheck | PASS, exit 0 |
| Legacy frontend | npm run test | PASS, exit 0; 5 tests |
| Legacy frontend | npm run build | PASS, exit 0 |
| Backend | ./mvnw test -q | PASS, exit 0; 204 tests, 0 failures, 0 errors, 6 skipped |
| Backend infra | disposable PostgreSQL 16 + MinIO stack, targeted stabilization tests | PASS, exit 0; PostgreSQL 5 and MinIO 1 |

Evidence is under evidence/tests/. The npm commands used the pinned Node 20 runtime directly because the desktop npm shim pointed at an unavailable application path; this is an environment/tooling issue, not a source failure.
