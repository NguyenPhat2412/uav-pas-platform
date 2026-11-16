# Backend structure and naming

The backend remains one Spring Boot application. Packages group code by business feature; this refactor does not change HTTP routes, request/response JSON fields, database tables, or published Flyway migrations.

## Feature layout

```text
com.uav.platform
├── config                  Spring, security, routes (ApiRoutes), WebSocket & infrastructure configuration
├── error                   Shared exception handling & validation error mapping
├── common                  Shared base entities, pagination, constants & utilities
├── controller/<feature>[/<sub-domain>]        HTTP endpoints (paths strictly from ApiRoutes)
├── dto/request/<feature>[/<sub-domain>]       Validated API inputs (*Request records)
├── dto/response/<feature>[/<sub-domain>]      API outputs (*Response records)
├── dto/record/<feature>[/<sub-domain>]        Internal working data, filters & commands
├── entity/<feature>                           Persistent JPA domain state
├── enums/<feature>                            Domain enums
├── mapper/<feature>[/<sub-domain>]            Entity-to-DTO conversion
├── repository/<feature>                       Spring Data JPA + JpaSpecificationExecutor
├── specification/<feature>[/<sub-domain>]     Reusable query predicates
└── service
    ├── <feature>[/<sub-domain>]               Service contracts & stateless domain policies
    └── impl/<feature>[/<sub-domain>]          *ServiceImpl & *Operations implementations
```

Large domain modules (`mission`, `billing`, `marketplace`, `auth`, `user`, `storage`, `training`) organize `controller`, `service`, `service/impl`, `dto/{request,response,record}`, `mapper`, and `specification` into explicit `<feature>/<sub-domain>` sub-packages (enforced by `ArchitecturePackageTest`).

Create only the layers a feature needs. A small internal service does not need an otherwise unused interface. When a contract exists, use `StationService` for the interface and `StationServiceImpl` for the implementation. Provider implementations may have descriptive names such as `S3CompatibleStorageService`.

The layout is a vocabulary, not a requirement to create empty folders. Every feature currently has response DTOs. A JSON body or compound query belongs in `dto/request`; internal snapshots/filters/commands belong in `dto/record`. A feature with only read endpoints, path variables or a scalar query parameter does not need a placeholder request DTO. See [the complete module matrix](BACKEND_MODULE_MATRIX.md) for intentional omissions and current file counts.

Keep DTOs with the feature that owns the operation. For example, changing an account's role is owned by `user`, so `RoleUpdateRequest` lives in `user/dto/request`; `role` owns role-template permissions. Internal records must not end in `Request` or `Response`: the profile service uses `UserProfileUpdateCommand` after validating the public `UserProfilePatchRequest`.

Compound list queries use request records (`UserQueryRequest`, `MaintenanceScheduleQueryRequest`, `RepairOrderQueryRequest`) at the service boundary. Controllers keep their explicit HTTP parameter binding/defaults; pagination, sorting allowlists, validation and authorization retain their existing behavior. Request records do not perform repository access or business transitions.

`config` holds configuration, not API DTOs. Public maintenance request/response DTOs each have a descriptive file name; their conversions are in `MaintenanceMapper`.

## Identity ownership

- `auth`: sign-in, sign-out, registration, refresh/invalidation and session locking.
- `user`: account state, profile data, account queries and the account role/status enums.
- `permission`: permission registry, user grants, effective permission checks and permission seed configuration.
- `role`: role templates and their permission assignments.

Security filters use these contracts. The explicit bean name `permissionService` is retained because endpoint authorization expressions refer to it. Moving packages must not change session cookies, JWT handling, CSRF, role codes or permission semantics.

## Service offerings

`mission.entity.ServiceOffering` is a catalog item offered to customers. `uav.service.UavService` operates aircraft. Their names now distinguish the domain entity from the application service.

The catalog entity retains the JPA entity alias `UavService` and table `uav_services`. Its API DTOs retain their documented OpenAPI schema names. Routes, JSON field names and identifiers such as `serviceId` are unchanged.

## Mission responsibilities

`MissionServiceImpl` is the stable facade used by controllers. It delegates to:

| Service | Responsibility |
|---|---|
| `MissionLifecycleService` | Creation, draft edits, acceptance and lifecycle transitions |
| `MissionDispatchService` | Resource assignment and redispatch with version checks |
| `MissionQueryService` | Visibility-filtered queries, timeline and availability |
| `MissionMediaService` | Attachments and mission media queries |
| `MissionAccessService` | Ownership checks and mission locking |
| `MissionResourceService` | Shared resource locks, preflight validation and release |
| `MissionEventService` | Timeline events and existing best-effort notifications |
| `MissionBillingService` | Usage accounting and durable invoice enqueueing |

The facade retains the original transaction annotations; workflow services join the same transaction. Read-only methods remain read-only. Lock acquisition order, refresh operations, expected-version checks, terminal-media restrictions and the durable invoice/outbox flow must be preserved when changing these services.

Production services use constructor injection. The former partial constructors used for unit tests have moved into test-only `MissionServiceFixture`; production bootstrapping has one constructor per mission service.

`FinancialOutboxService` depends on the `WebhookEventQueue` contract. It does not import the webhook implementation. Queue insertion still joins the caller's transaction.

## Regression checks

`ArchitecturePackageTest` guards package/path consistency, DTO and enum placement, implementation names, separation of mappers, and dependencies on service contracts.

Run backend verification with `./mvnw verify` from `backend`. PostgreSQL/MinIO tests require the dedicated test environment; a run with skipped integration tests is not the full regression gate. Use the project CI harness for those checks and keep test databases separate from development/runtime data.

Published files in `src/main/resources/db/migration` must remain unchanged during structural refactors. Test builds must use an isolated output directory while another chat owns a running backend.
