# UAV PAS Phase 1 Handoff Report

Inspection date: 2026-10-06 UTC  
Repository: `uav-pas-platform`  
Workspace: `/Users/macbook/HK7/uav-pas-platform`  
Branch: `feat/clean-architecture-auth`  
HEAD: `16f70f6` (`chore: update mission dashboard metrics`)

## 1. Repository snapshot

The repository is a single Spring Boot backend plus a Next.js frontend. The backend is a modular monolith under `com.uav_pass.local`; the frontend is a separate Next.js application under `frontend/`. PostgreSQL is the intended runtime database, configured through environment variables and Docker Compose. H2 is used by the test profile. Media metadata is stored in PostgreSQL and binary objects use the S3-compatible storage abstraction (`S3CompatibleStorageService`), intended for MinIO in development and AWS S3-compatible storage in production.

The working tree has only macOS metadata changes (`.DS_Store`) and no source-code changes at inspection time. The repository also contains ignored/generated build output. No business code was changed for this report.

Actual service boundaries are package boundaries inside one Spring Boot service:

- `auth`: authentication, users, permissions, role templates, JWT and refresh-token services.
- `station`: station CRUD and status.
- `uav`: UAV CRUD, station assignment, status and maintenance history.
- `inventory`: equipment and inventory movement operations.
- `media`: media metadata and signed storage URLs.
- `dashboard`: permission-aware resource metrics and, in the existing Phase 2 code, mission metrics.
- `audit`: append-only application audit records and read API.
- `mission`: a pre-existing Phase 2 implementation; it is described separately below and is not counted as Phase 1.

Database schema creation is currently Hibernate-driven (`spring.jpa.hibernate.ddl-auto=update`) with a compatibility runner (`Phase1SchemaInitializer`) that adds `manual_locked` and updates a PostgreSQL permission constraint. There is no Flyway/Liquibase migration directory in the current backend.

## 2. Phase 1 status matrix

`VERIFIED` means the behavior has direct test evidence in the current repository. `IMPLEMENTED_NOT_VERIFIED` means code exists but the relevant runtime behavior was not exercised in this inspection. `PARTIAL` means the module exists but the requested Phase 1 behavior is incomplete or has material gaps. `OUT_OF_SCOPE` is intentionally outside Phase 1.

| Module | Status | Implemented behavior and evidence | Frontend | Backend surface | Data/auth gaps |
|---|---|---|---|---|---|
| User & Access Management | PARTIAL | Registration, password login, JWT, refresh-token rotation, logout invalidation, account lock after failed attempts, user list/detail/lock/unlock/role and permission editing exist. `Phase1AccessIntegrationTest` verifies 403 before a grant, access after a grant without relogin, access removal without relogin, manual lock rejecting an existing JWT, unlock/login recovery, role-template changes, and failed-login lockout. | Login and register pages; dashboard profile/logout. Access-control UI is not a dedicated page; permission/role editing is backend-only in the current frontend. | Auth routes, `/api/v1/users`, `/api/v1/permissions`, `/api/v1/role-templates`. Method-level `@PreAuthorize` checks backend permissions. | The `PermissionServiceImpl` still has role-based fallback sets (`ROLE_ADMIN`, `ROLE_COMMANDER`, `ROLE_OPERATOR`, default user), so the agreed “no strict hierarchy” model is only partial. Explicit user rows support allow/deny, with the explicit row taking precedence. |
| Station Management | PARTIAL | Station create/update/delete/list/detail and status are implemented. `StationServiceTest` verifies creation/audit and duplicate-code rejection at service level. | `/operations` has station create/list and loading/error message handling. No dedicated station-detail route. | `GET/POST/PUT/DELETE /api/v1/stations`, protected by `STATION_READ` or `STATION_MANAGE`. | Integration proof for database uniqueness and authenticated HTTP duplicate rejection was not run separately. Station detail UI is missing. |
| UAV Fleet & Maintenance | IMPLEMENTED_NOT_VERIFIED / PARTIAL | UAV create/update/list/detail, station assignment, status change, maintenance and status-history persistence exist. `UavServiceTest` verifies creation starts `AVAILABLE` and writes status history. | `/operations` has UAV create, station assignment and maintenance action. No dedicated UAV-detail or status-history page. | `GET/POST /api/v1/uavs`, `GET/PUT /api/v1/uavs/{id}`, `PUT /api/v1/uavs/{id}/station/{stationId}`, `PUT /api/v1/uavs/{id}/status`, `POST /api/v1/uavs/{id}/maintenance`, `GET /api/v1/uavs/{id}/history`. | Duplicate serial rejection is implemented in service/entity constraints but no dedicated duplicate-UAV integration case was verified in this inspection. No operator/resource handover exists in Phase 1. |
| Inventory & Equipment | PARTIAL | Quantity arithmetic distinguishes total, available and reserved quantities; stock-in/out, reserve, release and transfer movements are audited and stored. `InventoryServiceTest` verifies stock-in → reserve → release arithmetic and movement writes. Entity `@Version` provides optimistic locking. | `/operations` has equipment create, stock-in (+1), reserve (1), release (1), list and empty/error messaging. | `/api/v1/inventory/equipment`, `/history`, `/{id}`, and movement endpoints `/stock-in`, `/stock-out`, `/reserve`, `/release`, `/transfer/{stationId}`. `INVENTORY_READ`/`INVENTORY_MANAGE` are enforced. | No reservation owner, business reference, start/end time, physical handover/return, damage/lost lifecycle, or idempotency key exists. Concurrent reserve behavior is not directly tested. Serialized-vs-quantity semantics are represented only by optional `serialNumber`; there is no separate serialized-device aggregate. |
| Media Management | PARTIAL | Media metadata registration, listing, signed upload URL and signed download URL are implemented. `S3CompatibleStorageServiceTest` verifies signature structure and that the secret is not placed in the URL. | `/operations` lists media metadata, but there is no upload/confirmation/download/delete interaction in the Phase 1 UI. | `GET/POST /api/v1/media`, `GET /api/v1/media/{id}/upload-url`, `GET /api/v1/media/{id}/download-url`; `MEDIA_READ`/`MEDIA_MANAGE` are enforced. | No confirm-upload endpoint, delete endpoint, ownership/resource check, or private-media rejection test is present. The API returns signed URLs but does not verify that the caller owns or is allowed to access the linked entity. |
| Basic Dashboard | PARTIAL | `/api/v1/dashboard/summary` aggregates users, stations, UAVs, equipment units, reserved units, media and audit counts and hides counts when the corresponding permission is absent. `MissionDashboardTest` covers mission aggregation in the pre-existing Phase 2 extension. | `/` renders resource metrics and mission metrics, with auth redirect, loading, and a dashboard error banner. | `GET /api/v1/dashboard/summary` requires `DASHBOARD_READ`; `GET /api/v1/dashboard/missions` requires `DASHBOARD_MISSION`. | Resource dashboard behavior is unit-tested; a live browser/API dashboard check was not performed. UI visibility is not a substitute for backend authorization. |
| Audit Log | PARTIAL | Audit records are written by auth, station, UAV, inventory, media, and mission services. `AuditLogServiceImpl` persists actor/action/entity/details and the read controller is permission-protected. Unit tests verify audit calls for representative service operations. | `/operations` includes an Audit tab and renders loaded audit rows. | `GET /api/v1/audit-logs` requires `AUDIT_READ`. | No append-only database constraint is visible in the entity layer; the report does not claim immutable storage. Cross-module end-to-end audit coverage is incomplete. |
| E-Learning, Assessment, Certificates, Payment, Search & Rescue, AI Detection | OUT_OF_SCOPE | Not part of Phase 1. | No Phase 1 pages. | No Phase 1 endpoints. | Must remain outside the Phase 1 handoff. |

### Pre-existing Phase 2 code

Mission booking code already exists in the current HEAD under `backend/src/main/java/com/uav_pass/local/mission` and `frontend/src/app/missions`, `/missions/create`, `/missions/[id]`, `/operator/missions`, and `/admin/missions`. It includes mission state, assignment, reservation, media/timeline, dashboard and lifecycle endpoints. Its tests include `MissionPhase2IntegrationTest`, `MissionAssignmentTest`, `MissionExecutionTest`, `MissionMediaTimelineTest`, and concurrency contract checks. This code is reported as pre-existing Phase 2 work and is not evidence that the Phase 1 scope was complete.

## 3. API contract

No checked-in OpenAPI YAML/JSON export was found. Springdoc is configured in `backend/pom.xml`, `OpenApiConfig`, and `application.properties`; the runtime contract is expected at `/v3/api-docs` with Swagger UI at `/swagger-ui.html` when the backend is running. The endpoint inventory below is taken from current controllers, not a proposed contract.

### Authentication and `/api/v1/auth/me`

- `POST /api/v1/auth/register` — public. Example request: `{ "username": "pilot01", "email": "pilot@example.test", "password": "<sample-password>", "phoneNumber": "0900000000" }`. Validation is DTO-based; duplicate email/username/phone returns a conflict.
- `POST /api/v1/auth/login` — public. Example: `{ "usernameOrEmail": "pilot01", "password": "<sample-password>" }`. Returns an access token, optional refresh token, token type and user DTO; invalid credentials return 401.
- `GET /api/v1/auth/zalo-url`, `POST /api/v1/auth/zalo-callback` — Zalo OAuth integration; mock mode exists when credentials are not configured.
- `POST /api/v1/auth/refresh` — public refresh-token rotation path.
- `POST /api/v1/auth/logout` — authenticated; invalidates access token and revokes refresh token when the services are configured.
- `GET /api/v1/auth/me` — authenticated; returns the current user.

### User and permission editing

- `GET /api/v1/users`, `GET /api/v1/users/{id}` — `USER_READ`.
- `POST /api/v1/users/{id}/lock`, `POST /api/v1/users/{id}/unlock`, `PUT /api/v1/users/{id}/role` — `USER_MANAGE`.
- `GET /api/v1/permissions` and `PUT /api/v1/permissions/users/{userId}/{code}?granted=true|false` — `PERMISSION_MANAGE`.
- `GET /api/v1/role-templates` and `PUT /api/v1/role-templates/{role}/permissions/{code}?granted=true|false` — `PERMISSION_MANAGE`.

Example permission edit: `PUT /api/v1/permissions/users/42/STATION_MANAGE?granted=true`, no request body, returns 204. Invalid enum values return validation/bad-argument errors; unauthorised calls return 403.

### Stations

- `GET /api/v1/stations`, `GET /api/v1/stations/{id}` — `STATION_READ`.
- `POST /api/v1/stations`, `PUT /api/v1/stations/{id}`, `DELETE /api/v1/stations/{id}` — `STATION_MANAGE`.

Example create: `{ "code": "ST-HN-01", "name": "Hanoi Base", "address": "Example address", "latitude": 21.03, "longitude": 105.85, "status": "ACTIVE" }`. Station codes are unique in the entity and duplicate creation is rejected by service/constraint.

### UAVs and maintenance

- `GET /api/v1/uavs`, `GET /api/v1/uavs/{id}`, `GET /api/v1/uavs/{id}/history` — `UAV_READ`.
- `POST /api/v1/uavs`, `PUT /api/v1/uavs/{id}`, `PUT /api/v1/uavs/{id}/station/{stationId}`, `PUT /api/v1/uavs/{id}/status`, `POST /api/v1/uavs/{id}/maintenance` — `UAV_MANAGE`.

Example create: `{ "model": "Matrice 350", "serialNumber": "UAV-SAMPLE-001", "manufacturer": "Example Manufacturer" }`. The entity requires a unique serial number and starts `AVAILABLE`; maintenance changes status to `MAINTENANCE` and records a history row.

### Inventory, reservations and movements

- `GET /api/v1/inventory/equipment`, `GET /api/v1/inventory/equipment/{id}`, `GET /api/v1/inventory/equipment/history` — `INVENTORY_READ`.
- `POST /api/v1/inventory/equipment`, `PUT /api/v1/inventory/equipment/{id}`, and movement endpoints `POST /stock-in`, `/stock-out`, `/reserve`, `/release`, `/transfer/{stationId}` — `INVENTORY_MANAGE`.

Example stock-in: `POST /api/v1/inventory/equipment/7/stock-in` with `{ "quantity": 10, "note": "Sample stock-in" }`. Quantity must be positive; stock-out/reserve cannot exceed available quantity; release cannot exceed reserved quantity. Responses expose `quantity`, `availableQuantity`, `reservedQuantity`, `status`, station and optional serial number.

### Media

- `GET /api/v1/media` — `MEDIA_READ`.
- `POST /api/v1/media` — `MEDIA_MANAGE`; registers metadata such as `{ "originalName": "flight-log.txt", "contentType": "text/plain", "size": 1024, "type": "DOCUMENT", "linkedEntityType": "UAV", "linkedEntityId": "7" }`.
- `GET /api/v1/media/{id}/upload-url` — `MEDIA_MANAGE`.
- `GET /api/v1/media/{id}/download-url` — `MEDIA_READ`.

No media-confirm or media-delete endpoint exists in the current controller. No separate resource-owner check is visible beyond the permission annotation.

### Dashboard and audit

- `GET /api/v1/dashboard/summary` — `DASHBOARD_READ`; returns permission-filtered Phase 1 counts.
- `GET /api/v1/dashboard/missions` — `DASHBOARD_MISSION`; this is Phase 2 code, not Phase 1.
- `GET /api/v1/audit-logs` — `AUDIT_READ`; returns paginated audit rows.

Errors use the project `ErrorResponse` shape: timestamp, status, error, optional stable `code`, message and path. `SystemException`, validation, access denial, invalid state and optimistic-lock conflicts map to 4xx responses; unhandled errors map to 500.

### Endpoints relevant to Phase 2

The following existing resources can be reused by a booking implementation:

- `GET /api/v1/stations` and `GET /api/v1/stations/{id}` (`STATION_READ`), with station status and coordinates.
- `GET /api/v1/uavs` and `GET /api/v1/uavs/{id}` (`UAV_READ`), with UAV status and station assignment.
- `GET /api/v1/inventory/equipment` (`INVENTORY_READ`), with available/reserved quantities.
- `POST /api/v1/inventory/equipment/{id}/reserve` and `/release` (`INVENTORY_MANAGE`), currently quantity-only and without mission reference/time window.
- `GET /api/v1/media/{id}/download-url` (`MEDIA_READ`), currently global-permission based rather than mission ownership based.

A Phase 2 implementation must add booking-specific ownership, operator assignment, temporal conflict checks, mission references and lifecycle orchestration around these APIs.

## 4. Database and inventory behavior

### Current data dictionary

The current entity model creates/updates these tables through Hibernate:

- `users`: username, email, password hash, phone, Zalo ID, profile fields, role enum, account status, failed attempts, lock timestamps and `manual_locked`.
- `permissions`: enum permission code and description.
- `role_templates`, `role_template_permissions`, `user_permissions`, `refresh_tokens`, `invalidated_tokens`.
- `uav_stations`: unique code, name, address, latitude, longitude and status.
- `uavs`: model, unique serial number, manufacturer, status, station foreign key and last-maintenance timestamp.
- `uav_status_history`: UAV, from/to status, reason and actor.
- `equipment`: name, equipment type, optional serial number, `quantity`, `available_quantity`, `reserved_quantity`, status, station and optimistic `version`.
- `inventory_movements`: equipment, movement type, quantity, source/target station, actor and note.
- `media_assets`: object key, original name, content type, size, media type, linked entity type/ID, uploader and storage provider.
- `audit_logs`: actor ID/username, action, entity type/ID and free-form details.
- Existing Phase 2 tables/entities also include mission, mission events, mission media, mission equipment reservations, UAV services and related lifecycle data.

### Inventory semantics and gaps

The model distinguishes quantity-based stock from serialized records only by an optional `serialNumber`. There is no separate serialized-device table or serial-unit lifecycle. Total stock is `quantity`; usable stock is `availableQuantity`; held stock is `reservedQuantity`; physical in-use stock is not a separate field. `EquipmentStatus` is only a coarse status and does not provide first-class damaged/lost/maintenance states.

Stock-in increases total and available. Stock-out decreases total and available. Reserve decreases available and increases reserved. Release decreases reserved and increases available. Transfer performs a stock-out from the old station, changes station, then stock-in at the target, and writes a transfer movement. All are synchronous service methods under `@Transactional` and create movement/audit rows.

There are no reservation start/end fields, reservation owner/reference fields in the Phase 1 inventory model, or database overlap constraints. Physical handover and return are not implemented. Damage, loss, maintenance quarantine and reconciliation workflows are not implemented. Repeated requests are not idempotent: repeating reserve/release changes quantities again or eventually fails on availability; there is no idempotency key or reservation identifier.

`Equipment` uses JPA `@Version`, so stale concurrent writes can map to `OPTIMISTIC_LOCK_CONFLICT` through the global exception handler. A dedicated concurrent-reservation test was not found or run; high-volume concurrency remains NOT_VERIFIED. The existing Phase 2 reservation wrapper calls this quantity-only service and adds mission reservation rows, but Phase 1 itself has no booking semantics.

## 5. Authentication and authorization

Authentication is JWT-based with a database-backed user lookup. Login accepts username or email, hashes passwords with BCrypt, tracks failed attempts, manually locks users, rejects locked/inactive accounts, and issues an access token plus a refresh token when the refresh service is configured. Refresh rotates a refresh token; logout invalidates the access token and revokes the refresh token. Existing access tokens are rejected after account lock because `JwtAuthenticationFilter`/user lookup and the account status filter re-check current account state.

Permission enforcement is backend-first: controllers use `@PreAuthorize("@permissionService.has(authentication, '...')")`, and `PermissionServiceImpl` loads the current user and permission data for each authorization decision. The UI hides no security boundary; frontend controls are convenience only.

User-specific overrides are stored in `user_permissions` with a boolean `granted`. A present explicit row wins over the role/template/default fallback, so `granted=false` acts as DENY and `granted=true` acts as ALLOW. Role templates are stored in `role_templates` and `role_template_permissions`; role/default fallback lists still inspect the `UserRole` enum, which means the agreed permission-only model is not fully realized. Permission edits take effect for already-issued JWTs because the permission check reads current database state on each request; `Phase1AccessIntegrationTest` verifies grant/revoke without relogin.

Permission changes are restricted to `PERMISSION_MANAGE`; user lock/role changes require `USER_MANAGE`. There is no separate database invariant preventing the last access-management account from being stripped of all permissions. The current implementation also permits an administrator with permission-management authority to change grants broadly; the report does not claim account-preservation safeguards that are not present.

## 6. Frontend and TanStack Query

### Routes

Current Next.js routes include:

- `/login`, `/register`.
- `/` dashboard/profile.
- `/operations` combined station, UAV, equipment, media and audit surface.
- `/missions`, `/missions/create`, `/missions/[id]`, `/operator/missions`, `/admin/missions` (pre-existing Phase 2 surfaces).

`QueryProvider` creates a TanStack `QueryClient` with a 15-second stale time and `refetchOnWindowFocus=false`. The current query-key convention is visible in `useMissions`: `['missions', 'list', filters ?? {}]`; mission mutations invalidate `['missions']`.

TanStack Query is used for mission list/mutation state. The Phase 1 dashboard, operations, auth, media, station, UAV, inventory and audit pages use direct `useEffect`/`useState` service calls instead of queries and mutations. They have no shared cache invalidation after changes; they reload the entire operations payload after a mutation. Logout clears local storage and context. Token refresh is centralized in `api.client.ts`, but refresh failure clears storage without an explicit router redirect. Permission changes are reflected on the next request, not via a query-cache/session invalidation mechanism.

The operations page has a loading spinner, generic error message and empty table states. Dashboard has loading placeholders and a summary error banner. Permission-denied states are mostly represented as generic load/action errors; there is no dedicated access-control page. Media UI is metadata-only and does not implement upload confirmation, download or delete actions.

## 7. Verification evidence

Evidence artifacts are under `docs/handoff/evidence/`.

| Check | Exact command | Result |
|---|---|---|
| Backend build/unit/integration suite | `cd backend && ./mvnw -q test` | Exit 0; `Tests run: 138, Failures: 0, Errors: 0, Skipped: 0`; log: `backend-mvn-test.log`, summary: `backend-test-summary.txt`. Tests use the H2 test profile and the embedded Spring context; no shared/production DB was changed. |
| Frontend lint | `cd frontend && npm run lint` | Exit 0; log: `frontend-lint.log`. |
| Frontend production build/type check | `cd frontend && npm run build` | Exit 0; Next 16.3.6 compiled, TypeScript completed, 11 routes generated; log: `frontend-build.log`. |
| OpenAPI/contract test | No standalone OpenAPI contract test command exists in this repository. | NOT_VERIFIED. Springdoc runtime configuration exists, but no exported contract file was checked in. |
| Frontend service smoke | `cd frontend && npm exec -- next start -p 3102`, Python HTTP probes for `/`, `/operations`, `/missions`, `/missions/create`, `/admin/missions`, `/operator/missions` | All returned HTTP 200; service log: `frontend-service.log`. This is route availability only, not authenticated API correctness. |
| Backend service health | No live backend startup was run in this handoff because the default runtime expects a configured PostgreSQL/JWT environment and the task forbids shared/production DB changes. | NOT_VERIFIED. |
| Browser screenshots/visual QA | No browser surface was available in this session. | NOT_VERIFIED; no screenshots captured. |

Specific evidence:

- Unauthorized access rejection: `Phase1AccessIntegrationTest.permissionDenialIsForbiddenAndGrantAppliesWithoutRelogin`, `manualLockRejectsExistingJwtAndUnlockRestoresLogin`; PASS within the 138-test suite.
- Permission override behavior: `Phase1AccessIntegrationTest` verifies direct grant and revoke without relogin, role-template grant/revoke, and current-token enforcement; PASS.
- Duplicate station code: `StationServiceTest.duplicateCodeIsRejected`; PASS. Duplicate UAV serial is implemented but no dedicated duplicate integration test was found; NOT_VERIFIED.
- Negative stock prevention: entity/service guard checks exist and `InventoryServiceTest` verifies valid reserve/release arithmetic. An explicit negative-quantity and concurrent-reserve test was not found; NOT_VERIFIED.
- Concurrent reservation attempts: NOT_VERIFIED. `@Version` is present on equipment, but no direct concurrent reservation test was found.
- Repeated reservation/release: one reserve/release sequence is covered by `InventoryServiceTest`; idempotent repeated-request semantics are not implemented and not verified.
- Private-media access rejection: NOT_VERIFIED. Media endpoints enforce global permission codes but no owner/resource check is visible.
- Audit creation: station and inventory unit tests verify audit service calls; UAV status history and mission tests cover additional audit paths. A complete cross-module audit acceptance test was not found.

No production/shared database was modified. Docker Compose and a live backend health call were not run.

## 8. UI evidence

No screenshots were captured because no browser automation surface was available. The safe route smoke only established that the built Next.js server rendered HTTP 200 responses for the listed routes. Screenshots still required for review:

- Dashboard (`/`).
- Access Control (no dedicated current route; backend-only permission UI).
- Station detail (no dedicated route; station table is inside `/operations`).
- UAV detail/history (no dedicated route; UAV table is inside `/operations`).
- Inventory/reservations (equipment table inside `/operations`).
- Media Library (metadata table inside `/operations`).
- Audit Log (audit tab inside `/operations`).

These absent screenshots are UI evidence gaps, not claims that the backend is incorrect.

## 9. Phase 2 readiness

| Area | Severity | Observed evidence | Affected files/APIs | Proposed next action |
|---|---|---|---|---|
| Mission creation | Medium | Pre-existing Phase 2 `POST /api/v1/missions` and `/missions/create` already exist and are tested, but they are outside Phase 1 and need a separate acceptance review. | `mission/controller/MissionController.java`, `mission/service/impl/MissionServiceImpl.java`, `frontend/src/app/missions/create/page.tsx` | Keep as separate Phase 2 scope; first validate customer ownership and role/permission behavior against the Phase 2 spec. |
| Station/UAV/operator assignment | High | Station/UAV assignment exists; operator assignment is represented in Phase 2 mission code, but Phase 1 has no operator availability or assignment model. | `uav`, `station`, `auth`, `mission` packages | Add an explicit operator capability/availability contract and conflict tests before production booking. |
| Time-based booking/conflicts | High | Phase 1 has no reservation time fields. Existing Phase 2 mission entities add mission start/end and overlap queries, but this is not a Phase 1 guarantee. | `mission/entity/Mission.java`, `mission/repository/MissionRepository.java` | Define half-open interval semantics, lock strategy and conflict error contract in Phase 2 design/tests. |
| Equipment reservation | High | Phase 1 reserve/release is quantity-only and has no owner/reference/time window. | `inventory/Equipment.java`, `InventoryServiceImpl`, `/api/v1/inventory/equipment/{id}/reserve` | Use a mission reservation aggregate/reference and keep inventory mutations transactional; add concurrent and idempotency tests. |
| Mission-media attachment | High | Phase 1 media has linked entity strings and signed URLs but no owner/private-access checks, confirmation or deletion. | `media/MediaController.java`, `MediaServiceImpl`, `MediaAsset.java` | Define mission-media authorization and upload-confirm/delete lifecycle before exposing mission media. |
| Handover/return | High | No physical handover or return entity/state exists for UAV/equipment. | `uav`, `inventory`, `media` packages | Add explicit handover/return records and audit transitions as a Phase 2 prerequisite. |
| Mission timeline/audit | Medium | Phase 1 audit log exists; pre-existing Phase 2 mission events/timeline also exist but require separate review. | `audit`, `mission/entity/MissionEvent.java` | Reconcile mission events with audit records and define which is the canonical operational history. |
| Database lifecycle | High | Schema is generated/updated by Hibernate and compatibility runner, with no versioned migrations. | `application.properties`, `Phase1SchemaInitializer` | Establish a versioned migration baseline before adding production booking tables. |
| Frontend state architecture | Medium | TanStack Query exists and is used for missions; Phase 1 screens still use direct effects and no cache invalidation. | `frontend/src/providers/QueryProvider.tsx`, `features/*`, `app/operations/page.tsx` | Standardize query keys/mutations for station/UAV/inventory/media and invalidate after mutations. |

## 10. Final summary

**Status: READY_WITH_GAPS**

Verified in the current workspace:

- Backend compilation and all 138 tests pass.
- Frontend lint and production build pass.
- Auth/access integration verifies unauthorized rejection, direct permission changes without relogin, account lock behavior and role-template changes.
- Station, UAV, inventory, media-signing, dashboard and audit service behavior has focused unit evidence.
- The built frontend serves the current routes successfully.

Remaining unverified or incomplete areas:

- No live backend/PostgreSQL/MinIO health run was performed in this handoff.
- No browser screenshots or visual/keyboard/mobile QA were captured.
- No checked-in OpenAPI export exists; only runtime Springdoc configuration is present.
- No dedicated tests for duplicate UAV serials, concurrent reservations, repeated-request idempotency or private-media rejection were found.
- Inventory lacks time-windowed, owner-linked reservations and physical handover/return.
- Media lacks confirmation/delete and resource ownership checks.
- Hibernate `ddl-auto=update` is not a versioned production migration strategy.
- Permission defaults still inspect role enum fallback sets, so the agreed permission-only model is only partially implemented.

The first recommended Phase 2 implementation task is to freeze and review a resource contract for **mission ownership + station/UAV/operator assignment + temporal conflict semantics**, then add migration-backed reservation/reference primitives before extending the UI. Existing Phase 2 mission code should be treated as pre-existing work requiring this separate review, not as completed Phase 1 behavior.
