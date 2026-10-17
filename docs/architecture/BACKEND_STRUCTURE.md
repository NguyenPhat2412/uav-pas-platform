# Backend structure and naming

The backend remains one Spring Boot application. Packages group code by business feature; this refactor does not change HTTP routes, request/response JSON fields, database tables, or published Flyway migrations.

## Feature layout

```text
com.uav.platform
├── config                  Spring and infrastructure configuration
├── security                Authentication filters, JWT and security integration
├── error                   Shared exception handling
├── common                  Shared base entities and pagination
└── modules
    └── <feature>
        ├── controller      HTTP endpoints
        ├── dto/request     Validated API inputs
        ├── dto/response    API outputs
        ├── entity          Persistent domain state
        ├── enums           Domain enums
        ├── mapper          Entity-to-DTO conversion
        ├── repository      Database access
        ├── specification   Reusable query predicates
        └── service
            └── impl        Implementations of service contracts
```

Create only the layers a feature needs. A small internal service does not need an otherwise unused interface. When a contract exists, use `StationService` for the interface and `StationServiceImpl` for the implementation. Provider implementations may have descriptive names such as `S3CompatibleStorageService`.

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
