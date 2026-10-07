# UAV PAS table-first UI redesign handoff

Date: 2026-10-07

## Delivered

The authenticated frontend now uses a light-first operations shell with a shared title/action pattern, local table scrolling, status badges, drawers, tabs, query states, permission-denied states, and responsive navigation. Operations surfaces are composed at `/operations?tab=stations|uavs|equipment|media|audit`; Access Control is `/access-control`; Mission routes remain `/missions`, `/missions/create`, `/missions/[id]`, `/admin/missions`, and `/operator/missions`.

The shared DataTable supports complete permitted collections, search, column filters, sorting, visibility, standard/compact density, pagination, no-results and empty states. Forms keep server errors and validation visible. Query keys include the authenticated user scope and mutations invalidate the affected resource areas.

The UAV detail drawer keeps the table readable and opens the original CSS reference model only on user action. Drag and keyboard arrows rotate it, zoom/reset controls work, and the expanded viewer is an accessible dialog that closes with Escape. It is labelled as a reference model and carries no fabricated telemetry or digital-twin claims.

The shell exposes the existing Vietnamese/English locale switcher. Shared navigation and table chrome use the locale catalog; the default Vietnamese product labels avoid mixing decorative English copy into operational screens.

## API and permission mapping

- Dashboard: existing dashboard and mission summary endpoints; summary metrics are shown only when returned by the API.
- Operations: stations (`STATION_READ`), UAVs (`UAV_READ`/`UAV_MANAGE`), inventory (`INVENTORY_READ`/`INVENTORY_MANAGE`), media (`MEDIA_READ` plus mutation permissions), and audit (`AUDIT_READ`).
- Access Control: `USER_READ` and `PERMISSION_MANAGE`, with effective/template/override state and reset-to-template behavior.
- Mission: existing Phase 2 ownership, lifecycle, timeline, reservation, and media contracts are preserved.

No new API prefix, permission code, identifier type, enum, schema, or authentication flow was introduced by the redesign. Operations no longer shows synthetic “API live” or resource-sync statuses.

## Verification

- `frontend/npm test`: PASS — 5 tests, 0 failures.
- `frontend/npm run typecheck`: PASS.
- `frontend/npm run lint`: PASS.
- `frontend/npm run build`: PASS — 12 routes generated.
- Focused Playwright Access Control fixture flow: PASS — grant/deny/reset, last-manager rejection, mobile no-overflow, no page errors.
- Focused Playwright UAV fixture flow: PASS — on-demand viewer, keyboard rotation, expansion, Escape close, no page errors. Evidence: `docs/handoff/evidence/browser-viewer-2026-10-07.md`.
- Authenticated operations/station/detail/permission-denied smoke and backend regression evidence remain in the existing handoff evidence directory.

## Limits

The reference model is an original CSS illustration, not a manufacturer-specific GLB or digital twin. Per-model assets, telemetry, maps, and server-side filter/sort contracts require future product/API decisions. Complete collection fetching is appropriate for the current dataset; large fleets should move filtering and pagination into server-side table adapters before scale-up.
