# Phase 2 Mission Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or subagent-driven-development) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Phase 2 UAV mission booking and execution workflow described in `docs/superpowers/specs/2026-10-06-phase2-mission-booking-design.md`.

**Architecture:** Add a focused `mission` backend module that owns the mission state machine and orchestrates existing station, UAV, inventory, media, auth, and audit modules. Use explicit mission equipment reservation rows because Phase 1 inventory movements do not retain a mission reference, while delegating quantity mutation to `InventoryService`. Add a thin role-aware frontend surface over the existing API client after the backend contract is stable.

**Tech Stack:** Spring Boot 4.1, Spring Data JPA, Spring Security, H2/PostgreSQL, JUnit/MockMvc, Next.js 16, React 19, TypeScript, Tailwind, existing UI primitives.

**Spec:** `docs/superpowers/specs/2026-10-06-phase2-mission-booking-design.md`

## Global Constraints

- Keep routes under `/api/v1` and preserve existing Phase 1 API behavior.
- Enforce the explicit mission state machine; no arbitrary status jumps.
- Use half-open time windows `[start, end)` for UAV/operator overlap checks.
- Only active stations, available UAVs, active operators, and available inventory may be assigned/reserved.
- Every important mission action creates a mission event and an audit log in the same transaction.
- Customers can read/update only their own missions; `MISSION_VIEW_ALL` bypasses ownership.
- Do not add payment, AI, search-and-rescue, subscription, or unrelated dependencies.

## Review Focus

- Two concurrent assignments of the same UAV must not both succeed: integration test with a pessimistic lock/version check.
- A mission ending exactly when another begins must not be treated as overlap: repository/service test for half-open windows.
- Cancellation/failure from each reserving state must release equipment and restore UAV state: lifecycle tests.
- A customer must not read or mutate another customer's mission even if the mission id is known: secured controller tests.
- A mission cannot become `READY` with one missing resource: command test covering each prerequisite.

### Task 1: Permission and route contract

**Files:**
- Modify: `backend/src/main/java/com/uav_pass/local/auth/entity/PermissionCode.java`
- Modify: `backend/src/main/java/com/uav_pass/local/auth/config/PermissionDataInitializer.java`
- Modify: `backend/src/main/java/com/uav_pass/local/config/routes/ApiRoutes.java`
- Test: `backend/src/test/java/com/uav_pass/local/auth/service/Phase2PermissionRegistryTest.java`

**Interfaces:**
- Produces the permission enum values and `ApiRoutes.Missions` constants consumed by all later tasks.

- [ ] **Step 1: Write failing registry tests** asserting every Phase 2 permission and mission route constant exists.
- [ ] **Step 2: Run `./mvnw -q -Dtest=Phase2PermissionRegistryTest test` and verify the missing-symbol failure.**
- [ ] **Step 3: Add the exact permission enum members and route constants; extend default role templates so admins receive all mission permissions, operators receive execution/media permissions, and customers receive create/view/media permissions.**
- [ ] **Step 4: Run the focused test and the existing permission integration suite; verify both pass.**
- [ ] **Step 5: Commit `feat: register phase 2 mission permissions and routes`.**

### Task 2: Mission and service domain model

**Files:**
- Create: `backend/src/main/java/com/uav_pass/local/mission/entity/Mission.java`
- Create: `backend/src/main/java/com/uav_pass/local/mission/entity/MissionStatus.java`
- Create: `backend/src/main/java/com/uav_pass/local/mission/entity/MissionType.java`
- Create: `backend/src/main/java/com/uav_pass/local/mission/entity/MissionPriority.java`
- Create: `backend/src/main/java/com/uav_pass/local/mission/entity/UavService.java`
- Create: `backend/src/main/java/com/uav_pass/local/mission/repository/MissionRepository.java`
- Create: `backend/src/main/java/com/uav_pass/local/mission/repository/UavServiceRepository.java`
- Create: `backend/src/main/java/com/uav_pass/local/mission/repository/MissionEventRepository.java`
- Test: `backend/src/test/java/com/uav_pass/local/mission/entity/MissionStateTest.java`

**Interfaces:**
- `Mission.transitionTo(MissionStatus target)` rejects invalid transitions with `MISSION_INVALID_STATUS`.
- `Mission.hasRequiredResources()` returns true only when station, UAV, active operator, and all reservation rows exist.
- `MissionRepository` exposes ownership and overlap queries for mission windows.

- [ ] **Step 1: Write failing entity tests for valid forward transitions, terminal transitions, arbitrary jump rejection, and `READY` prerequisites.**
- [ ] **Step 2: Run the focused tests and verify they fail because the entities do not exist.**
- [ ] **Step 3: Implement entities with `BaseEntity`, enum fields, relationships to existing `AppUser`, `Station`, `Uav`, and service entities, immutable mission code generation hook, and transition validation.**
- [ ] **Step 4: Run focused tests and verify they pass.**
- [ ] **Step 5: Commit `feat: add mission domain model and state machine`.**

### Task 3: Mission CRUD, list filters, and visibility

**Files:**
- Create: `backend/src/main/java/com/uav_pass/local/mission/dto/MissionCreateRequest.java`
- Create: `backend/src/main/java/com/uav_pass/local/mission/dto/MissionUpdateRequest.java`
- Create: `backend/src/main/java/com/uav_pass/local/mission/dto/MissionResponse.java`
- Create: `backend/src/main/java/com/uav_pass/local/mission/dto/MissionFilter.java`
- Create: `backend/src/main/java/com/uav_pass/local/mission/service/MissionService.java`
- Create: `backend/src/main/java/com/uav_pass/local/mission/service/impl/MissionServiceImpl.java`
- Create: `backend/src/main/java/com/uav_pass/local/mission/controller/MissionController.java`
- Test: `backend/src/test/java/com/uav_pass/local/mission/service/MissionServiceTest.java`
- Test: `backend/src/test/java/com/uav_pass/local/mission/controller/MissionControllerTest.java`

**Interfaces:**
- `MissionService.create(request, actor)` creates `DRAFT` with a unique `MSN-YYYY-######` code and a created event.
- `MissionService.updateDraft(id, request, actor)` only updates draft missions.
- `MissionService.list(filter, pageable, actor)` applies ownership unless caller has `MISSION_VIEW_ALL`.
- Controller exposes `GET /missions`, `GET /missions/{id}`, `POST /missions`, and `PATCH /missions/{id}`.

- [ ] **Step 1: Write failing service/controller tests for create, draft update, own-vs-all list visibility, validation, and unique code format.**
- [ ] **Step 2: Run focused tests and verify expected missing-behavior failures.**
- [ ] **Step 3: Implement DTO validation, repository queries, service ownership checks, code generation, and controller permission annotations.**
- [ ] **Step 4: Run focused tests and verify pass.**
- [ ] **Step 5: Commit `feat: add mission CRUD and ownership rules`.**

### Task 4: Events, audit, submit/cancel, and assignment transactions

**Files:**
- Create: `backend/src/main/java/com/uav_pass/local/mission/entity/MissionEvent.java`
- Create: `backend/src/main/java/com/uav_pass/local/mission/entity/MissionEquipmentReservation.java`
- Create: `backend/src/main/java/com/uav_pass/local/mission/repository/MissionEquipmentReservationRepository.java`
- Create: `backend/src/main/java/com/uav_pass/local/mission/dto/ResourceAssignmentRequest.java`
- Modify: `backend/src/main/java/com/uav_pass/local/mission/service/MissionService.java`
- Modify: `backend/src/main/java/com/uav_pass/local/mission/service/impl/MissionServiceImpl.java`
- Modify: `backend/src/main/java/com/uav_pass/local/mission/controller/MissionController.java`
- Test: `backend/src/test/java/com/uav_pass/local/mission/service/MissionAssignmentTest.java`

**Interfaces:**
- `submit`, `cancel`, `assignStation`, `assignUav`, `assignOperator`, and `reserveEquipment` are transactional commands.
- `MissionEventResponse` and `MissionEventRepository.findByMissionIdOrderByCreatedAtAsc` are consumed by timeline endpoints.
- `MissionEquipmentReservation` stores mission, equipment, quantity, and released flag.

- [ ] **Step 1: Write failing tests for submit/cancel, active station validation, unavailable/maintenance UAV rejection, UAV overlap, operator overlap, inventory shortage, and event/audit creation.**
- [ ] **Step 2: Run focused tests and verify failures occur for missing commands.**
- [ ] **Step 3: Implement repository overlap queries, pessimistic lock/version protection, reservation rows, event helper, audit helper, and assignment commands.**
- [ ] **Step 4: Run focused tests and verify every invalid case maps to the specified error code.**
- [ ] **Step 5: Commit `feat: add transactional mission resource assignment`.**

### Task 5: Confirm, ready, start, complete, and fail lifecycle

**Files:**
- Create: `backend/src/main/java/com/uav_pass/local/mission/dto/MissionCompletionRequest.java`
- Create: `backend/src/main/java/com/uav_pass/local/mission/dto/MissionFailureRequest.java`
- Modify: `backend/src/main/java/com/uav_pass/local/mission/service/impl/MissionServiceImpl.java`
- Modify: `backend/src/main/java/com/uav_pass/local/mission/controller/MissionController.java`
- Modify: `backend/src/main/java/com/uav_pass/local/uav/entity/UavStatus.java`
- Modify: `backend/src/main/java/com/uav_pass/local/uav/entity/Uav.java`
- Test: `backend/src/test/java/com/uav_pass/local/mission/service/MissionExecutionTest.java`

**Interfaces:**
- Commands map to `POST /missions/{id}/confirm`, `/ready`, `/start`, `/complete`, and `/fail`.
- `complete` accepts completion note and equipment condition; `fail` requires a failure reason.

- [ ] **Step 1: Write failing tests for missing-resource READY rejection, valid READY/START, wrong operator rejection, complete/fail terminal state, UAV in-use/available transitions, and reservation release.**
- [ ] **Step 2: Run focused tests and verify expected failures.**
- [ ] **Step 3: Implement lifecycle commands transactionally and release all equipment/UAV resources on cancel, complete, and fail.**
- [ ] **Step 4: Run focused tests plus all backend tests.**
- [ ] **Step 5: Commit `feat: implement mission execution lifecycle`.**

### Task 6: Media and timeline APIs

**Files:**
- Create: `backend/src/main/java/com/uav_pass/local/mission/entity/MissionMedia.java`
- Create: `backend/src/main/java/com/uav_pass/local/mission/repository/MissionMediaRepository.java`
- Create: `backend/src/main/java/com/uav_pass/local/mission/dto/MissionMediaRequest.java`
- Create: `backend/src/main/java/com/uav_pass/local/mission/dto/MissionEventResponse.java`
- Modify: `backend/src/main/java/com/uav_pass/local/mission/controller/MissionController.java`
- Modify: `backend/src/main/java/com/uav_pass/local/mission/service/impl/MissionServiceImpl.java`
- Test: `backend/src/test/java/com/uav_pass/local/mission/controller/MissionMediaTimelineTest.java`

**Interfaces:**
- `GET/POST /missions/{id}/media` links an existing Phase 1 media asset with a role and uploader.
- `GET /missions/{id}/timeline` returns ordered mission events.

- [ ] **Step 1: Write failing secured API tests for media view/upload permission, ownership, role validation, and ordered timeline output.**
- [ ] **Step 2: Run focused tests and verify failures.**
- [ ] **Step 3: Implement link/list/timeline services while delegating object storage upload URL generation to `MediaService`.**
- [ ] **Step 4: Run focused tests and verify pass.**
- [ ] **Step 5: Commit `feat: add mission media and timeline APIs`.**

### Task 7: Dashboard mission statistics

**Files:**
- Modify: `backend/src/main/java/com/uav_pass/local/dashboard/dto/DashboardResponse.java`
- Modify: `backend/src/main/java/com/uav_pass/local/dashboard/service/impl/DashboardServiceImpl.java`
- Modify: `backend/src/main/java/com/uav_pass/local/dashboard/controller/DashboardController.java`
- Test: `backend/src/test/java/com/uav_pass/local/dashboard/MissionDashboardTest.java`

**Interfaces:**
- `GET /api/v1/dashboard/missions` returns total, pending, confirmed, ready, in-progress, completed, and failed counts, filtered by customer unless caller has all-mission access.

- [ ] **Step 1: Write failing dashboard tests with missions in each status and ownership boundaries.**
- [ ] **Step 2: Run focused tests and verify missing fields/endpoint failure.**
- [ ] **Step 3: Implement grouped count query and secured response.**
- [ ] **Step 4: Run dashboard and full backend tests.**
- [ ] **Step 5: Commit `feat: add mission dashboard statistics`.**

### Task 8: Frontend mission surfaces

**Files:**
- Create: `frontend/src/features/missions/types/mission.types.ts`
- Create: `frontend/src/features/missions/services/mission.service.ts`
- Create: `frontend/src/features/missions/hooks/useMissions.ts`
- Create: `frontend/src/features/missions/components/MissionStatusBadge.tsx`
- Create: `frontend/src/features/missions/components/MissionList.tsx`
- Create: `frontend/src/features/missions/components/MissionDetail.tsx`
- Create: `frontend/src/app/missions/page.tsx`
- Create: `frontend/src/app/missions/create/page.tsx`
- Create: `frontend/src/app/missions/[id]/page.tsx`
- Create: `frontend/src/app/operator/missions/page.tsx`
- Create: `frontend/src/app/admin/missions/page.tsx`
- Modify: `frontend/src/messages/vi.json`
- Modify: `frontend/src/messages/en.json`
- Test/verify: `frontend` build and lint commands.

**Interfaces:**
- Services call the backend routes from Tasks 3–6 through `api.client.ts` and preserve the existing auth token behavior.
- Detail actions are rendered from mission status and role/permission data; assignment actions use compact dialogs/drawers.

- [ ] **Step 1: Add typed service/query functions and render a failing TypeScript usage for list/detail/create contracts.**
- [ ] **Step 2: Run `npm run lint` and `npm run build` to establish the expected failures.**
- [ ] **Step 3: Implement list/create/detail/operator/admin pages using existing `Card`, `Button`, `Input`, `Badge`, `Alert`, and `Spinner` components.**
- [ ] **Step 4: Add Vietnamese/English copy and run lint/build until both pass.**
- [ ] **Step 5: Run a local backend/frontend smoke flow for create → submit → assign → ready → start → complete and capture any UI/API mismatch.**
- [ ] **Step 6: Commit `feat: add phase 2 mission frontend surfaces`.**

### Task 9: End-to-end verification and documentation

**Files:**
- Create: `backend/src/test/java/com/uav_pass/local/mission/MissionPhase2IntegrationTest.java`
- Modify: `docs/README.md` or the existing project docs index if present.

- [ ] **Step 1: Write the complete authenticated demo scenario as an integration test.**
- [ ] **Step 2: Run it and verify any contract gaps fail clearly.**
- [ ] **Step 3: Fix only implementation defects exposed by the scenario.**
- [ ] **Step 4: Run `./mvnw test`, `npm run lint`, and `npm run build`; record results.**
- [ ] **Step 5: Commit `test: verify phase 2 mission demo flow`.**
