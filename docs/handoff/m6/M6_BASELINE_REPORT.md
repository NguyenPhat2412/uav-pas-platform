# M6 baseline report

**Status: PARTIAL.** The baseline branch is clean at the requested commit; M6 evidence and handoff edits are the only current working-tree changes. No source or backend auth contract was changed.

- Branch: codex/m1-monorepo-foundation
- HEAD: ca8a36bbbd12742f75c3c61d2ae5045d38bde753
- Worktree: /Volumes/D/Codex/projects/uav-pas-platform
- Worktrees: one checkout
- Working-tree: clean before the handoff/evidence documentation edits
- M1-M6 source and handoff files are present at the requested baseline.
- M6 changes: only independent start ports and local app origins for customer, operations and admin. Backend source was not changed by M6.

The code baseline is the requested clean HEAD; this handoff adds documentation/evidence after runtime verification and is not a release commit. Architecture documents and M1-M5 handoffs were reviewed.

## Current verification

The frontend, legacy, Maven and disposable infrastructure checks below were rerun in this continuation. Current logs and summaries are under `evidence/tests/`; no product source was changed.

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

Evidence is under evidence/tests/. The npm commands used the pinned Node 20 runtime directly because the desktop npm shim pointed at an unavailable application path; this is an environment/tooling issue, not a source failure. Browser smoke is recorded in `evidence/tests/browser.json`; authenticated browser E2E remains NOT_VERIFIED because the existing dev servers are locked to the 3100-series API configuration.
