# Database and Migration Report

Inspection basis: current `HEAD` `6ecc85111a28e53679b2a6d8ac7ec93730d80be4`, `backend/src/main/resources`, entity mappings, and migration/test evidence. No shared or production database was modified.

## Runtime configuration

| Configuration | Default application | Stabilization profile | Finding |
|---|---|---|---|
| `spring.jpa.hibernate.ddl-auto` | `${HIBERNATE_DDL_AUTO:update}` | `validate` | **PARTIAL / risk:** ordinary startup can mutate schema through Hibernate update unless the environment overrides it. |
| `spring.flyway.enabled` | `false` | `true` | **PARTIAL / risk:** migration runner is opt-in in the default profile. |
| `spring.flyway.baseline-on-migrate` | `false` | `false` | Explicit baseline is required; no automatic baseline. |
| `app.phase1.compatibility-schema.enabled` | absent, initializer `matchIfMissing=true` | `false` | Compatibility runner remains active by default and can issue additive SQL; stabilization disables it. |
| Runtime DB | PostgreSQL URL default `jdbc:postgresql://localhost:5500/uav_pas_dev` | test profiles use H2; stabilization evidence uses disposable PostgreSQL | Actual production/shared DB was **NOT_VERIFIED**. |

## Migration files

1. `V1__baseline_uav_pas.sql` creates the phase-1 and mission schema: users/roles/permissions, stations/UAV/status history, equipment/movements, media, missions/services/events/media/reservations, refresh/invalidation tokens and audit logs. It defines unique keys for user/email/username, serial/code/object/token/request fields, foreign keys, version columns for equipment and mission, and token indexes.
2. `V2__media_confirmation_inventory_requests.sql` adds `media_assets.confirmed`, `confirmed_at`, `deleted`, and `inventory_movements.request_id`, with a unique request-id index.

`flyway_schema_history` was observed at version 2 in the current H2 test run. The sanitized evidence is `evidence/logs/backend-mvn-test.log`; fresh current-HEAD PostgreSQL Flyway history is recorded in `evidence/infra/postgres-flyway-history.txt`; fresh current-HEAD populated-copy rehearsal evidence is under `evidence/infra/populated-before.log`, `populated-v2-startup-summary.log`, and `populated-after.log`.

## Compatibility initializer

`Phase1SchemaInitializer` is still present. It conditionally adds `users.manual_locked` and, for PostgreSQL, replaces the `permissions_code_check` constraint from the enum. It is not a versioned migration and logs/wraps failures rather than failing startup. It is disabled only when `app.phase1.compatibility-schema.enabled=false`, as in the stabilization profile. This is a deployment consistency gap: use an explicit migration/profile policy before calling the default runtime migration state production-ready.

## Constraints, locking and idempotency

- `@Version` exists on `Equipment` and `Mission`; `UavRepository.findByIdForUpdate` and `EquipmentRepository.findByIdForUpdate` use pessimistic write locks.
- Inventory mutations run transactionally, validate positive/non-overallocated quantities, persist movement and audit rows, and bind an optional client `requestId` to actor, operation, target, quantity and note. A replay returns the original result; a payload mismatch conflicts. PostgreSQL stabilization evidence covers concurrent reserve, replay, invalid quantities, partial/full transfer, and audit counts.
- Mission equipment reservations have `released`/`released_at`, but there is no temporal quantity reservation model. Completion/cancel/fail calls release through the inventory quantity API.
- Mission overlap predicates use half-open semantics `[start,end)`: `start < existingEnd` and `existingStart < end`; terminal/cancelled statuses are excluded. There is no database exclusion constraint, and dedicated PostgreSQL concurrent mission assignment proof is **NOT_VERIFIED**.
- Media uses soft deletion (`deleted`) and post-commit object deletion; mission links prevent deleting attached media. Signed URLs are 15 minutes. Actual MinIO binary validation is **NOT_VERIFIED** (`evidence/infra/minio-availability.log`); the fresh storage stabilization run used an S3-compatible RustFS substitute.

## Migration verification status

| Check | Status | Evidence |
|---|---|---|
| Fresh migration applies V1/V2 | **VERIFIED** for current H2 and fresh disposable PostgreSQL runs | `MigrationBaselineTest`, `evidence/infra/postgres-stabilization-2.log`, `evidence/infra/postgres-flyway-history.txt` |
| Application starts after migrated schema | **VERIFIED** for fresh disposable PostgreSQL runtime health (`UP`) and current H2 tests | `evidence/infra/health-8093.json`, `BackendHealthTest` |
| Populated-copy upgrade retains representative rows and adds V2 columns | **VERIFIED** on disposable PostgreSQL copy | `evidence/infra/populated-before.log`, `populated-v2-startup-summary.log`, `populated-after.log` (1 user/station/equipment retained; V2 columns confirmed) |
| Default profile starts with Flyway-managed, validate-only schema | NOT_VERIFIED / default config contradicts this | `application.properties` |
| Destructive migration against shared data | NOT_RUN by policy | no shared DB evidence |
