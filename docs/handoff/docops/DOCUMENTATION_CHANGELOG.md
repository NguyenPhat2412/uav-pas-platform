# UAV PAS Documentation Changelog

## 2026-10-14 — DocOps second sync at `b3d8f9b`

Repository: `uav-pas-platform`  
Branch: `main`  
Previous synced SHA: `6ecc85111a28e53679b2a6d8ac7ec93730d80be4`  
Target Google Drive Folder: `uav_platform_pass` (`https://drive.google.com/drive/folders/1XIEMM23_0lirBKT4yXnKVssxLWWK-JSP`)  
Source reports: `docs/handoff/docops/DOC_SYNC_2026-10-14_b3d8f9b.md`, `docs/handoff/docops/EXCEPTION_HANDLING_ARCHITECTURE.md`, `docs/handoff/docops/UI_UX_ALIGNMENT_AND_FLOWS_REPORT.md`, `docs/handoff/m6/M6_FINAL_INTEGRATION_HANDOFF.md`, `docs/handoff/m6/M1_M6_COMPLETION_LEDGER.md`.

Changed locally & synced from Google Drive (`uav_platform_pass`):

- Pulled the 23 canonical files from `/Google Drive/uav_platform_pass` (`1XIEMM23_0lirBKT4yXnKVssxLWWK-JSP`) into `docs/handoff/docops/` so the Git repository and Google Drive share a unified baseline.
- Updated `docs/handoff/docops/LAST_SYNCED_SHA` to `b3d8f9b`.
- Added `DOC_SYNC_2026-10-14_b3d8f9b.md`, `EXCEPTION_HANDLING_ARCHITECTURE.md`, and `UI_UX_ALIGNMENT_AND_FLOWS_REPORT.md` covering:
  1. Multi-app monorepo (`apps/web`, `apps/customer`, `apps/operations`, `apps/admin` + 7 `@uav/*` packages).
  2. Collapsible sidebar (`228px`/`68px` with `localStorage`), VJU brand identity, high-contrast Bento frames, and full-bleed dark SAR & AI Cockpit (`KV260` telemetry + YOLOv8/Thermal HUD).
  3. End-to-end Customer Portal (`apps/customer`) & Operations Portal (`apps/operations`) API wiring with resilient demo/offline fallbacks.
  4. 4-layer Exception Management hardening (`GlobalExceptionHandler.java` + `GlobalExceptionHandlerTest.java`, `ApiError.code` propagation in `@uav/api-client`, and Next.js App Router `error.tsx` / `not-found.tsx` across all 3 portals).

Evidence recorded:

- Workspace Typecheck (`npm run typecheck`): 11/11 workspaces PASS.
- Frontend Unit & Smoke Tests (`npm test`): 28/28 tests PASS.
- Backend Exception Handler Unit Tests (`mvnw test -Dtest=GlobalExceptionHandlerTest`): 6/6 tests PASS.

---

## 2026-10-07 — DocOps first sync at `6ecc85111a28e53679b2a6d8ac7ec93730d80be4`

Repository: `uav-pas-platform`  
Branch: `feat/clean-architecture-auth`  
Previous synced SHA: `16f70f6` (historical Drive README/checklist snapshot)  
Source reports: `docs/handoff/final/FINAL_INTEGRATION_HANDOFF.md`, `BACKEND_BUSINESS_VERIFICATION.md`, `CURRENT_PERMISSION_MATRIX.md`, `API_PERMISSION_MATRIX.md`, `DATABASE_MIGRATION_REPORT.md`, `FRONTEND_UI_VERIFICATION.md`, `TEST_VERIFICATION_REPORT.md`, `REMAINING_GAPS_BACKLOG.md`, `REQUIREMENT_IMPLEMENTATION_MATRIX.md`, `CURRENT_STATE.txt`.

Changed locally:

- Added `docs/handoff/docops/LAST_SYNCED_SHA` for the current repository snapshot.
- Updated the checklist snapshot while preserving historical source columns: 76 current function statuses in `Chuc nang!J:K`, 20 current permission/status rows in `Phan quyen!I:J`, source notes, roadmap S0, and workbook context.
- Kept the historical `PHASE_1_HANDOFF.md` and prior status columns unchanged.
- Added the proposed Drive migration map.

Evidence recorded:

- Backend: 204 tests, 0 failures, 0 errors, 6 environment-gated skips.
- Frontend: 5 tests plus typecheck, lint and production build passed.
- Runtime: health `UP`, OpenAPI export with 64 paths.
- Fresh disposable PostgreSQL stabilization: 5/5 cases passed.
- RustFS S3-compatible storage gate passed; configured MinIO remains unverified after image/download failure.
- Selected browser traces passed for operations, station drawer, access-denied state and UAV viewer.

Status distribution written to current function snapshot: 16 `VERIFIED`, 30 `PARTIAL`, 5 `IMPLEMENTED_NOT_VERIFIED`, 23 `NOT_IMPLEMENTED`, and 2 `DEFERRED`. These are current evidence classifications, not conversions of the historical status column.

Open gaps retained: unsafe default migration profile, mission/UAV state conflict, mission rejection resource release, physical handover/return, configured MinIO transfer, broad action-level permissions, incomplete authenticated E2E/browser coverage, incomplete TanStack Query migration, and deferred/missing modules.

Drive files updated or added: canonical README and checklist plus the current handoff/report package. Final URLs and readback results are recorded in the sync report for this run.

Drive write result: PASS. The canonical README and checklist were updated in place at their existing file IDs. Current reports, changelog and migration map were uploaded as separate files; historical `PHASE_1_HANDOFF.md` was not overwritten.
