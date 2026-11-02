# Current Permission Matrix

Inspection basis: current `HEAD` `6ecc85111a28e53679b2a6d8ac7ec93730d80be4`, source under `backend/src/main/java`, and completed backend test reports. This matrix records server-side codes and checks; a visible frontend action is not evidence of authorization.

## Permission registry (31 codes)

The registry is the `PermissionCode` enum and `PermissionDataInitializer`; the initializer creates missing catalog rows. Permission checks are evaluated on every `PermissionService.has` call from the database, so a currently valid JWT does not freeze permissions.

| Code | Enforcement style | Current server use |
|---|---|---|
| `USER_READ` | broad read | user list/detail |
| `USER_MANAGE` | broad management | lock/unlock/role |
| `PERMISSION_MANAGE` | broad management | user overrides and role templates |
| `STATION_READ` | broad read | station list/detail and linked media read |
| `STATION_MANAGE` | broad management | station create/update/delete and linked media write |
| `UAV_READ` | broad read | UAV list/detail/history and linked media read |
| `UAV_MANAGE` | broad management | UAV create/update/assignment/status/maintenance and linked media write |
| `INVENTORY_READ` | broad read | equipment/detail/history and linked media read |
| `INVENTORY_MANAGE` | broad management | catalog and all stock/reserve/release/transfer commands |
| `MEDIA_READ` | broad read + resource scope | media list/download |
| `MEDIA_MANAGE` | broad management + resource scope | register/upload URL/confirm/delete |
| `DASHBOARD_READ` | broad read | phase-1 dashboard |
| `AUDIT_READ` | broad read | audit log list |
| `MISSION_VIEW` | mission read + owner scope | mission list/detail/availability; active service catalog |
| `MISSION_VIEW_ALL` | mission read-all scope | all mission visibility and dashboard counts |
| `MISSION_CREATE` | mission command | create |
| `MISSION_UPDATE` | mission command | draft update/submit |
| `MISSION_CANCEL` | mission command | cancel |
| `MISSION_CONFIRM` | mission command | confirm and service create |
| `MISSION_REJECT` | mission command | reject |
| `MISSION_ASSIGN_STATION` | mission command | station assignment |
| `MISSION_ASSIGN_UAV` | mission command | UAV assignment |
| `MISSION_ASSIGN_OPERATOR` | mission command | operator assignment |
| `MISSION_START` | mission command + assigned-operator scope | start |
| `MISSION_RESERVE_EQUIPMENT` | mission command | mission reservation |
| `MISSION_COMPLETE` | mission command + assigned-operator scope | complete |
| `MISSION_STATUS_UPDATE` | mission command + assigned-operator scope for execution | ready/accept/conflict/fail |
| `MISSION_MEDIA_VIEW` | mission read + owner/operator/all scope | mission media list |
| `MISSION_MEDIA_UPLOAD` | mission write + owner/operator/all scope | mission media registration/confirm/attach |
| `MISSION_TIMELINE_VIEW` | mission read + owner/operator/all scope | timeline |
| `DASHBOARD_MISSION` | broad read-all dashboard | mission dashboard endpoint |

## Role template defaults

`ROLE_ADMIN` receives all 31 codes. `ROLE_COMMANDER` receives UAV management, media management, dashboard/audit, mission view-all, confirm/reject, resource assignment, equipment reserve, status update and timeline. `ROLE_OPERATOR` receives station/UAV/inventory/media reads, inventory/media management, dashboard, mission view/start/complete/status/media/timeline. `ROLE_PILOT` receives station/UAV/media reads, dashboard, mission view/create/update/cancel/media/timeline. These defaults are seeded once into role-template rows (`defaultsInitialized`); later template edits persist.

## Override and precedence

`IPermissionService.has` checks: authenticated and active/unlocked user → explicit `UserPermission` row (its `granted` boolean is authoritative, including `false`) → role-template row (presence grants; absence denies when a template exists) → hard-coded default fallback only when template storage is unavailable. `DELETE /permissions/users/{userId}/{code}` removes the override and returns to the template result. This is fine-grained at the enum-code level, but most operational modules intentionally expose only a broad `READ`/`MANAGE` pair. There is no server code for `STOCK_IN`, `STOCK_OUT`, `TRANSFER`, `UAV_ASSIGN`, or `MEDIA_CONFIRM` as independent permission codes; a caller with `INVENTORY_MANAGE`, `UAV_MANAGE`, or `MEDIA_MANAGE` gets all commands in that group.

## Recovery protections and evidence

`AccessRecoveryGuard` counts active, unlocked users effective for both `USER_MANAGE` and `PERMISSION_MANAGE`, locks the permission catalog row, and rejects a mutation that would leave zero effective managers. The guard is used by user lock/role changes, user permission changes, and role-template changes. Evidence: `AccessRecoveryTest` and `Phase1AccessIntegrationTest` cover last-manager protection, live grant/revoke/reset, role-template changes, stale JWT rejection after lock/demotion, and 401/403 behavior in current H2 tests. `StabilizationPostgresTest.concurrentRecoveryRevocationsRetainOneEffectiveManager` passed in the fresh current-HEAD disposable PostgreSQL run (`evidence/infra/postgres-stabilization-2.log`).

## Limits

This is a source/test audit, not a complete per-endpoint HTTP matrix for every role/resource combination. Direct PostgreSQL/storage/browser evidence is referenced in `BACKEND_BUSINESS_VERIFICATION.md`; absent combinations remain `NOT_VERIFIED`.
