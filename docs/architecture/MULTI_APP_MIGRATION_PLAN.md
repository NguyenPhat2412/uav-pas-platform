# Multi-App Frontend Migration Plan

Migration is additive and reversible. No phase moves files until the review checkpoint approves this plan. At every step, preserve the current `frontend/` app and backend API.

## M0 — Discovery and baseline

**Files/evidence:** current `frontend/src`, `frontend/package.json`, `frontend/Dockerfile`, `frontend/next.config.ts`, auth/API/query files, backend controller annotations, `docs/handoff/*`, Drive sync reports, and the six architecture documents.

**Steps:** freeze the route/API/permission inventory; record branch, HEAD, worktrees and uncommitted-file hashes; run frontend lint/typecheck/test/build and backend test; capture legacy browser smoke evidence; resolve the local `main` versus historical Drive branch-name discrepancy.

**Dependencies:** none.  
**Acceptance:** matrix contains every current URL; baseline commands pass; no source file is moved.  
**Tests:** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`; `./mvnw -q test`.  
**Rollback:** delete only generated discovery notes; restore no tracked source.

## M1 — Monorepo foundation

**Files affected:** root `package.json`/lockfile, `apps/*`, `packages/*`, per-app Next configs and Dockerfiles, CI workflow, `.env.example` files. Existing `frontend/` remains intact until parity is proven.

**Steps:** create workspace manifests and empty app shells; move or copy only approved shared primitives into packages; configure `transpilePackages`; add package export maps and config validation; add independent `dev`, `lint`, `typecheck`, `test` and `build` scripts; do not delete or rename legacy routes.

**Dependencies:** M0; one pinned Next/React/TanStack version; approved package manager.  
**Acceptance:** all four apps build independently from the same commit; package import graph has no app-to-app imports; legacy app still builds.  
**Tests:** each app `npm run lint && npm run typecheck && npm test && npm run build`; workspace install from a clean lockfile.  
**Rollback:** remove only new `apps/`/`packages/` and workspace metadata; leave `frontend/` and backend untouched.

## M2 — Operations migration

**Files affected:** operations app routes/layout, dashboard, operations panels/services/hooks, mission dispatch and assigned-mission pages; shared `ui`, `api-client`, `query`, `types` exports; operations Docker/deploy config.

**Steps:** migrate `/overview`, stations, UAVs, inventory, media, audit, `/dispatch/missions` and `/assigned-missions`; preserve table states, drawers, signed-media workflow, request IDs and real API calls; replace role-only navigation with permission-aware gates; keep old `/operations`, `/admin/missions` and `/operator/missions` aliases.

**Dependencies:** M1; current API/permission matrix; auth compatibility mode.  
**Acceptance:** operations role matrix covers commander/operator; every mutation retains the same endpoint/body and invalidates scoped Query keys; old URLs redirect after target health check.  
**Tests:** app unit tests, existing session tests, backend mission/resource tests, Playwright operations/station/UAV/access-denied flows.  
**Rollback:** point operations hostname and legacy aliases back to `frontend/`; no API or database rollback.

## M3 — Admin migration

**Files affected:** admin app access-control route/layout, user/permission services and shared access UI; admin Docker/deploy config.

**Steps:** move the current access-control editor; preserve inherited/override/reset semantics and last-manager rejection; load all permission codes from backend; keep `/access-control` legacy alias; do not move dispatch missions here.

**Dependencies:** M1, shared auth and operations baseline.  
**Acceptance:** `USER_READ` plus `PERMISSION_MANAGE` gates the screen; server 403/409 states are visible; mobile table/editor remains accessible.  
**Tests:** current browser access-control fixture, API session tests, `Phase1AccessIntegrationTest`, access recovery tests.  
**Rollback:** route admin hostname to legacy frontend and retain backend permission rows.

## M4 — Customer implementation

**Files affected:** customer app mission list/create/detail routes, customer layout, mission API/query hooks and customer-safe components.

**Steps:** extract owner-scoped mission list, availability, create, submit/cancel, detail, timeline and allowed media actions; remove operations-only controls from customer UI; keep backend owner scope; preserve old `/missions*` aliases until parity.

**Dependencies:** M1, approved auth cookie or bearer compatibility, mission contract.  
**Acceptance:** customer cannot see another customer's mission; create uses real service/availability endpoints; lifecycle and media errors match current API.  
**Tests:** mission integration tests, ownership/permission matrix, Playwright create/detail/403 flows.  
**Rollback:** legacy mission routes remain active; no data migration.

## M5 — Public Website

**Files affected:** web app pages/layout, login/register/callback handoff, public design tokens and web deploy config.

**Steps:** create public pages without invented product data; move auth entry and registration; implement allowlisted return-to flow; keep JSON/bearer compatibility until cookie SSO is verified; link to customer/operations/admin hosts only after session check.

**Dependencies:** approved cross-domain auth design and backend cookie/CSRF work.  
**Acceptance:** anonymous root is public; login returns to the requested portal; no credential appears in URL/storage/logs; auth failures remain actionable.  
**Tests:** auth unit tests, backend auth/refresh/logout tests, cross-subdomain browser tests over HTTPS.  
**Rollback:** restore legacy `/login` and `/register`; leave new public pages deployed but unlinked.

## M6 — Integration and regression

**Files affected:** CI matrix, redirect/rewrite config, browser suites, deployment manifests, runbook and deprecation notes.

**Steps:** run all four independent builds and backend tests; run route-by-route permission and ownership matrix; exercise signed media, refresh races, account switch, logout, CSRF and deep links; enable redirects gradually; observe legacy traffic; remove aliases only after an approved deprecation window.

**Dependencies:** M2–M5, auth sign-off, production-like staging data.  
**Acceptance:** no loss of data/API/permission/business behavior; all apps deploy separately; rollback can restore the legacy app from the previous artifact; no fabricated API data.  
**Tests:** workspace checks, `./mvnw -q test`, Playwright multi-host smoke, security scan and deployment health checks.  
**Rollback:** flip routing to the last legacy artifact, disable new cookie flag, preserve database and refresh records, and keep aliases.
