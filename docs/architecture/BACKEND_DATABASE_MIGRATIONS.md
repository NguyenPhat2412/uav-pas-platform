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

## V14: atomic mission codes

The database sequence `mission_code_seq` allocates suffixes atomically across
transactions and application instances. The display format stays `MSN-<requested
year>-<suffix padded to at least six digits>`. The numeric suffix is global across
years, as the previous count-based allocation was; it does not reset on January 1.

V14 starts above the maximum numeric suffix of existing canonical mission codes,
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
schema objects. Flyway applies V1 through V15, then Hibernate validates the schema.
An empty database starts mission numbering at 1. Never baseline an empty database.

## Path B: database already managed by Flyway

Keep the published V1–V14 files unchanged. Inspect `flyway info`, then run the current application or
`flyway migrate` with the migrations in `backend/src/main/resources/db/migration`.
Flyway applies only pending migrations. Run `flyway validate` afterwards and inspect
successful V15 history. Startup then validates JPA mappings before serving traffic.

The canonical history follows the integrated lineage: V3 indexing/constraints,
V4 SAR/AI, V5 notifications, V9 maintenance, V10 profile-phone uniqueness,
V11 audit columns, V12 durable billing/payment protection and V13 durable media
cleanup. V14 adds the mission-code sequence. An earlier local, unpublished V5
sequence candidate was used only on a disposable test database that has been
removed; it is now V14. This does not authorize renaming any migration already
applied to a persistent database.

Before upgrading, compare migration descriptions and checksums as well as version
numbers. A database built from the earlier local V3-maintenance/V4-phone lineage
is **not** equivalent to the integrated V3/V4 history. Stop and prepare a reviewed
reconciliation plan if that older lineage appears; do not hide it with `repair`,
a guessed baseline or history edits.

Regression coverage must include fresh installation, historical managed upgrades,
V13 → V14 with existing mission codes from multiple years, concurrent allocation,
and rollback. Re-running migrate must not reset the sequence or rewrite existing
missions. Confirm V1–V13 history/checksums remain unchanged across V14.

## Path C: existing Hibernate-managed database without Flyway history

Normal startup intentionally refuses a nonempty unmanaged schema. Do **not** enable
`baseline-on-migrate` to bypass that refusal: baselining records a claim about the
schema; it does not transform or verify the schema. A running Hibernate-created
22-table database must not be assumed to match the integrated V13 schema.

Rehearse on an isolated restored copy. Compare it with a disposable reference
migrated to the exact integrated version. Include columns/types/defaults/nullability,
foreign keys, unique/check constraints, ordinary and partial indexes, sequences,
identity settings and required migration data. Hibernate validation alone is
insufficient. Resolve differences through a reviewed, data-preserving adoption plan.

Only after proving complete equivalence to a specific integrated version may an
operator explicitly baseline at that version. For example, a **verified integrated
V13-equivalent** schema may be baselined at 13 and then migrated to V14; this is not
a recipe for an arbitrary Hibernate-created database. Verify restoration, data
counts and key records before any later activation. Never baseline an empty database,
mark V14 as applied without executing it, auto-delete duplicate data, or run `clean`
on a database containing user data.

## Scope of this source integration

The V14 source/test update does not authorize a live database upgrade or runtime
restart. Keep the existing runtime, connection configuration and user data intact.
Execute the rollout prerequisites and any database adoption in a separately planned
maintenance step before activating this backend release. In particular, do not
point sequence-based code at the old schema before the sequence exists.

## Recovery

V14 is additive. If application rollout fails, stop writers and prefer fixing forward
with the sequence-based code; keep the sequence/history intact. Returning to the old
allocator reintroduces concurrent-code failures and is not a safe steady state.
If an actual database rollback is necessary, restore the verified pre-upgrade backup
with all writers stopped, accepting/reconciling writes made after that backup. Do not
manually drop the sequence while V14 remains recorded as successful.

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


## V15: durable financial events and bounded webhook delivery

V15 adds `financial_outbox_events` and delivery event IDs/states with a unique
(event ID, subscription ID) index. Financial writes and their event record commit
atomically. A separate worker creates a notification and delivery queue in one
transaction under the event lock. Events without active subscribers remain
`WAITING_SUBSCRIBERS`; retrying them does not repeat the local notification.
External HTTP is at-least-once: receivers must deduplicate the stable `X-Event-Id`.
A crash after remote receipt but before local commit can cause a repeated request.

All existing subscriptions are disabled by V15. Historic delivery logs become
`LEGACY_UNVERIFIED`; they are never automatically replayed. No historic financial
rows are backfilled because their prior notification/dispatch state is unknown.
New financial changes always record an outbox event.

`app.webhook.enabled` defaults to false, and `app.webhook.approved-urls` defaults
empty. Production activation requires both the enable switch and an exact,
comma-separated list of reviewed target URLs, plus an active subscription.
Do not approve the seeded demonstration destinations. Secrets belong in runtime
configuration, not logs or screenshots. Keep the provider and automatic invoice
settings off unless separately configured under their existing policy.

The connection manager resolves each destination using the guarded DNS resolver,
checks every answer, and connects using those same address objects. Non-public
addresses, URL credentials/fragments, and redirects are blocked. Default TLS
hostname verification uses the original URL host. DNS has a one-second budget
with a bounded two-thread/two-queued lookup pool; connection/read timeouts are two
seconds and the entire HTTP attempt has a four-second budget. Response bodies are
limited to 16 KiB and never persisted. Each pass attempts at most five deliveries;
non-success delivery stops after three attempts and remains visible as FAILED.
Unconfigured work stays persisted and is reconsidered once per minute. Local
financial work retries in fair due-time order, at most 50 events per pass, with a
backoff up to 60 minutes. Investigate safe error categories in the outbox instead
of deleting pending records. No public retry API is added in this change.

Before any rollout, rehearse V14→V15 on a restored copy and compare V1–V14 history,
missions and invoices. The test suite separately pins the historical V13→V14
path. This source change does not authorize a running database migration or restart.


### Destination removal retains delivery evidence

Deleting a webhook subscription now tombstones it (`deleted_at`) and hides it from
active subscription management. It cannot be reactivated. Pending, retrying and
unconfigured deliveries retain their stable IDs and become `CANCELLED` with the
safe `DESTINATION_REMOVED` category; delivered/failed history retains its prior
outcome. Removal does not replay an already completed financial outbox event or
create another notification. The V15 foreign key uses RESTRICT, so an accidental
hard delete cannot cascade through retained delivery records.

Enqueue holds a shared destination lock. HTTP and deletion take the destination
write lock before delivery locks, in a consistent order. An in-flight HTTP attempt
may finish before deletion commits; once deletion has completed no new attempt can
start for that destination. Creating a new subscription is a separate registration
and does not automatically restore cancelled work.
