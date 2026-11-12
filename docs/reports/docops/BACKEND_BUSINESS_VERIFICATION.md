# Backend Business Verification

Inspection basis: current repository source/tests at `HEAD` `6ecc85111a28e53679b2a6d8ac7ec93730d80be4`. A status is **VERIFIED** only where caller/API, business rule, authorization, persistence, and appropriate tests are evidenced together. Unit or controller-only coverage remains partial.

## Test evidence

- Baseline `cd backend && ./mvnw -q test` completed with **204 tests, 0 failures, 0 errors, 6 skipped** when no external endpoints were supplied (`evidence/test-results/backend-mvn-test-summary.txt`). Fresh current-HEAD external gates are recorded separately under `evidence/infra/`.
- Targeted access integration: `Phase1AccessIntegrationTest` covers live grant/deny/reset, role-template changes, stale JWT after lock/demotion, bad-password lock and permission-filtered dashboard.
- A fresh current-HEAD disposable PostgreSQL run executed all five `StabilizationPostgresTest` cases with 0 failures/errors (`evidence/infra/postgres-stabilization-2.log`, exit 0). A fresh S3-compatible RustFS run executed the storage gate with 0 failures/errors (`evidence/infra/storage-stabilization-rustfs.log`, exit 0). Actual MinIO remains **NOT_VERIFIED** because the Docker Hub/Quay/download attempts failed (`evidence/infra/minio-availability.log`).

## Module results

| Module | Status | Evidence and current limits |
|---|---|---|
| Authentication/session | **VERIFIED** for tested flows | Auth controller/service tests cover register, duplicate validation, login/invalid/inactive, refresh, logout, JWT invalidation, refresh expiry; access integration covers account lock and existing-token rejection. Zalo is mocked/unit-tested, external provider is not live-verified. |
| User/access management | **VERIFIED** for tested permission behavior | 31-code registry, role templates, explicit ALLOW/DENY/reset, live checks, last-manager guard and audit are implemented and tested. Broad `*_MANAGE` codes are not fine-grained. |
| Station | **PARTIAL** | list/detail/create/update/delete, duplicate code check and audit exist; service/spec tests cover list/spec/duplicate. Complete secured HTTP CRUD, FK deletion behavior and assignment lifecycle are not fully evidenced. |
| UAV fleet | **PARTIAL** | list/detail/create/update/station/status/maintenance/history endpoints and status-history persistence exist; serial uniqueness is entity/service guarded. Tests prove initial AVAILABLE/history and mission maintenance/overlap rejection, but duplicate-serial HTTP and the full status transition matrix are not verified. **Risk:** `IUavService.assign` changes AVAILABLE to ASSIGNED when assigning a station, while mission assignment requires AVAILABLE; this integration path is not resolved by tests. |
| Inventory | **PARTIAL** | Source and unit tests cover stock in/out/reserve/release/partial transfer, row locking, optimistic version, movement/audit persistence, negative/over-reserve/release rejection and request replay. Fresh current-HEAD PostgreSQL stabilization passed all five concurrency/replay/transfer/recovery tests in a disposable database (`evidence/infra/postgres-stabilization-2.log`). Physical handover/return and damaged/lost lifecycle are absent. |
| Mission/booking | **PARTIAL** | service catalog, mission draft/submit/list/detail, owner/operator visibility, state machine, station/UAV/operator/equipment assignment, half-open overlap predicate, media/timeline and release paths exist and have unit/integration tests. Full secured HTTP role matrix, concurrent assignment, explicit ownership policy for operations, and physical handover/return are not verified. Mission completion stores free-text `equipmentCondition` and releases quantity; it does not reconcile damaged/unreturned equipment. |
| Media | **PARTIAL** | registration, linked-resource authorization, signed upload/download, confirmation with object/metadata check, soft delete, post-commit cleanup, mission-link protection and audit are covered by service/access tests and S3-compatible run. Actual MinIO and every protected HTTP owner/uploader combination are not verified. |
| Dashboard | **PARTIAL** | counts are repository-backed and permission-filtered; mission dashboard scopes customers unless `MISSION_VIEW_ALL`. Tests cover mission dashboard and access integration. Runtime populated-data/HTTP matrix and semantics of global vs filtered counts are not fully verified. |
| Audit | **PARTIAL** | audit rows are written for auth/access, station/UAV/inventory/media/mission operations and read endpoint is permission protected. Append-only database enforcement and complete cross-module event coverage are not verified. |
| Notifications | **NOT_IMPLEMENTED** | no notification entity/controller/service was found. |
| Payment/entitlement | **NOT_IMPLEMENTED** | no payment/order/webhook/quota implementation was found. |
| AI/KV260 | **NOT_IMPLEMENTED** | no AI job/YOLO/KV260 worker path was found. |
| Search & rescue | **NOT_IMPLEMENTED** | no rescue module was found. |
| E-learning/assessment/certificates | **DEFERRED** | Phase 1/2 specifications explicitly defer them. |

## Targeted test coverage matrix

| Target | Current test evidence | Coverage boundary |
|---|---|---|
| Auth/session | `AuthControllerTest` (13), `AuthServiceTest` (20), `RefreshTokenServiceTest` (4), `InvalidatedTokenServiceTest` (3), `Jwt*Test`, `Phase1AccessIntegrationTest` (9) | H2/current source HTTP and service flows; external Zalo and real deployed storage are not verified. |
| Permission/recovery | `Phase1AccessIntegrationTest`, `AccessRecoveryTest` (3), `Phase2PermissionRegistryTest` (2), `PermissionServiceTest` (1) | Live override/template/lock behavior in H2; fresh disposable PostgreSQL concurrent recovery test passed. |
| Station | `StationServiceTest` (2), `StationSpecificationsTest` (4) | Service/spec coverage; secured CRUD HTTP and FK/delete behavior not verified. |
| UAV | `UavServiceTest` (1), `UavSpecificationsTest` (6), mission assignment tests | Initial creation/history/specs and selected mission rejection; duplicate serial, full transition matrix and station-to-mission flow not verified. |
| Inventory | `InventoryServiceTest` (3), `EquipmentSpecificationsTest` (5), fresh `StabilizationPostgresTest` (5) | Unit quantity/replay/partial transfer plus fresh disposable PostgreSQL locking/replay/transfer/recovery pass. Physical handover remains absent. |
| Media | `MediaServiceTest` (4), `MediaAccessServiceTest` (1), `S3CompatibleStorageServiceTest` (2), specifications (7) | Service/storage signing and authorization tests; real MinIO and protected HTTP permutations not verified. |
| Mission | `MissionStateTest` (3), `MissionServiceTest` (2), `MissionAssignmentTest` (3), `MissionExecutionTest` (4), `MissionPhase2IntegrationTest` (1), controller/media/timeline/service controller tests | H2 integration and unit state checks; ownership matrix, concurrent assignment and rejected-resource release need dedicated proof. |
| Dashboard/audit | `MissionDashboardTest` (2), `AuditLogSpecificationsTest` (8), access integration | Repository/spec and permission-filter checks; append-only and populated runtime semantics not verified. |

## Authentication and authorization observations

Server controllers use method-level `@PreAuthorize` checks. Resource scope is enforced again in mission/media services: customers/operators can access their mission; `MISSION_VIEW_ALL` bypasses ownership. Existing JWTs are re-evaluated against the current user row, status/lock and permission overrides. Self-protection and last-effective-manager behavior is covered by H2 tests; the fresh PostgreSQL stabilization gate passed in a disposable database; actual MinIO remains unverified.

`/api/v1/permissions/me` enumerates all 31 codes and reflects effective checks. Inventory is deliberately broad: `INVENTORY_MANAGE` authorizes stock-in, stock-out, reserve, release and transfer together. There is no proven way to allow `STOCK_IN` while denying `STOCK_OUT` because those codes do not exist.

## Important unresolved findings

1. **HIGH — default migration mode:** default `application.properties` uses `ddl-auto=update`, Flyway disabled, and compatibility initializer enabled by default. Stabilization profile is safer (`validate`, Flyway enabled) but deployment must select it explicitly.
2. **HIGH — UAV station assignment conflict:** station assignment transitions a UAV to `ASSIGNED`; mission assignment only accepts `AVAILABLE`. The end-to-end “create → station assign → mission assign” business flow is therefore **NOT_VERIFIED** and may reject a normal fleet workflow.
3. **HIGH — commander mission read permission:** the seeded commander template grants `MISSION_VIEW_ALL` but not `MISSION_VIEW`, while every mission list/detail/service-catalog route requires `MISSION_VIEW`. A default commander can be denied before the intended view-all scope applies.
4. **HIGH — mission rejection does not release resources:** `CONFIRMED` may transition to `REJECTED`, but `IMissionService.reject` records status/audit without calling `releaseResources`; assignments/reservations made before rejection can remain held.
5. **HIGH — mission completion/resource condition:** physical handover/return and damage/loss reconciliation are absent; completion releases reservations and returns UAV to AVAILABLE while only recording a free-text condition.
6. **MEDIUM — media validation:** `MediaUploadRequest` validates nonblank name/content type and positive size but has no MIME allowlist or maximum-size rule.
7. **MEDIUM — dashboard soft-delete count:** `IDashboardService.summary` uses `media.count()` without filtering `deleted=false`, so the media statistic can include soft-deleted rows.
8. **MEDIUM — station/UAV relationship handling:** station delete has no explicit relationship guard (database failure may map to generic 500), and UAV station assignment does not require an ACTIVE station.
9. **MEDIUM — coverage/storage boundary:** broad secured HTTP tests for every resource/ownership combination are narrower than service tests, and configured MinIO was not executed in the current run.

## Not implemented in this audit

No production code, schema, branch, database, or external service was changed. The audit only wrote handoff artifacts and sanitized evidence.
