# Backend database migration and mission code allocation

The canonical backend is `/Volumes/D/Codex/projects/uav-pas-platform/backend`.
Flyway owns PostgreSQL schema changes. Normal startup now uses:

```properties
spring.flyway.enabled=true
spring.flyway.baseline-on-migrate=false
spring.jpa.hibernate.ddl-auto=validate
app.phase1.compatibility-schema.enabled=false
```

Explicit environment overrides still take precedence. Check the deployed environment,
including existing `.env` files, before rollout. Do not use Hibernate `update` as a
substitute for a versioned migration. The compatibility initializer is opt-in only.
H2 unit/integration tests deliberately retain `create-drop`; real PostgreSQL tests
run Flyway followed by Hibernate validation.

## V5: atomic mission codes

The database sequence `mission_code_seq` allocates suffixes atomically across
transactions and application instances. The display format stays `MSN-<requested
year>-<suffix padded to at least six digits>`. The numeric suffix is global across
years, as the previous count-based allocation was; it does not reset on January 1.

V5 starts above the maximum numeric suffix of existing canonical mission codes,
including codes from earlier years. It does not rename or update existing missions.
Noncanonical imported codes are ignored when finding that maximum. Sequence values
can have gaps after rollback; a code is unique, not a gapless invoice number.
Imports must not supply canonical generated codes behind the allocator's back.

## Rollout prerequisites

1. Back up the target database and verify restoration into an isolated database.
2. Stop all old backend writers before migrating. Old count-based allocators must
   not run concurrently with the sequence-based release, even though the unique
   constraint remains a final safeguard.
3. Determine whether the target schema already has `flyway_schema_history` and
   inspect its versions/checksums. Do not print credentials or put them in source.
4. Rehearse the appropriate path below on the restored copy. Confirm data counts,
   key records, constraints, Hibernate validation and a mission create/rollback.

No production or shared development database was migrated as part of this code change.

## Path A: empty database

Start the backend with the normal configuration and a user allowed to create the
schema objects. Flyway applies V1 through V5, then Hibernate validates the schema.
An empty database starts mission numbering at 1. Never baseline an empty database.

## Path B: database already managed by Flyway

Keep V1–V4 unchanged. Inspect `flyway info`, then run the current application or
`flyway migrate` with the migrations in `backend/src/main/resources/db/migration`.
Flyway applies only pending migrations. Run `flyway validate` afterwards and inspect
successful V5 history. Startup then validates JPA mappings before serving traffic.

V1, V2 and V4 upgrade paths are covered by PostgreSQL regression tests. The V4 test
includes synthetic historical mission codes with a much larger suffix than the
row count. Re-running migrate must not reset the sequence.

## Path C: existing Hibernate-managed database without Flyway history

Normal startup intentionally refuses a nonempty unmanaged schema. Do **not** enable
`baseline-on-migrate` to bypass that refusal: baselining records a claim about the
schema; it does not transform or verify the schema.

On the restored copy, compare the schema with a disposable reference database
migrated to a known version. Include columns/types/defaults/nullability, foreign
keys, unique/check constraints, ordinary and partial indexes, and identity settings.
Hibernate validation alone does not check all of those. In particular, V2 media and
inventory columns, V3 maintenance tables/partial unique index, and V4 trimmed-phone
uniqueness must be present before declaring equivalence to V4.

Only when a DBA/operator has verified **V4-equivalence**, explicitly baseline at 4,
then migrate to V5. The following Flyway CLI commands assume `FLYWAY_URL`,
`FLYWAY_USER`, `FLYWAY_PASSWORD`, `FLYWAY_SCHEMAS` and `FLYWAY_DEFAULT_SCHEMA` already
refer to the verified target. Run from `backend/`; keep passwords in the environment:

```sh
flyway -locations=filesystem:src/main/resources/db/migration info
flyway -baselineVersion=4 -baselineDescription="Verified V4 legacy schema" baseline
flyway -locations=filesystem:src/main/resources/db/migration migrate
flyway -locations=filesystem:src/main/resources/db/migration validate
```

If the schema differs, stop and prepare a reviewed reconciliation migration for
that actual schema. Do not guess a baseline version, mark V5 as applied, auto-delete
duplicate data, run `repair` to hide checksum mismatches, or run `clean` on the target.
The adoption regression test uses a known V4-equivalent schema, first proves that
automatic adoption is refused, then proves explicit baseline + V5 preserves data.
It is not evidence that an arbitrary existing database is V4-equivalent.

## Recovery

V5 is additive. If application rollout fails, stop writers and prefer fixing forward
with the sequence-based code; keep the sequence/history intact. Returning to the old
allocator reintroduces concurrent-code failures and is not a safe steady state.
If an actual database rollback is necessary, restore the verified pre-upgrade backup
with all writers stopped, accepting/reconciling writes made after that backup. Do not
manually drop the sequence while V5 remains recorded as successful.

## Verification

Use a disposable PostgreSQL 16 database whose name is `uav_stabilization` or
`uav_ba_test_suite`, addressed through `127.0.0.1`. Set `UAV_STABILIZATION_DB_URL`,
`UAV_STABILIZATION_DB_USER` and `UAV_STABILIZATION_DB_PASSWORD`, then run from backend:

```sh
./mvnw verify
```

PostgreSQL tests use unique schemas; never point these variables at a database that
contains user data. Without these variables the PostgreSQL suites are skipped, which
is not evidence of PostgreSQL compatibility. `.github/workflows/backend-persistence.yml`
provides the disposable server and variables in CI. MinIO tests are separate and
remain conditional on a dedicated storage test environment.

Primary references: [PostgreSQL sequence semantics](https://www.postgresql.org/docs/16/functions-sequence.html),
[Flyway baseline](https://documentation.red-gate.com/flyway/reference/commands/baseline),
[Flyway baseline-on-migrate](https://documentation.red-gate.com/flyway/reference/configuration/flyway-namespace/flyway-baseline-on-migrate-setting).
