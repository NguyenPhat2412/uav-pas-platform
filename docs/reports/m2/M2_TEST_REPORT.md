# M2 Test Report

## Passing checks

- `npm run typecheck` at the workspace root
- `npm run lint` at the workspace root
- `npm run test` at the workspace root
- `npm run build` at the workspace root
- Operations package typecheck, lint, M1/M2 structural tests, and production build
- Legacy `frontend/` lint, typecheck, five session tests, and production build
- Backend `./mvnw test`: 204 tests, 0 failures, 6 skipped
- Production dependency audit (`npm audit --omit=dev --audit-level=high`): 0 vulnerabilities
- `npm ci --ignore-scripts` / workspace dependency installation

The M2 structural tests verify canonical routes, compatibility aliases, real operations endpoints, shared API boundary usage, and the absence of direct `fetch` calls in `apps/operations/src`.

## Not run

No authenticated browser flow was run against a live backend, so permission denial, real data rendering, signed storage, mission transition, and responsive authenticated screenshots remain open evidence items.
