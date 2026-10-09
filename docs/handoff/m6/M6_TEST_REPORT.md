# M6 test report

## Passing checks

- Root workspace: lint, typecheck, test and build all exit 0.
- Existing M1-M5 structural tests: 11 tests pass.
- Legacy frontend: lint, typecheck, 5 session/API tests and build pass.
- Backend default suite: 204 tests, 0 failures, 0 errors, 6 skipped.
- Disposable infrastructure: PostgreSQL stabilization 5/5 and MinIO stabilization 1/1.
- Browser smoke: four apps, guarded routes, 16 viewport checks, fixed-origin navigation and no overflow; PASS.
- Browser evidence is anonymous/guarded-route scope only.

## Not passed or not claimable

- npm audit exits 1 for 5 high-severity dependency findings in both root and legacy lockfiles. No automatic major upgrade was applied.
- Hosted CI was not run.
- Live backend API, authenticated browser E2E, cross-user authorization and cross-domain SSO were not verified.
- The existing Codex Security standard scan remains IN_PROGRESS: 0 reportable findings so far, inventory not closed (478 files), no final report.

Evidence files are in evidence/tests/, evidence/runtime/ and evidence/screenshots/.
