# M6 remaining gaps

| ID | Priority | Problem / evidence | Affected area | Acceptance criteria | Owner |
|---|---|---|---|---|---|
| M6-B1 | RESOLVED for isolated verification | Spring ran on 18080 with disposable PostgreSQL/MinIO; health/auth/CORS evidence in `evidence/tests/m6-current-isolated-runtime.json` | Backend/API integration | Repeat against approved staging port/config | Backend/DevOps |
| M6-B2 | BLOCKER | Cookie/SSO/CSRF contract is not implemented; current auth is origin-local localStorage bearer | All portals/auth | Approved backend cookie or OAuth code+PKCE path, HTTPS browser test, refresh/logout/CSRF evidence | Backend/Security |
| M6-B3 | PARTIAL — isolated API + portal auth smoke passed | Synthetic users prove 401/403/ownership/role scope; browser smoke proves sessions/guards, but ownership UI and staging remain open | Permissions/data isolation | Repeat ownership/direct-ID cases in staging browser flow | QA/Security |
| M6-B4 | PARTIAL — isolated API + portal auth smoke passed | Complete customer->operations->admin flow passes on disposable services; mission business UI, staging and browser SSO remain open | Business E2E | Pass mission workflow against approved staging data and origins | Product/QA |
| M6-B5 | HIGH | npm audit reports 5 high development-toolchain entries in root and legacy; production-only audits return 0 | Supply chain | Review advisories, pin/upgrade compatible dependencies, rerun audit with policy decision | DevEx/Security |
| M6-B6 | MEDIUM | CI has only M1 frontend/legacy jobs; no backend/four-app/staging gate | CI/CD | Reviewed workflow runs all required checks and artifacts | DevOps |
| M6-B7 | MEDIUM | Local docs/evidence checkpoint is reviewable; remote push/PR has not been performed | Release baseline | Create and verify an approved integration push/PR | Maintainer |
| M6-B8 | LOW | Existing screenshots are anonymous/guarded route evidence; new authenticated smoke JSON has no screenshots | UX/E2E | Capture authorized synthetic-user screens at required viewports after B1-B4 | QA |
