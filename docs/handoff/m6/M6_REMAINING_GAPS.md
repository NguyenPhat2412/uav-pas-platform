# M6 remaining gaps

| ID | Priority | Problem / evidence | Affected area | Acceptance criteria | Owner |
|---|---|---|---|---|---|
| M6-B1 | BLOCKER | Port 8080 is unrelated Expo; backend API runtime cannot be verified (evidence/runtime/runtime-snapshot.log) | Backend/API integration | Run Spring API on an isolated approved port and prove health/auth/CORS responses | Backend/DevOps |
| M6-B2 | BLOCKER | Cookie/SSO/CSRF contract is not implemented; current auth is origin-local localStorage bearer | All portals/auth | Approved backend cookie or OAuth code+PKCE path, HTTPS browser test, refresh/logout/CSRF evidence | Backend/Security |
| M6-B3 | HIGH | Customer A/B and operator/admin direct authorization evidence is absent | Permissions/data isolation | Synthetic users prove 401/403/ownership/role scope via direct API and browser | QA/Security |
| M6-B4 | HIGH | Complete customer->operations->admin workflow is not runnable without backend runtime/credentials | Business E2E | Create, assign, execute, track, media and audit flow passes against approved staging data | Product/QA |
| M6-B5 | HIGH | npm audit reports 5 high dependency findings in root and legacy lockfiles | Supply chain | Review advisories, pin/upgrade compatible dependencies, rerun audit with policy decision | DevEx/Security |
| M6-B6 | MEDIUM | CI has only M1 frontend/legacy jobs; no backend/four-app/staging gate | CI/CD | Reviewed workflow runs all required checks and artifacts | DevOps |
| M6-B7 | MEDIUM | Worktree has 779 dirty entries and no milestone commits | Release baseline | Create an approved integration commit/PR without reset/merge automation | Maintainer |
| M6-B8 | LOW | Screenshots are anonymous/guarded route evidence, not authenticated business evidence | UX/E2E | Capture authorized synthetic-user screens after B1-B4 | QA |
