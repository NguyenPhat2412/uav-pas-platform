# Frontend/UI verification

Inspection target: current `HEAD` (`6ecc85111a28e53679b2a6d8ac7ec93730d80be4`) on `feat/clean-architecture-auth`, which is also the current `origin/main`.

The source audit covered the route tree, shared shell, table components, feature hooks, API client, permission gates and the current browser evidence. A production build is not treated as browser or business-flow proof.

## Route and visual coverage

| Surface | Current source | Rendered evidence | Status |
|---|---|---|---|
| Login | `frontend/src/app/(auth)/login/page.tsx`, `features/auth/components/LoginForm.tsx` | `evidence/test-results/frontend-build.log`; authenticated browser flow in `../evidence/browser-qa-2026-10-07.md` | PARTIAL: login was exercised; invalid-login and registration browser paths were not rerun in this audit. |
| Register | `frontend/src/app/(auth)/register/page.tsx` | Build only | IMPLEMENTED_NOT_VERIFIED |
| Dashboard | `frontend/src/app/page.tsx` | Build and source inspection | PARTIAL: real dashboard calls are present, but the current audit has no fresh authenticated dashboard screenshot. |
| Users | No `/users` route; user selection/editor is inside `/access-control` | Access-control screenshots | PARTIAL: backend user endpoints and access-control selector exist; standalone users page is absent. |
| Access Control | `frontend/src/app/access-control/page.tsx` and `features/access` | `evidence/screenshots/access-effective.png`, `access-rejected.png`, `access-mobile.png` | VERIFIED for the exercised permission-editor and denied state; broader user lifecycle UI remains unverified. |
| Stations | `operations/page.tsx` + `StationPanel.tsx` | `../evidence/browser-qa-2026-10-07.md` station drawer | PARTIAL: list/detail and create source are present; update/delete and all empty/error variants were not browser-tested here. |
| UAV fleet/detail | `UavPanel.tsx`, `useOperations.ts` | `../evidence/browser-viewer-2026-10-07.md` | PARTIAL: detail/history/reference viewer flow was exercised; CRUD and failure fallbacks remain unverified. |
| Inventory | `EquipmentPanel.tsx` | Build/source only | PARTIAL: stock actions and replay request IDs are wired; current browser action flow was not rerun. |
| Media | `MediaPanel.tsx` and mission media UI | Build/source only | PARTIAL: lifecycle controls are wired; actual protected upload/download was not rerun in this audit. |
| Audit | `AuditPanel.tsx` | Build/source only | IMPLEMENTED_NOT_VERIFIED |
| Missions | `missions/page.tsx`, `missions/create/page.tsx`, `[id]/page.tsx`, operator/admin pages | Build/source only | PARTIAL: routes and actions exist; this audit has no fresh authenticated mission browser trace. |

## Table/state behavior

`DataTable.tsx` contains sorting, visibility, density and pagination affordances. `fetchCollection` is used by the operations collection hooks to fetch all pages before client-side table transforms. Feature hooks scope keys by authenticated user ID in `queryKeys.ts`; operation mutations invalidate affected feature keys. The implementation therefore has a coherent collection strategy, but it is not a server-side filter/sort adapter for large fleets.

The source contains loading, empty, no-results, error and permission-denied branches in the shared state components and operations shell. Current browser evidence proves an authenticated operations list, a station detail drawer and an access-denied state. It does not prove every panel's many-row, zero-row, validation-error and network-error rendering.

Mission list/detail/create still use direct `useEffect`/local state for several reads, while mission mutations use TanStack Query in `useMissions.ts`. Dashboard reads also use local state and `Promise.allSettled`. This is a documented partial adoption of TanStack Query rather than a uniform query architecture.

## Session and permission behavior

`AuthContext.tsx` keys permission queries by user ID, clears/cancels the QueryClient on account changes, resets private queries when the permission signature changes, and listens for logout/account changes. The five current frontend session tests pass and cover concurrent refresh, logout during refresh, late responses after account changes, failed refresh and forbidden retry. Backend authorization is still required; hiding a button is not considered backend proof.

The operations tabs gate `STATION_READ`, `UAV_READ`, `INVENTORY_READ`, `MEDIA_READ` and `AUDIT_READ`. Mutation controls gate the corresponding `*_MANAGE` permission. Access Control renders effective template/override state and reset-to-template controls. The permission catalog is sourced from `/api/v1/permissions` and `/api/v1/permissions/users/{id}` rather than a hard-coded fine-grained UI matrix.

## 3D UAV verification

`UavModelViewer.tsx` is an original CSS reference illustration. It is instantiated only after the detail drawer's **Xem mô hình 3D** action, supports pointer and keyboard rotation, zoom, reset and an Escape-close expanded dialog. The browser evidence records lazy opening, ArrowRight rotation, expansion, Escape close and no page errors.

The viewer is not a GLB/WebGL asset or digital twin. There is no measured model-file size, external asset license, WebGL-unavailable fallback or load-failure path to verify. Those items are NOT_VERIFIED/NOT_APPLICABLE to the current CSS implementation. The feature status is PARTIAL.

## Console/network evidence

The existing browser evidence reports no page errors or console warnings for the authenticated operations/station/access-denied flow and no page errors for the fixture-based UAV viewer flow. A complete network duplication/loop audit across every route was not performed; mark that acceptance item NOT_VERIFIED.

Evidence paths:

- `evidence/test-results/frontend-test.log`
- `evidence/test-results/frontend-typecheck.log`
- `evidence/test-results/frontend-lint.log`
- `evidence/test-results/frontend-build.log`
- `evidence/screenshots/`
- `../evidence/browser-qa-2026-10-07.md`
- `../evidence/browser-viewer-2026-10-07.md`
- `evidence/frontend-source-map.txt`
- `evidence/todo-useeffect-scan.txt`
