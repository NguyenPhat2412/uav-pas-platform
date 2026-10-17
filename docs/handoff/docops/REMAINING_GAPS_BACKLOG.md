# Remaining Gaps Backlog

Inspection basis: current published `HEAD` `6ecc85111a28e53679b2a6d8ac7ec93730d80be4`, current final handoff reports, and current source inspected 2026-10-07. The backlog is sorted by release risk and then dependency order. It includes confirmed implementation gaps and confirmed acceptance/evidence gaps; an evidence gap does not imply that the underlying service is incorrect.

Priority meanings: **P0** blocks a production release decision; **P1** is a high-risk prerequisite for production booking or security sign-off; **P2** is a material completeness or verification gap; **P3** is deferred scope or a product decision; **P4** is handoff/release hygiene.

## P0 — release blockers

### GAP-001 — Runtime schema policy is unsafe by default

- **Module / priority:** Infrastructure and database lifecycle — **P0**.
- **Problem:** The default `application.properties` permits `spring.jpa.hibernate.ddl-auto=update`, leaves Flyway disabled, and leaves `Phase1SchemaInitializer` enabled. Startup can therefore mutate a schema outside the versioned V1/V2 migrations. The safer stabilization profile is opt-in, so the ordinary runtime has not been shown to be migration-managed.
- **Required behavior:** The release profile must use Flyway migrations, `ddl-auto=validate`, an explicit baseline policy, and a disabled compatibility initializer. Deployment configuration must make selecting that profile unambiguous.
- **Acceptance criteria:** A clean and populated disposable PostgreSQL database starts with the release profile; Flyway history reaches the expected version; representative rows survive the rehearsal; Hibernate validation reports no schema drift; the compatibility runner is disabled; health and OpenAPI smoke checks pass; a configuration test fails if the unsafe defaults return.
- **Dependencies:** None; this gates new booking schema work and shared-environment rollout.
- **Likely files:** `backend/src/main/resources/application.properties`, `backend/src/main/resources/application-stabilization.properties`, `backend/src/main/java/com/uav/platform/config/Phase1SchemaInitializer.java`, `backend/src/main/resources/db/migration/`, `docker-compose*.yml`, deployment environment configuration.
- **Tests / evidence:** `MigrationBaselineTest`, `BackendHealthTest`, disposable PostgreSQL clean/populated rehearsal, Flyway history check, default-profile startup/configuration test.
- **Frontend/backend independence:** Backend and deployment only; frontend changes are independent.

### GAP-002 — UAV station assignment conflicts with mission assignment

- **Module / priority:** UAV fleet and mission booking — **P0**.
- **Problem:** `IUavService.assign` changes an `AVAILABLE` UAV to `ASSIGNED` when it receives a station assignment, while mission assignment historically required `AVAILABLE`; the current source also permits `ASSIGNED` in later `ready`/`start` paths. The normal “create UAV → assign station → assign mission” flow is unresolved and may reject a valid booking.
- **Required behavior:** Define one state contract for station assignment, mission assignment, execution, release, maintenance, and inactivity. Station assignment must not accidentally consume flight-booking availability, or mission assignment must explicitly accept the station-assigned state with the correct ownership and conflict rules.
- **Acceptance criteria:** The documented state transition table is enforced by service and HTTP tests; the station-then-mission flow succeeds for an eligible UAV; unavailable, maintenance, inactive, overlapping, and released cases return stable conflict codes; every transition writes the expected history/audit event; release returns the UAV to the defined post-mission state.
- **Dependencies:** Must be resolved together with GAP-005 and GAP-006 (mission ownership/time windows and concurrency); migration policy in GAP-001 should be fixed before adding state tables or constraints.
- **Likely files:** `backend/src/main/java/com/uav/platform/modules/uav/service/impl/IUavService.java`, `backend/src/main/java/com/uav/platform/modules/uav/common/UavStatus.java`, `backend/src/main/java/com/uav/platform/modules/mission/service/impl/IMissionService.java`, `backend/src/main/java/com/uav/platform/modules/mission/entity/Mission.java`, UAV/mission controllers and repositories, `frontend/src/features/operations/components/UavPanel.tsx`, mission detail UI.
- **Tests / evidence:** `UavServiceTest`, `MissionAssignmentTest`, `MissionExecutionTest`, `MissionPhase2IntegrationTest`, a new authenticated HTTP station→mission flow, and disposable PostgreSQL assignment/release coverage.
- **Frontend/backend independence:** Backend contract is authoritative; frontend must consume the resolved statuses and show errors, so this is coupled for final acceptance.

### GAP-003 — Mission rejection can retain reserved resources

- **Module / priority:** Mission lifecycle and inventory/UAV release — **P0**.
- **Problem:** `IMissionService.reject` transitions a mission to `REJECTED` and records an event/audit entry without calling `releaseResources`. Equipment reservations and UAV state held before rejection can remain reserved.
- **Required behavior:** Every rejection path that can follow resource assignment must release all active mission reservations and assigned UAV state transactionally, mark mission reservations released, and record the release and rejection events. If the state machine intentionally disallows rejection after full reservation, that policy must be explicit and cancellation/failure must provide the equivalent release. The operation must be safe when resources were not reserved or a retry arrives.
- **Acceptance criteria:** Rejecting a currently rejectable mission with held resources releases equipment quantities and UAV state exactly once; any state that is not rejectable has an explicit release path and stable conflict response; reservation rows contain release timestamps; a retry is idempotent or returns a stable terminal-state conflict; no resource is released for an unassigned draft; audit/timeline entries identify actor and reason; rollback leaves the mission and resources consistent on failure.
- **Dependencies:** GAP-002 state contract and GAP-011 mission-linked reservation semantics.
- **Likely files:** `backend/src/main/java/com/uav/platform/modules/mission/service/impl/IMissionService.java`, `MissionEquipmentReservation.java`, `MissionStatus.java`, inventory/UAV services, migration files if release metadata changes, mission controller/frontend mutation handling.
- **Tests / evidence:** Extend `MissionExecutionTest`, `MissionStateTest`, `MissionPhase2IntegrationTest`; add reject-after-reservation service and HTTP tests, including retry/rollback and audit assertions.
- **Frontend/backend independence:** Backend correctness is required; frontend only needs to render the returned terminal state/error.

## P1 — high-risk booking, authorization, and infrastructure gaps

### GAP-004 — Commander role seed does not satisfy mission read controller checks

- **Module / priority:** User/access permissions and mission read — **P1**.
- **Problem:** The seeded `ROLE_COMMANDER` template contains `MISSION_VIEW_ALL` but not `MISSION_VIEW`; mission controllers require `MISSION_VIEW` before service-level view-all scope is evaluated. A default commander can therefore be denied mission list/detail/service-catalog access despite having the intended all-missions scope.
- **Required behavior:** Make the role-template seed and controller/service contract agree. A commander must have the permission required to enter mission read endpoints and retain all-mission visibility, or controllers must intentionally authorize the view-all code with documented semantics.
- **Acceptance criteria:** Fresh initialization and an existing-template upgrade produce the intended commander grants; commander mission list/detail/catalog/dashboard requests succeed; a role without either read permission receives 403; explicit user DENY still wins; permission matrix and OpenAPI documentation match runtime behavior.
- **Dependencies:** GAP-001 if a migration is required for existing role-template rows; GAP-010 if action-level permission taxonomy changes the read model.
- **Likely files:** `backend/src/main/java/com/uav/platform/modules/user/config/PermissionDataInitializer.java`, `backend/src/main/java/com/uav/platform/modules/user/service/impl/IPermissionService.java`, mission controllers/services, `frontend/src/features/access/`, permission documentation and seed migration.
- **Tests / evidence:** `Phase1AccessIntegrationTest`, `PermissionServiceTest`, `Phase2PermissionRegistryTest`, `MissionControllerTest`, and authenticated commander HTTP tests against a fresh and populated database.
- **Frontend/backend independence:** Backend seed/authorization first; frontend access labels and route smoke are downstream.

### GAP-005 — Mission ownership and operator capability policy is incomplete

- **Module / priority:** Mission booking authorization and assignment — **P1**.
- **Problem:** Mission owner/operator visibility exists in service code, but a complete secured HTTP role matrix and explicit policy for customer, assigned operator, operations/commander, and administrator actions is not evidenced. Operator capability/availability is not a first-class contract; assignment permissions and execution ownership are spread across service checks.
- **Required behavior:** Define who can create, read, update, cancel, assign station/UAV/operator/equipment, confirm/reject, start, report conflict, complete, fail, attach media, and view timeline. Define operator eligibility, active status, capability, and ownership checks independently of UI controls.
- **Acceptance criteria:** A role/action/resource matrix is checked through controllers and services; customer access is limited to owned missions; assigned operators can perform only their execution actions; operations roles can perform documented management actions; unrelated operators receive 403; inactive/unqualified operators cannot be assigned; all failures use stable error codes.
- **Dependencies:** GAP-002, GAP-006, GAP-010, and GAP-011.
- **Likely files:** `backend/src/main/java/com/uav/platform/modules/mission/controller/MissionController.java`, `IMissionService.java`, user role/status/permission services, mission repositories/specifications, `MissionEvent.java`, frontend mission detail/operator/admin pages.
- **Tests / evidence:** `MissionControllerTest`, `MissionAssignmentTest`, `MissionExecutionTest`, `MissionPhase2IntegrationTest`, new parameterized role/resource HTTP tests, and browser traces for customer/operator/commander paths.
- **Frontend/backend independence:** Coupled; backend defines the boundary and frontend must expose only the supported actions.

### GAP-006 — Concurrent mission assignment is not proven on PostgreSQL

- **Module / priority:** Mission time-window and concurrency integrity — **P1**.
- **Problem:** The source uses half-open overlap predicates and row/version checks, but there is no database exclusion constraint and dedicated concurrent mission assignment evidence is not verified. Two assignments can race unless lock order and conflict handling are explicitly designed.
- **Required behavior:** Preserve `[start,end)` semantics, exclude terminal/cancelled missions, define lock order for UAV/operator/station/equipment, and return one stable conflict result when concurrent assignments target the same resource/window.
- **Acceptance criteria:** Adjacent windows are allowed and overlapping windows conflict; two concurrent PostgreSQL assignments yield at most one winner; loser receives the documented conflict code; no partial resource assignment or leaked reservation remains; retry after conflict sees current state; the test is repeatable on a disposable PostgreSQL database.
- **Dependencies:** GAP-001, GAP-002, GAP-005, and GAP-011.
- **Likely files:** mission repositories/specifications/services, `UavRepository`, inventory repositories/services, V3+ migrations for indexes/constraints if selected, stabilization test profile.
- **Tests / evidence:** `MissionConcurrencyContractTest`, `MissionSpecificationsTest`, new `StabilizationPostgresTest` concurrent assignment cases, and lock-order documentation.
- **Frontend/backend independence:** Backend only for correctness; frontend availability messaging depends on the final error contract.

### GAP-007 — Physical handover/return and equipment-condition reconciliation are absent

- **Module / priority:** Mission execution, UAV, and inventory lifecycle — **P1**.
- **Problem:** Mission completion stores free-text `equipmentCondition` and releases reserved quantity. There are no physical handover/return records, custody transitions, damaged/lost/maintenance quarantine workflow, or reconciliation for unreturned equipment.
- **Required behavior:** Model handover and return for UAV/equipment with actor, time, quantity/unit, condition, exception reason, and audit/timeline event. Completion must reconcile every assigned item, keep unresolved or damaged items out of available stock, and make the next operational state explicit.
- **Acceptance criteria:** A mission cannot silently complete with missing custody records; normal return restores available stock; damaged/lost/unreturned items transition to the documented non-available state; serialized units are tracked individually where required; retries are idempotent; audit/timeline and dashboard counts reflect the resulting state.
- **Dependencies:** GAP-011 reservation references and GAP-023 canonical timeline/audit policy; migration policy GAP-001.
- **Likely files:** `backend/src/main/java/com/uav/platform/modules/mission/entity/Mission.java`, `MissionEquipmentReservation.java`, inventory `Equipment.java`/`EquipmentStatus.java`, UAV entities/services, new handover/return entities and migrations, mission completion DTO/controller, mission detail UI.
- **Tests / evidence:** New service/controller/integration tests for handover, return, damage/loss, partial return, serialized equipment, completion rollback, and populated PostgreSQL rehearsal.
- **Frontend/backend independence:** Coupled; frontend needs custody/condition controls and status display after the backend contract is fixed.

### GAP-008 — Core modules lack complete authenticated HTTP and browser E2E proof

- **Module / priority:** Cross-module acceptance — **P1**.
- **Problem:** Station, UAV, inventory, media, mission, dashboard, and user lifecycle flows have service/unit evidence, but not a complete authenticated role/resource HTTP matrix or browser journey. Build success and visible controls do not prove authorization, persistence, or business transitions.
- **Required behavior:** Exercise the supported role matrix through HTTP and browser flows using sanitized fixtures, including positive and negative ownership cases, validation/conflict errors, mutations, reload/persistence, and account/session changes.
- **Acceptance criteria:** Each endpoint family has authenticated 200/201/204, 400, 401/403, 404, and relevant 409 coverage; customer/operator/commander/admin ownership cases are explicit; station/UAV/inventory/media/mission/dashboard flows survive reload; no secrets, signed URLs, or personal data enter evidence; failures are reproducible from documented commands.
- **Dependencies:** GAP-002 through GAP-007, GAP-009, and GAP-011 define the expected behavior before the matrix is frozen.
- **Likely files:** Backend controller/integration test packages; `frontend/src/app/**`; browser harness and `docs/handoff/final/evidence/`.
- **Tests / evidence:** New authenticated HTTP integration suite, Playwright/browser traces, `TEST_VERIFICATION_REPORT.md` updates, and sanitized fixtures/logs.
- **Frontend/backend independence:** Coupled acceptance; backend tests can run independently, but end-to-end sign-off requires both.

### GAP-009 — Configured MinIO protected transfer remains unverified

- **Module / priority:** Media storage infrastructure — **P1**.
- **Problem:** RustFS passed the S3-compatible storage gate, but the configured `minio/minio` image could not be pulled. Signed upload/download, metadata confirmation, authorization, and deletion have therefore not been proven against the supported target.
- **Required behavior:** Run the actual supported MinIO service with the same bucket/credentials/configuration used by deployment and verify the complete protected media lifecycle.
- **Acceptance criteria:** A disposable MinIO run passes signed PUT, object existence/metadata check, confirmation, signed GET, unauthorized owner/resource access rejection, soft delete/post-commit object cleanup, and retry/error behavior; evidence records image/version/config without secrets; if MinIO cannot be supported, the deployment target is explicitly changed and documented.
- **Dependencies:** GAP-001 for release-profile startup; GAP-008 for protected HTTP matrix; media validation GAP-014.
- **Likely files:** `backend/src/main/java/com/uav/platform/modules/media/service/impl/S3CompatibleStorageService.java`, media services/controllers, `docker-compose*.yml`, `backend/src/test/java/com/uav/platform/stabilization/StabilizationMinioTest.java`, object-storage environment configuration.
- **Tests / evidence:** `StabilizationMinioTest`, protected media HTTP tests, isolated MinIO logs and sanitized evidence.
- **Frontend/backend independence:** Infrastructure/backend; frontend media controls can be tested with a stub but release sign-off requires the real storage target.

### GAP-010 — Action-level permission taxonomy is not implemented

- **Module / priority:** Authorization model — **P1**.
- **Problem:** Broad `INVENTORY_MANAGE`, `UAV_MANAGE`, and `MEDIA_MANAGE` grants cover multiple operations. There are no independent codes for inventory stock-in/out/transfer, UAV station assignment/status/maintenance, or media confirmation. A user cannot be granted one operation while denying another.
- **Required behavior:** Confirm the intended action-level policy. If required, add child codes, enforce them at every controller/service path, update role templates and UI gates, and preserve legacy aliases during a documented deprecation window.
- **Acceptance criteria:** The approved matrix maps every action to a code; fresh and upgraded databases contain the catalog rows; old grants map predictably; explicit DENY overrides template ALLOW; endpoint and browser tests prove each allow/deny permutation; OpenAPI and current permission UI expose the same codes.
- **Dependencies:** GAP-001 migration policy and GAP-004 commander seed correction; product/security approval of the mapping.
- **Likely files:** `PermissionCode.java`, `PermissionDataInitializer.java`, `IPermissionService.java`, `AccessRecoveryGuard.java`, controllers/services for inventory/UAV/media, new V3 migration, `frontend/src/features/access/**`, `CURRENT_PERMISSION_MATRIX.md` and API docs.
- **Tests / evidence:** `Phase2PermissionRegistryTest`, `PermissionServiceTest`, `Phase1AccessIntegrationTest`, controller authorization tests, migration rehearsal, and browser access-control evidence.
- **Frontend/backend independence:** Coupled after the policy is approved; backend enforcement is mandatory.

### GAP-011 — Mission equipment reservations lack owner/reference/time-window semantics

- **Module / priority:** Inventory and mission booking — **P1**.
- **Problem:** Quantity reservation and replay protection are implemented, but mission reservations do not carry a complete owner/business reference/start/end contract, and the underlying equipment model has no temporal reservation or database overlap guarantee. The existing mission wrapper still calls a quantity-only inventory API.
- **Required behavior:** Link every reservation to a mission and actor/business reference, define effective start/end semantics, support release/reconciliation, and keep quantity mutations transactional and replay-safe. Decide whether the model needs per-unit rows for serialized equipment.
- **Acceptance criteria:** A reservation cannot be created without a valid mission/reference and time window where required; overlapping reservations obey the documented rule; cancellation/rejection/completion release the correct reservation only once; concurrent attempts cannot overbook; audit/movement rows carry the reference; API responses expose the reservation state.
- **Dependencies:** GAP-001, GAP-005, GAP-006, GAP-007, and the state contract GAP-002.
- **Likely files:** `MissionEquipmentReservation.java`, `Equipment.java`, `InventoryService`/`IMissionService`, inventory and mission repositories/specifications, V3+ migrations, mission reservation DTOs and frontend detail controls.
- **Tests / evidence:** `InventoryServiceTest`, `MissionAssignmentTest`, `MissionExecutionTest`, `MissionConcurrencyContractTest`, new PostgreSQL temporal/concurrency tests, migration rehearsal, and mission UI flow.
- **Frontend/backend independence:** Coupled; backend owns integrity and frontend must submit/display the reservation reference/window.

## P2 — material completeness and verification gaps

### GAP-012 — Station/UAV relationship guards are underspecified

- **Module / priority:** Station and UAV management — **P2**.
- **Problem:** Station deletion has no explicit dependent-UAV/equipment/mission guard and a database FK failure may surface as a generic 500. UAV station assignment does not require the station to be `ACTIVE`.
- **Required behavior:** Define deletion/reassignment policy and reject unsafe operations with stable domain conflicts. Only stations in the approved status may receive UAVs or active mission assignments.
- **Acceptance criteria:** Deleting a station with dependents returns a documented 409 (or performs an explicitly documented reassignment); deleting an unused station returns 204; inactive station assignment is rejected; dependent mission/equipment/UAV state remains unchanged on failure; audit records capture accepted mutations only.
- **Dependencies:** GAP-002 and GAP-005 state/ownership policy.
- **Likely files:** station/UAV/inventory/mission services and repositories, `StationStatus.java`, `IUavService.java`, controllers, exception mapping.
- **Tests / evidence:** `StationServiceTest`, `UavServiceTest`, controller tests, PostgreSQL FK integration test, and negative browser action trace.
- **Frontend/backend independence:** Backend behavior first; frontend needs stable 409 messages.

### GAP-013 — Dashboard media count includes soft-deleted assets

- **Module / priority:** Dashboard reporting — **P2**.
- **Problem:** `IDashboardService.summary` uses `media.count()` without a `deleted=false` predicate, so the media statistic can include soft-deleted rows.
- **Required behavior:** Count only visible, non-deleted media and preserve the existing permission-filtered semantics for every dashboard metric.
- **Acceptance criteria:** A deleted media asset is excluded from the media count; unauthorized callers still receive the documented hidden/zero value; active assets count once; a populated dashboard/API response and UI metric agree after delete/restore-like refresh.
- **Dependencies:** None for the code fix; dashboard acceptance evidence GAP-017 should use this corrected behavior.
- **Likely files:** `backend/src/main/java/com/uav/platform/modules/dashboard/service/impl/IDashboardService.java`, `MediaAssetSpecifications.java`/repository, dashboard mapper/DTO, dashboard tests.
- **Tests / evidence:** `MissionDashboardTest` or a new `DashboardServiceTest`, repository soft-delete test, authenticated dashboard HTTP/browser trace.
- **Frontend/backend independence:** Backend fix; frontend display verification is downstream.

### GAP-014 — Media upload validation lacks policy limits

- **Module / priority:** Media management — **P2**.
- **Problem:** `MediaUploadRequest` validates nonblank name/content type and positive size but has no MIME allowlist or maximum-size rule. The storage layer can receive content that the product has not approved.
- **Required behavior:** Define allowed media types/content types and a configurable maximum size; validate both registration metadata and uploaded object metadata before confirmation.
- **Acceptance criteria:** Unsupported MIME types and oversize declarations fail with stable 400/409 codes; boundary sizes are tested; confirmed object metadata must match the allowed type and declared size; configuration is documented and applies consistently to mission and library upload routes.
- **Dependencies:** GAP-009 storage target and GAP-008 HTTP matrix.
- **Likely files:** `backend/src/main/java/com/uav/platform/modules/media/config/request/MediaUploadRequest.java`, media services/controllers, `application*.properties`, `frontend/src/features/operations/components/MediaPanel.tsx`, mission media upload UI.
- **Tests / evidence:** `MediaServiceTest`, `MediaAccessServiceTest`, `S3CompatibleStorageServiceTest`, validation/controller tests, protected MinIO lifecycle test.
- **Frontend/backend independence:** Backend validation is mandatory; frontend should preflight and display limits but cannot replace server checks.

### GAP-015 — OpenAPI does not expose per-operation security requirements

- **Module / priority:** API contract/documentation — **P2**.
- **Problem:** The sanitized 64-path OpenAPI export has a bearer scheme but does not declare method-level `@PreAuthorize` permissions. Consumers cannot derive endpoint authorization from the generated contract.
- **Required behavior:** Publish operation-level authentication/permission requirements or an explicitly linked permission extension, while keeping the controller-based matrix as the source of truth during migration.
- **Acceptance criteria:** Every protected operation in the export declares authentication and required permission/scope; public auth routes remain public; the export matches controller annotations and `API_PERMISSION_MATRIX.md`; a contract test detects missing/incorrect security metadata.
- **Dependencies:** GAP-010 if action-level codes change.
- **Likely files:** `backend/src/main/java/com/uav/platform/config/OpenApiConfig.java`, controller annotations/customizer, `docs/handoff/final/openapi.json`, API matrix generation/check.
- **Tests / evidence:** `OpenApiConfigTest`, generated OpenAPI snapshot/contract test, endpoint inventory comparison.
- **Frontend/backend independence:** Backend/docs; frontend can consume the contract independently.

### GAP-016 — Audit storage is not proven append-only and cross-module coverage is incomplete

- **Module / priority:** Audit and compliance — **P2**.
- **Problem:** Audit rows are written across modules and read access is protected, but no database-level append-only enforcement is visible and complete cross-module event coverage is not verified. Mission events and audit logs may also diverge as operational histories.
- **Required behavior:** Prevent update/delete of audit records at the persistence boundary, define required events and actor/details fields for every mutation, and document the relationship between audit logs and mission timeline events.
- **Acceptance criteria:** Direct update/delete attempts fail; service/repository APIs expose append-only writes; a cross-module matrix covers auth/access, station, UAV, inventory, media, mission, dashboard/admin mutations; each event has actor/action/entity/time; retention/export behavior is documented.
- **Dependencies:** GAP-023 canonical mission timeline/audit decision and GAP-001 migration policy.
- **Likely files:** `AuditLog.java`, `AuditLogRepository.java`, `AuditLogService`/implementation, database migrations/triggers, `AuditAction.java`, mission event service, audit UI.
- **Tests / evidence:** `AuditLogSpecificationsTest`, new append-only persistence test, cross-module integration audit test, migration/trigger verification.
- **Frontend/backend independence:** Backend/compliance; frontend audit rendering is independent after the API contract is stable.

### GAP-017 — Dashboard and audit runtime semantics lack populated authenticated evidence

- **Module / priority:** Dashboard/reporting and UI acceptance — **P2**.
- **Problem:** Dashboard counts are repository-backed and permission-filtered in source/tests, but fresh populated authenticated HTTP/browser evidence is incomplete. Global versus filtered count semantics and loading/error/empty/multi-row states are not externally demonstrated.
- **Required behavior:** Define which counts are global versus scoped by the caller and show the same rules in API and UI. Exercise populated, zero, permission-filtered, error, responsive, and post-mutation states.
- **Acceptance criteria:** A sanitized fixture produces documented counts for admin, commander, operator, and restricted users; soft-deleted media follows GAP-013; dashboard and audit routes render all required states without duplicate requests or console errors; screenshots/logs are stored with reproducible setup.
- **Dependencies:** GAP-008, GAP-013, GAP-016.
- **Likely files:** `backend/src/main/java/com/uav/platform/modules/dashboard/service/impl/IDashboardService.java`, dashboard controller/DTO, `frontend/src/app/page.tsx`, `frontend/src/features/dashboard/services/dashboard.service.ts`, `frontend/src/features/operations/components/AuditPanel.tsx`, browser evidence.
- **Tests / evidence:** `MissionDashboardTest`, dashboard controller tests, authenticated browser/HTTP fixture run, responsive screenshots, network/console audit.
- **Frontend/backend independence:** Coupled for semantic sign-off; UI evidence can proceed with fixture APIs.

### GAP-018 — TanStack Query migration is incomplete

- **Module / priority:** Frontend state and session isolation — **P2**.
- **Problem:** Operations/access hooks have user-scoped query keys and targeted invalidation, but mission list/detail/create reads and dashboard reads still use direct `useEffect`/local state in places. Cache, invalidation, loading/error handling, and account-switch behavior are not uniform.
- **Required behavior:** Move remaining server reads to feature query hooks with account-scoped keys, mutation invalidation, cancellation, and consistent loading/error/empty/permission states. Preserve the current refresh/logout/session-generation safeguards.
- **Acceptance criteria:** Mission and dashboard reads use query keys scoped to the active account; mutations invalidate only affected resources; logout/account switch cannot show prior-user data; stale responses are ignored/cancelled; no duplicate request loops occur; frontend tests cover refresh/logout/forbidden retry and account switch across migrated routes.
- **Dependencies:** GAP-008 acceptance matrix and stable backend contracts (GAP-005, GAP-011).
- **Likely files:** `frontend/src/app/page.tsx`, `frontend/src/app/missions/**`, `frontend/src/features/missions/hooks/useMissions.ts`, `frontend/src/features/dashboard/**`, `frontend/src/lib/query-keys.ts`, `frontend/src/providers/QueryProvider.tsx`, `frontend/src/contexts/AuthContext.tsx`.
- **Tests / evidence:** `frontend/tests/api-session.test.mjs`, new query/mutation tests, `evidence/todo-useeffect-scan.txt` refresh, browser account-switch and route traces.
- **Frontend/backend independence:** Frontend only after API contracts are frozen.

### GAP-019 — User administration lifecycle has no standalone UI

- **Module / priority:** User/access frontend — **P2**.
- **Problem:** User list/detail/lock/unlock/role endpoints exist and the access-control page embeds a user selector, but there is no standalone `/users` route and broader user lifecycle UI is not verified.
- **Required behavior:** Provide an authorized, discoverable surface for user list/detail, lock/unlock, role changes, validation/conflict states, and current effective permissions; or formally document `/access-control` as the canonical user-admin surface and verify all lifecycle actions there.
- **Acceptance criteria:** `USER_READ` users can list/detail without mutation controls; `USER_MANAGE` users can perform allowed lock/unlock/role actions; last-manager protection and 403/409 errors are visible; refresh preserves state; desktop/mobile and empty/error states are exercised.
- **Dependencies:** GAP-004 and GAP-010 permission contract.
- **Likely files:** `frontend/src/app/access-control/page.tsx`, `frontend/src/features/access/**`, new `frontend/src/app/users/page.tsx` if selected, backend user controller DTOs.
- **Tests / evidence:** `UserControllerTest`, `UserServiceTest`, access-control browser harness, user lifecycle HTTP/browser traces.
- **Frontend/backend independence:** Frontend surface can be built against existing endpoints; final behavior is coupled to backend authorization.

### GAP-020 — Route-wide browser and UI-state evidence is incomplete

- **Module / priority:** Frontend acceptance — **P2**.
- **Problem:** Selected operations/station/access-denied/UAV-viewer traces pass, but dashboard, registration, invalid login, inventory actions, media actions, audit, mission routes, all role combinations, and many loading/empty/error/validation/responsive states were not exercised. A complete duplicate-request/network audit was not performed.
- **Required behavior:** Verify every supported route and key state through authenticated browser flows using sanitized data, including keyboard/mobile behavior and stable error recovery.
- **Acceptance criteria:** Login/register/invalid-login, dashboard, access control, station, UAV/history, inventory, media, audit, mission/customer/operator/admin routes each have pass/fail evidence; table zero/many/no-results, validation, permission-denied, network-error, responsive and mutation-refresh states are captured; no unexpected console errors or duplicate request loops remain.
- **Dependencies:** GAP-008, GAP-017, GAP-018, GAP-019 and GAP-024 scope decision.
- **Likely files:** All `frontend/src/app/**` route files, feature components/hooks/services, browser harness, `docs/handoff/final/evidence/`.
- **Tests / evidence:** Playwright/browser suite, `npm test`, typecheck/lint/build, sanitized screenshots/logs and network audit.
- **Frontend/backend independence:** Primarily frontend evidence; authenticated API fixtures/backend test environment are required for realistic flows.

### GAP-021 — UAV duplicate-serial and full status HTTP coverage is missing

- **Module / priority:** UAV fleet verification — **P2**.
- **Problem:** Serial uniqueness and status-history code exist, but duplicate-serial HTTP behavior and the complete status transition matrix are not evidenced. This is an acceptance gap even where service tests pass.
- **Required behavior:** Enforce unique serials under concurrent requests, map conflicts to the documented 409 code, and define valid/invalid transitions for available, assigned, in-use, maintenance, and inactive states.
- **Acceptance criteria:** Duplicate create/update requests produce one resource and stable 409 responses for losers; every allowed transition persists history/audit; disallowed transitions leave state unchanged and return a stable conflict; station/mission release transitions are included.
- **Dependencies:** GAP-002 state contract.
- **Likely files:** `IUavService.java`, `Uav.java`, `UavController.java`, UAV repository/history, error mapping, `UavPanel.tsx`.
- **Tests / evidence:** `UavServiceTest`, new `UavControllerTest` cases, PostgreSQL uniqueness/concurrency test, full status transition matrix.
- **Frontend/backend independence:** Backend verification; frontend displays the resulting status/errors.

### GAP-022 — Zalo OAuth is mocked/unit-tested but not live-verified

- **Module / priority:** Authentication integration — **P2**.
- **Problem:** Zalo URL/callback behavior is mocked/unit-tested; no live provider or sanitized provider-contract test was run. Provider/configuration failures could differ from the local mock path.
- **Required behavior:** Verify the configured OAuth contract in a disposable or provider-sandbox environment, including callback validation, error handling, inactive-account handling, and secret-safe logging. Keep a deterministic mock test for CI.
- **Acceptance criteria:** Provider success creates/links the intended account; invalid/expired callback and provider failure return documented errors; no token/secret appears in logs/evidence; configuration absence uses the documented fallback behavior.
- **Dependencies:** External provider credentials/sandbox policy and GAP-008 auth HTTP matrix.
- **Likely files:** `ZaloOAuthService.java`, auth controller/configuration, `frontend/src/features/auth/components/ZaloLoginButton.tsx`, environment docs.
- **Tests / evidence:** `IZaloOAuthServiceTest`, sanitized provider sandbox test, callback HTTP/browser trace.
- **Frontend/backend independence:** Coupled at the login flow; backend provider contract can be tested independently.

### GAP-023 — Mission timeline and audit are not reconciled as a canonical history

- **Module / priority:** Mission operations history — **P2**.
- **Problem:** Mission events/timeline and cross-module audit rows both exist, but the canonical relationship, correlation, and rollback behavior is not defined. A status change can be visible in one history and absent or differently described in the other.
- **Required behavior:** Decide whether mission events are the operational timeline and audit is the compliance trail, define correlation IDs and required fields, and make transactional writes/rollback behavior explicit.
- **Acceptance criteria:** Every mission assignment/status/media/resource event has a timeline entry and corresponding audit policy; actor/time/old/new state agree; failed transactions leave no orphan event; UI labels distinguish operational timeline from compliance audit; retention/read permissions are documented.
- **Dependencies:** GAP-003, GAP-007, and GAP-016.
- **Likely files:** `MissionEvent.java`, mission service/event mapper/repository, `AuditLog.java`/service, migration, mission detail and audit panels.
- **Tests / evidence:** `MissionMediaTimelineTest`, `MissionExecutionTest`, new cross-history integration tests and browser evidence.
- **Frontend/backend independence:** Backend contract first; frontend presentation follows.

### GAP-024 — UAV 3D viewer is a CSS reference, not a digital-twin/model asset

- **Module / priority:** UAV operations UI — **P2** (or P3 if reference scope is accepted).
- **Problem:** `UavModelViewer.tsx` is an on-demand CSS illustration. It is not a GLB/WebGL asset or manufacturer digital twin, and there is no model-file budget, license record, WebGL-unavailable fallback, or load-failure path.
- **Required behavior:** Make an explicit product decision: either accept and document the reference-illustration scope, or provide a licensed, measured model asset with loading/error/accessibility fallbacks.
- **Acceptance criteria:** If reference scope is accepted, requirements and UI copy say so and the current lazy viewer trace remains green. If a model is required, asset license/size is recorded, WebGL/model load failure has a usable fallback, keyboard/pointer controls remain accessible, and browser tests cover open/close/rotate/zoom/error.
- **Dependencies:** Product/design decision; GAP-020 browser evidence.
- **Likely files:** `frontend/src/components/visuals/UavModelViewer.tsx`, `frontend/src/features/operations/components/UavPanel.tsx`, public model assets or WebGL loader, UI design/docs.
- **Tests / evidence:** `browser-viewer-2026-10-07.md`, browser fallback tests, asset/license/size record if model work is approved.
- **Frontend/backend independence:** Frontend only; no backend endpoint is required for the current reference viewer.

## P3 — missing or explicitly deferred product scope

### GAP-025 — Search & Rescue module is not implemented

- **Module / priority:** Search & Rescue — **P3**.
- **Problem:** No rescue entity, controller, service, persistence model, permission set, or frontend route exists.
- **Required behavior:** Define and implement rescue mission creation, search area/operational state, assignments, human confirmation, evidence/media, audit, and completion semantics.
- **Acceptance criteria:** Approved product/API/data/permission contract exists; migrations, service/controller, UI route, authorization, audit, and authenticated happy/error/concurrency tests pass; module appears in OpenAPI and requirement traceability.
- **Dependencies:** Product scope, mission ownership/time-window foundations (GAP-005/GAP-006), migration policy GAP-001, media contract GAP-014 if evidence is attached.
- **Likely files:** New `backend/src/main/java/com/uav/platform/modules/rescue/**`, new migration, `frontend/src/app/rescue/**`, feature services/types/components, permission initializer, OpenAPI/docs.
- **Tests / evidence:** New backend unit/integration/controller tests, PostgreSQL migration test, frontend tests/build, authenticated browser flow.
- **Frontend/backend independence:** Coupled new module.

### GAP-026 — AI/KV260 detection and processing is not implemented

- **Module / priority:** AI detection and processing — **P3**.
- **Problem:** No AI job, YOLO/KV260 worker, model/output entity, authorization, queue, or route exists.
- **Required behavior:** Define ingestion, job state/retry, model/version, result authorization, storage, and operator review workflow for the supported deployment target.
- **Acceptance criteria:** Approved API/data/worker contract; authenticated submission/status/result flow; retry/failure and idempotency behavior; model/output access controls; audit and media linkage; deployment health and resource limits documented.
- **Dependencies:** Product/model and infrastructure decision, media contract GAP-014, migration policy GAP-001, notification decision GAP-028 if async alerts are required.
- **Likely files:** New backend `modules/ai/**` and worker/integration config, migrations, frontend route/feature, object storage integration, permissions/OpenAPI.
- **Tests / evidence:** Worker contract tests, API/controller integration, PostgreSQL/storage test, frontend/browser flow, failure/retry evidence.
- **Frontend/backend independence:** Coupled new module with infrastructure dependency.

### GAP-027 — Payment and entitlement is not implemented

- **Module / priority:** Payment, package, entitlement, quota — **P3**.
- **Problem:** No package/order/payment provider/webhook, entitlement, quota, reconciliation, or frontend billing surface exists.
- **Required behavior:** Define provider integration, idempotent webhook handling, order/entitlement states, quota enforcement, refund/chargeback policy, and audit/security requirements.
- **Acceptance criteria:** Provider sandbox flow creates and reconciles orders; duplicate/out-of-order webhooks are safe; entitlement and quota are enforced in the intended mission/API paths; unauthorized access is rejected; audit and failure recovery are proven without real charges.
- **Dependencies:** Product/pricing/provider decision, mission ownership (GAP-005), notification policy GAP-028, migration policy GAP-001.
- **Likely files:** New backend `modules/payment/**`/`modules/entitlement/**`, migrations, provider config, mission/quota enforcement, frontend billing/package routes, OpenAPI/permissions.
- **Tests / evidence:** Provider sandbox contract tests, webhook idempotency/replay tests, entitlement integration tests, frontend/browser flow, sanitized evidence.
- **Frontend/backend independence:** Coupled new module.

### GAP-028 — User Notifications are not implemented

- **Module / priority:** Notifications — **P3**.
- **Problem:** No notification entity, delivery service, controller, unread/read state, deduplication, navigation target, or frontend notification surface exists.
- **Required behavior:** Define event sources, in-app/read/unread semantics, delivery/retry, deduplication key, retention, permissions, and navigation links for mission/access/payment events as applicable.
- **Acceptance criteria:** A supported event produces one deduplicated notification; read/unread and list pagination work; retries do not duplicate; unauthorized users cannot read another user's notifications; UI handles empty/error/unread states; audit/retention are documented.
- **Dependencies:** Mission timeline/audit GAP-023, payment GAP-027 if payment alerts are in scope, product channel decision.
- **Likely files:** New backend `modules/notification/**` and migration, event publishers in mission/access/payment, frontend notification component/route, permission/OpenAPI docs.
- **Tests / evidence:** Backend event/deduplication/controller tests, migration test, frontend tests, authenticated browser flow.
- **Frontend/backend independence:** Coupled new module.

### GAP-029 — E-learning, assessment, and certificates are explicitly deferred

- **Module / priority:** E-learning/assessment/certificates — **P3**.
- **Problem:** The current audit brief and Phase 1/2 specifications defer this scope; no implementation evidence exists.
- **Required behavior:** Keep these modules out of the current release while preserving a recorded scope decision and dependency boundary. When activated, define course/enrollment/assessment/certificate ownership, permissions, data retention, and integrations before coding.
- **Acceptance criteria:** Product scope explicitly marks the module deferred for the release; no requirement matrix entry claims implementation; future activation has an approved specification, migration plan, permission model, and acceptance tests before work starts.
- **Dependencies:** Product roadmap and any notification/payment identity decisions.
- **Likely files:** `docs/superpowers/specs/`, `docs/handoff/final/REQUIREMENT_IMPLEMENTATION_MATRIX.md`, future backend/frontend module directories.
- **Tests / evidence:** Scope review record; no production implementation test is required while deferred.
- **Frontend/backend independence:** Deferred; no current frontend or backend work.

## P4 — handoff and release hygiene

### GAP-030 — Final handoff evidence is working-tree-only until committed

- **Module / priority:** Release documentation and reproducibility — **P4**.
- **Problem:** Final reports, screenshots, logs, and exports under `docs/handoff/` are uncommitted audit output. The published product commit alone cannot reproduce the complete handoff package.
- **Required behavior:** Review the evidence package, remove accidental/environment-sensitive artifacts, and commit the approved final reports/evidence separately from production-code changes when release governance allows.
- **Acceptance criteria:** `git status` is clean after the documentation commit; the document register links every retained artifact; evidence contains no secrets, tokens, signed URLs, or personal data; each report identifies its source HEAD and inspection time; a fresh checkout can read the complete package.
- **Dependencies:** All preceding gap decisions that change report status; repository/release governance.
- **Likely files:** `docs/handoff/final/*.md`, `docs/handoff/final/openapi.json`, approved `docs/handoff/final/evidence/**`, `DOCUMENT_REGISTER.md`, gitignore/release notes.
- **Tests / evidence:** Git status/diff audit, evidence redaction review, document-link check.
- **Frontend/backend independence:** Documentation only; no production code dependency.
