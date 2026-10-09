# M1 File Change Matrix

All paths below are new M1 files unless stated otherwise. Existing backend and legacy frontend source files were not edited by M1.

| Area | Paths | Purpose |
|---|---|---|
| Workspace | `package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.base.json`, `eslint.config.mjs`, `.dockerignore`, `.github/workflows/m1-foundation.yml` | npm workspace, shared TypeScript/ESLint configuration, CI and container context |
| App shells | `apps/web/**`, `apps/customer/**`, `apps/operations/**`, `apps/admin/**` | independent Next.js App Router shells, `/health`, environment examples, ports 3100–3103 and standalone builds |
| App deployment | `apps/*/Dockerfile`, `apps/*/public/.gitkeep` | four independently buildable container units |
| Shared packages | `packages/api-client/**`, `packages/auth-contracts/**`, `packages/config/**`, `packages/design-tokens/**`, `packages/query/**`, `packages/types/**`, `packages/ui/**` | approved shared contracts and primitives with export maps |
| M1 test | `tests/m1-foundation.test.mjs` | verifies all app health routes, standalone configs and package presence |
| Handoff | `docs/handoff/M1_*.md` | implementation matrix, test evidence and next-step boundary |

The root workspace deliberately excludes `frontend/`; this keeps the legacy application independently runnable while the new apps are introduced additively. No backend file, endpoint, entity, migration, auth flow or CORS rule was changed for M1.
