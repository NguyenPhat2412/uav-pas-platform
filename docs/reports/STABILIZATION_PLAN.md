# Phase 1 stabilization plan

Base: feat/clean-architecture-auth, 16f70f66b7942aa1ca8e5301477f0ab459563ff4. Existing .DS_Store changes and handoff artifacts preserved. No commits/pushes; production and existing databases excluded.

## Source audit and corrections to the earlier report

- Confirmed: media lacked object authorization, confirmation, delete and UI actions.
- Confirmed: inventory mutations lacked replay keys; transfer moved the entire row even for partial quantity. Equipment already uses optimistic versioning. Status MAINTENANCE already exists; the earlier report understated this.
- Confirmed: access overrides are boolean and override presets; reset-to-template endpoint/UI was missing. Last access-manager protection was missing. Initializer also re-added deleted preset grants on every startup.
- Correction: role-to-preset lookup/fallback is not a strict hierarchy; backend controllers already require permissions. Preserve fallback during safe transition. No mass permission renames.
- Confirmed: Phase 1 state uses effects; TanStack is present, primarily for mission list. Logout/account cache isolation was missing.
- Confirmed: migration runner compatibility SQL and ddl-auto=update; no versioned baseline existed. Existing Mission schema must be included.
- Not verified: prior report's PostgreSQL/storage/browser acceptance and claims of complete audits. Need fresh isolated evidence.

## Execution groups

1. Migration: baseline current schema, additive stabilization migrations, isolated PostgreSQL/MinIO stack, clean-db and sample-copy comparison/upgrade, health/OpenAPI export. Explicit baseline only after schema comparison; no auto-baseline.
2. Media: linked resource authorization at registration and each action, uploader-aware private access, storage metadata confirmation, prevent used-file deletion, soft deletion to keep metadata/storage operations recoverable, Mission attachment checks.
3. Inventory: replay key bound to actor/action/resource/payload, transactional locking, nonnegative/over-allocation tests, partial quantity transfer creates destination balance while serialized units move whole.
4. Access: effective/template/override API, reset behavior, serialized last-manager protection across overrides, templates, lock and role changes; permission-split mapping proposal only.
5. Frontend: feature query keys by session, independent queries and targeted mutations/invalidation; clear cache on account/refresh/logout; station/UAV detail drawers/history, quantity controls, media, access UI.
6. Acceptance: existing Mission regression + new H2/PostgreSQL/MinIO/API tests; frontend lint/type/build + authenticated browser flow/screenshots. Report actual commands/results; unrun checks marked NOT_VERIFIED.

## Phase 2 backlog (not built here)

Mission ownership policy review, UAV/operator time windows and real concurrency tests, time-based equipment reservations, physical handover/return, mission status resource ownership guards. Reuse existing Mission; do not rebuild.
