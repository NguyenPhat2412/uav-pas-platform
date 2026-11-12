# UAV PAS Multi-App Frontend Architecture

> Current layout (2026-10-17): apps and packages now live under `frontend/`; the previous frontend is `frontend/legacy/`. See [current setup and path mapping](../README.md).

**Status:** proposed; review checkpoint before source migration  
**Baseline:** `main` / `6ecc85111a28e53679b2a6d8ac7ec93730d80be4`  
**Scope:** frontend decomposition only. The Spring Boot backend remains one deployable application.

## Decision

Create one npm-workspaces monorepo with four independently buildable Next.js applications:

```text
apps/
  web/          public website, public auth entry and documentation
  customer/     customer mission requests and customer-scoped history
  operations/   dashboard, stations, UAV fleet, inventory, media, audit and dispatch
  admin/        users, roles, permission templates and access recovery UI
packages/
  api-client/   typed HTTP transport, errors, refresh and request cancellation
  auth-contracts/ session, user, role and permission contracts
  types/        API DTOs and enums shared by features
  query/        QueryClient defaults and query-key factories
  ui/           accessible primitives, table, drawer, states and form controls
  design-tokens/ CSS variables, Tailwind preset and typography/spacing tokens
  config/       validated public environment configuration
```

The apps share contracts and visual primitives, but own their route trees, layouts, providers, environment files, CI targets and deployment units. No package may import an app. Feature packages may depend on `types`, `api-client`, `auth-contracts`, `query`, `ui` and `design-tokens` only through documented public exports.

## Ownership

| App | Owns | Does not own |
|---|---|---|
| `web` | `/`, public product pages, `/login`, `/register`, auth callback handoff | authenticated operational data |
| `customer` | mission request/list/detail UI for the signed-in customer | role templates, fleet administration |
| `operations` | resource console, operational dashboard, dispatch, assigned missions and mission execution | account permission editing |
| `admin` | users, role templates, effective permissions, access recovery and administrative audit views | customer mission creation workflow |

The current authenticated root dashboard is operational and moves to `operations`. The new public website receives the root path on its own hostname, so both meanings can coexist during migration.

## Runtime boundaries

Each app uses App Router, TypeScript, TanStack Query and the same API origin. Each app has its own `next.config.ts`, `Dockerfile`, `package.json`, `tsconfig.json`, `.env.example` and `output` directory. `output: "standalone"` remains enabled. Shared packages are compiled through Next's `transpilePackages` configuration.

Server state remains in TanStack Query. Forms remain local/React Hook Form state. URL search parameters own table filters and pagination. Permission checks in navigation are presentation gates only; every API call remains protected by Spring Security and `@PreAuthorize`.

## Backend boundary

The existing `/api/v1` REST surface is the contract. The split introduces no microservice, database split, endpoint rename or permission-code rename. `api-client` is the only package allowed to call `fetch`; feature services call typed functions from that package. Backend ownership, transactions, JPA entities, storage and audit behavior stay unchanged until a separately approved auth-session extension.

## Navigation and data flow

```text
Next route -> feature page -> TanStack Query hook -> feature API function
           -> shared api-client -> Spring Boot /api/v1 -> permission + scope checks
```

On a successful mutation, the feature invalidates its list/detail/dashboard keys. It must not use `window.location.reload()` to synchronize server data. Query keys include the authenticated subject or session generation so one user's cache cannot appear in another portal session.

## Non-goals

This proposal does not create AI, Search & Rescue, Payment, entitlement, e-learning or notification features. It does not invent API data, telemetry, maps or mock replacements. It does not reset, merge, push or overwrite existing work.

## Current discovery facts

- One current Next.js app has 10 URL pages: login, register, dashboard, access control, five operations tabs, and four mission surfaces including operator/admin variants.
- Current frontend uses Next.js `16.3.8`, React `19.2.8`, TanStack Query, a shared `AppShell`, `DataTable`, drawers, status components and a CSS UAV reference viewer.
- Current deployment is one `frontend/Dockerfile` with Next standalone output and one `frontend` service in the root `docker-compose.yml`; `NEXT_PUBLIC_API_URL` is injected at build time and the default local port is `3000`.
- Current backend CORS defaults to `http://localhost:3000`; production multi-host deployment therefore requires an explicit, exact origin list before cutover.
- Current auth uses JWT/refresh JSON responses and browser `localStorage` keys `token` and `refreshToken`; it is not yet cross-origin SSO.
- Current permission state is loaded from `/api/v1/permissions/me`; server permission codes and scope remain authoritative.
- Current frontend verification passes lint, typecheck, 5 session tests and production build. Backend verification records 204 tests, 0 failures/errors and 6 environment-dependent skips.
- The local checkout is `main` with uncommitted Lombok/package changes from the prior task. Drive's historical sync report names `feat/clean-architecture-auth`; that discrepancy is recorded and no branch is changed here.
