# M6 remaining gaps

| ID | Priority | Problem / evidence | Affected area | Acceptance criteria | Owner |
|---|---|---|---|---|---|
| M6-B1 | RESOLVED for isolated verification | Spring ran on 18080 with disposable PostgreSQL/MinIO; health/auth/CORS evidence in `evidence/tests/m6-current-isolated-runtime.json` | Backend/API integration | Repeat against approved staging port/config | Backend/DevOps |
| M6-B2 | BLOCKER | Cookie/SSO/CSRF contract is not implemented; current auth is origin-local localStorage bearer | All portals/auth | Approved backend cookie or OAuth code+PKCE path, HTTPS browser test, refresh/logout/CSRF evidence | Backend/Security |
| M6-B3 | PARTIAL — isolated API passed | Synthetic users prove 401/403/ownership/role scope; authenticated browser scope remains open | Permissions/data isolation | Repeat in staging browser flow | QA/Security |
| M6-B4 | PARTIAL — isolated API passed | Complete customer->operations->admin flow passes on disposable services; staging/browser SSO remains open | Business E2E | Pass against approved staging data and origins | Product/QA |
| M6-B5 | HIGH | npm audit reports 5 high development-toolchain entries in root and legacy; production-only audits return 0 | Supply chain | Review advisories, pin/upgrade compatible dependencies, rerun audit with policy decision | DevEx/Security |
| M6-B6 | MEDIUM | CI has only M1 frontend/legacy jobs; no backend/four-app/staging gate | CI/CD | Reviewed workflow runs all required checks and artifacts | DevOps |
| M6-B7 | MEDIUM | Requested baseline is clean; current documentation/evidence edits are uncommitted | Release baseline | Create an approved integration commit/PR | Maintainer |
| M6-B8 | LOW | Screenshots are anonymous/guarded route evidence, not authenticated business evidence | UX/E2E | Capture authorized synthetic-user screens after B1-B4 | QA |
