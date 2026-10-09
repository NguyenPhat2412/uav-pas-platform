# M6 test report

## Passing checks

- Current isolated runtime: actuator health 200, protected API health 401, anonymous/invalid-token 401, correct CORS preflight/rejection, synthetic 401/403/ownership matrix, complete customer -> operations -> admin mission flow, signed upload/download and admin audit all pass; evidence is in `evidence/tests/m6-current-isolated-runtime.json`.

- Root workspace rerun: lint, typecheck, test and build all exit 0; logs are `root-*-current.log`.
- Existing M1-M5 structural tests remain included in the root test run.
- Legacy frontend rerun: lint, typecheck, 5 session/API tests and build all pass; logs are `legacy-*-current.log`.
- Backend default suite rerun: 204 tests, 0 failures, 0 errors, 6 skipped; exit 0.
- Disposable infrastructure rerun: PostgreSQL stabilization 5/5 and MinIO stabilization 1/1; evidence is `backend-stabilization-current.log` and its summary JSON.
- Browser smoke rerun: four apps, guarded routes, 16 viewport checks, fixed-origin navigation and no overflow; PASS (`browser.json`).
- Browser evidence remains anonymous/guarded-route scope only; the authenticated business evidence is direct HTTP API scope.

## Not passed or not claimable

- npm audit exits 1 for 5 high-severity development-toolchain findings in both root and legacy lockfiles; production-only audits are clean. No automatic major upgrade was applied. Evidence: `evidence/tests/npm-audit-summary.json`.
- Hosted CI was not run.
- Authenticated browser E2E and cross-domain SSO were not verified; direct isolated API authorization and business E2E are verified.
- Current Codex Security scan `3b9f81ce-188c-4aa8-ad16-4d0be497515c` is complete with 0 reportable findings in 5 reviewed surfaces, but coverage is partial (827 files) and is not a clean full-repository attestation.

Evidence files are in evidence/tests/, evidence/runtime/ and evidence/screenshots/.
