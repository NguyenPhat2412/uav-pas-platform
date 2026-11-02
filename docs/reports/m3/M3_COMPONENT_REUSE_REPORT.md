# M3 Component Reuse Report

Baseline `6ecc85111a28e53679b2a6d8ac7ec93730d80be4`.

- Reused the M1/M2 application shell patterns, `@uav/api-client`, `@uav/design-tokens`, `@uav/query`, shared auth/session behavior and TanStack Query configuration.
- Reused the Operations light-first table, status, button, alert, loading, permission and layout components as app-local Admin presentation components. This is deliberate because `@uav/ui` currently exports only the shared Button and moving the larger legacy component set would broaden M3 scope.
- Admin source has one API boundary: `src/lib/api.client.ts` re-exports `@uav/api-client`; feature services do not call `fetch` directly.
- No Operations mission components were copied into Admin. `/admin/missions` remains an Operations compatibility route.
- No backend or design-token changes were needed.
