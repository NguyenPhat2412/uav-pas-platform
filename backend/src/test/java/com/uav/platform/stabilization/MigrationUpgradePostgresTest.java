package com.uav.platform.stabilization;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.UUID;

/**
 * Verifies the two supported migration paths against a real disposable PostgreSQL instance.
 * The database URL/password are supplied only by the test environment and never written to evidence.
 */
@EnabledIfEnvironmentVariable(
        named = "UAV_STABILIZATION_DB_URL",
        matches = "jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/uav_(stabilization|ba_test_suite)")
class MigrationUpgradePostgresTest {
    private static final String MIGRATIONS = "classpath:db/migration";

    @Test
    void missionSequenceStartsAtOneAndDoesNotReuseRolledBackNumbers() throws Exception {
        String schema = schema("mission_sequence_fresh");
        try (Connection c = connection();
                Statement s = c.createStatement()) {
            migrate(schema, null);
            s.execute("SET search_path TO " + schema);
            assertEquals(1, nextMissionNumber(c));
            c.setAutoCommit(false);
            assertEquals(2, nextMissionNumber(c));
            c.rollback();
            c.setAutoCommit(true);
            assertEquals(3, nextMissionNumber(c));
            migrate(schema, null);
            assertEquals(
                    4, nextMissionNumber(c), "Restarting migration must not rewind the sequence");
        } finally {
            dropSchema(schema);
        }
    }

    @Test
    void v4UpgradeContinuesAboveLegacyCodesAcrossYearsWithoutChangingMissions() throws Exception {
        String schema = schema("mission_sequence_upgrade");
        try (Connection c = connection();
                Statement s = c.createStatement()) {
            migrate(schema, MigrationVersion.fromVersion("4"));
            s.execute("SET search_path TO " + schema);
            insertSyntheticUser(c, schema);
            insertLegacyMission(c, "MSN-2025-900001");
            insertLegacyMission(c, "MSN-2026-000007");
            insertLegacyMission(c, "IMPORTED-1234567");
            migrate(schema, null);
            assertEquals(900002, nextMissionNumber(c));
            try (ResultSet r = s.executeQuery("SELECT code FROM missions ORDER BY code")) {
                assertTrue(r.next());
                assertEquals("IMPORTED-1234567", r.getString(1));
                assertTrue(r.next());
                assertEquals("MSN-2025-900001", r.getString(1));
                assertTrue(r.next());
                assertEquals("MSN-2026-000007", r.getString(1));
                assertEquals(false, r.next());
            }
        } finally {
            dropSchema(schema);
        }
    }

    @Test
    void publishedV13UpgradesToV14WithoutChangingHistoryOrMissionData() throws Exception {
        String schema = schema("mission_sequence_v13_upgrade");
        try (Connection c = connection();
                Statement s = c.createStatement()) {
            migrate(schema, MigrationVersion.fromVersion("13"));
            s.execute("SET search_path TO " + schema);
            insertSyntheticUser(c, schema);
            insertLegacyMission(c, "MSN-2025-900001");
            insertLegacyMission(c, "MSN-2026-000007");
            insertLegacyMission(c, "IMPORTED-1234567");
            var historyBefore =
                    jsonRows(
                            c,
                            "SELECT row_to_json(h)::text FROM flyway_schema_history h WHERE version IS NOT NULL AND version::int <= 13 ORDER BY installed_rank");
            var missionsBefore =
                    jsonRows(c, "SELECT row_to_json(m)::text FROM missions m ORDER BY id");
            assertEquals(13, historyBefore.size());
            assertEquals(3, missionsBefore.size());

            migrate(schema, MigrationVersion.fromVersion("14"));
            assertEquals(14, version(c, schema));
            assertEquals(
                    historyBefore,
                    jsonRows(
                            c,
                            "SELECT row_to_json(h)::text FROM flyway_schema_history h WHERE version IS NOT NULL AND version::int <= 13 ORDER BY installed_rank"),
                    "V14 must preserve complete V1-V13 history rows, including descriptions and checksums");
            assertEquals(
                    missionsBefore,
                    jsonRows(c, "SELECT row_to_json(m)::text FROM missions m ORDER BY id"));
            assertEquals(1, countSyntheticUser(c, schema));
            assertEquals(900002, nextMissionNumber(c));
            c.setAutoCommit(false);
            assertEquals(900003, nextMissionNumber(c));
            c.rollback();
            c.setAutoCommit(true);
            assertEquals(900004, nextMissionNumber(c));
            migrate(schema, MigrationVersion.fromVersion("14"));
            assertEquals(
                    900005, nextMissionNumber(c), "Repeated migrate must not rewind the sequence");
        } finally {
            dropSchema(schema);
        }
    }

    @Test
    void publishedV14UpgradesToV15PreservingHistoryAndFinancialData() throws Exception {
        String schema = schema("outbox_v14_upgrade");
        try (Connection c = connection();
                Statement s = c.createStatement()) {
            migrate(schema, MigrationVersion.fromVersion("14"));
            s.execute("SET search_path TO " + schema);
            insertSyntheticUser(c, schema);
            insertLegacyMission(c, "MSN-2026-000123");
            var history =
                    jsonRows(
                            c,
                            "SELECT row_to_json(h)::text FROM flyway_schema_history h WHERE version IS NOT NULL ORDER BY installed_rank");
            var missions = jsonRows(c, "SELECT row_to_json(m)::text FROM missions m ORDER BY id");
            s.executeUpdate(
                    "INSERT INTO invoices(code,user_id,amount,due_date) SELECT 'INV-UPGRADE',id,100,CURRENT_TIMESTAMP FROM users WHERE username='upgrade_fixture'");
            var financial = jsonRows(c, "SELECT row_to_json(i)::text FROM invoices i ORDER BY id");
            int tables = tableCount(c, schema);
            migrate(schema, MigrationVersion.fromVersion("15"));
            assertEquals(15, version(c, schema));
            assertEquals(tables + 1, tableCount(c, schema));
            assertEquals(
                    history,
                    jsonRows(
                            c,
                            "SELECT row_to_json(h)::text FROM flyway_schema_history h WHERE version IS NOT NULL AND version::int<=14 ORDER BY installed_rank"));
            assertEquals(
                    missions,
                    jsonRows(c, "SELECT row_to_json(m)::text FROM missions m ORDER BY id"));
            assertEquals(
                    financial,
                    jsonRows(c, "SELECT row_to_json(i)::text FROM invoices i ORDER BY id"));
            assertTrue(hasColumn(c, schema, "financial_outbox_events", "payload"));
            assertTrue(hasColumn(c, schema, "webhook_subscriptions", "deleted_at"));
            assertTrue(hasUniqueIndex(c, schema, "uq_webhook_event_subscription"));
            try (ResultSet r =
                    s.executeQuery("SELECT count(*) FROM webhook_subscriptions WHERE is_active")) {
                assertTrue(r.next());
                assertEquals(0, r.getInt(1));
            }
        } finally {
            dropSchema(schema);
        }
    }

    private static java.util.List<String> jsonRows(Connection connection, String sql)
            throws SQLException {
        var rows = new java.util.ArrayList<String>();
        try (Statement statement = connection.createStatement();
                ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) rows.add(result.getString(1));
        }
        return rows;
    }

    @Test
    void unmanagedDatabaseIsRefusedUntilAnExplicitVerifiedV4Baseline() throws Exception {
        String schema = schema("mission_sequence_adoption");
        try (Connection c = connection();
                Statement s = c.createStatement()) {
            // A known V4-equivalent schema models an audited legacy database without Flyway
            // history.
            migrate(schema, MigrationVersion.fromVersion("4"));
            s.execute("SET search_path TO " + schema);
            insertSyntheticUser(c, schema);
            insertLegacyMission(c, "MSN-2026-800001");
            s.execute("DROP TABLE flyway_schema_history");
            assertThrows(org.flywaydb.core.api.FlywayException.class, () -> migrate(schema, null));
            assertEquals(1, countSyntheticUser(c, schema));
            Flyway.configure()
                    .dataSource(
                            System.getenv("UAV_STABILIZATION_DB_URL"),
                            System.getenv("UAV_STABILIZATION_DB_USER"),
                            System.getenv("UAV_STABILIZATION_DB_PASSWORD"))
                    .schemas(schema)
                    .defaultSchema(schema)
                    .baselineVersion("4")
                    .load()
                    .baseline();
            migrate(schema, null);
            assertEquals(800002, nextMissionNumber(c));
            assertEquals(1, countSyntheticUser(c, schema));
        } finally {
            dropSchema(schema);
        }
    }

    private static long nextMissionNumber(Connection c) throws SQLException {
        try (Statement s = c.createStatement();
                ResultSet r = s.executeQuery("SELECT nextval('mission_code_seq')")) {
            assertTrue(r.next());
            return r.getLong(1);
        }
    }

    private static void insertLegacyMission(Connection c, String code) throws SQLException {
        String sql =
                "INSERT INTO missions(code,customer_id,title,requested_date,start_time,expected_end_time,location_name,mission_type,priority,status,operator_accepted,version) "
                        + "SELECT ?,id,'Legacy mission',DATE '2026-10-17',TIMESTAMP '2026-10-17 10:00:00',TIMESTAMP '2026-10-17 11:00:00','Hanoi','AREA_INSPECTION','NORMAL','DRAFT',false,0 "
                        + "FROM users WHERE username='upgrade_fixture'";
        try (var s = c.prepareStatement(sql)) {
            s.setString(1, code);
            assertEquals(1, s.executeUpdate());
        }
    }

    private static void dropSchema(String schema) throws SQLException {
        try (Connection c = connection();
                Statement s = c.createStatement()) {
            s.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
        }
    }

    @Test
    void v2UpgradePreservesFleetAndInventoryAndEnforcesOneActiveRepairOrder() throws Exception {
        String schema = schema("maintenance_upgrade");
        try (Connection c = connection();
                Statement s = c.createStatement()) {
            migrate(schema, MigrationVersion.fromVersion("2"));
            s.execute("SET search_path TO " + schema);
            s.executeUpdate(
                    "INSERT INTO uav_stations(id,code,name,status) VALUES (501,'MIGRATION-HOME','Synthetic station','ACTIVE')");
            s.executeUpdate(
                    "INSERT INTO uavs(id,model,serial_number,manufacturer,status,station_id) VALUES (501,'Synthetic','MIGRATION-UAV','Synthetic','AVAILABLE',501)");
            s.executeUpdate(
                    "INSERT INTO equipment(id,name,type,status,station_id,quantity,available_quantity,reserved_quantity) VALUES (501,'Synthetic battery','BATTERY','ACTIVE',501,7,5,2)");
            migrate(schema, null);
            assertEquals(15, version(c, schema));
            assertTrue(hasUniqueIndex(c, schema, "uk_repair_order_active_uav"));
            try (ResultSet r =
                    s.executeQuery(
                            "SELECT u.status,u.station_id,e.quantity,e.available_quantity,e.reserved_quantity FROM uavs u JOIN equipment e ON u.station_id=e.station_id WHERE u.id=501")) {
                assertTrue(r.next());
                assertEquals("AVAILABLE", r.getString(1));
                assertEquals(501, r.getLong(2));
                assertEquals(7, r.getInt(3));
                assertEquals(5, r.getInt(4));
                assertEquals(2, r.getInt(5));
            }
            String insert =
                    "INSERT INTO repair_orders(uav_id,title,planned_date,technician_name,status) VALUES (501,'Synthetic repair',CURRENT_DATE,'Synthetic technician','OPEN')";
            s.executeUpdate(insert);
            assertEquals(
                    "23505",
                    assertThrows(SQLException.class, () -> s.executeUpdate(insert)).getSQLState());
            s.executeUpdate("UPDATE repair_orders SET status='CANCELLED' WHERE uav_id=501");
            assertEquals(1, s.executeUpdate(insert));
        } finally {
            try (Connection c = connection();
                    Statement s = c.createStatement()) {
                s.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
            }
        }
    }

    @Test
    void freshAndV1UpgradePreserveSyntheticData() throws Exception {
        String freshSchema = schema("fresh");
        String upgradeSchema = schema("upgrade");
        try (Connection connection = connection()) {
            createSchema(connection, freshSchema);
            createSchema(connection, upgradeSchema);

            migrate(freshSchema, null);
            assertEquals(15, version(connection, freshSchema));
            assertTrue(hasColumn(connection, freshSchema, "media_assets", "confirmed"));
            assertTrue(hasColumn(connection, freshSchema, "media_assets", "delete_after"));
            assertTrue(hasColumn(connection, freshSchema, "media_assets", "upload_valid_until"));
            assertEquals(37, tableCount(connection, freshSchema));

            migrate(upgradeSchema, MigrationVersion.fromVersion("1"));
            assertEquals(1, version(connection, upgradeSchema));
            insertSyntheticUser(connection, upgradeSchema);
            assertEquals(1, countSyntheticUser(connection, upgradeSchema));

            migrate(upgradeSchema, null);
            assertEquals(15, version(connection, upgradeSchema));
            assertTrue(hasColumn(connection, upgradeSchema, "media_assets", "deleted"));
            assertTrue(hasUniqueIndex(connection, upgradeSchema, "uk_inventory_request_id"));
            assertTrue(hasUniqueIndex(connection, upgradeSchema, "idx_missions_uav_schedule"));
            assertEquals(1, countSyntheticUser(connection, upgradeSchema));
        } finally {
            try (Connection connection = connection();
                    Statement statement = connection.createStatement()) {
                statement.execute("DROP SCHEMA IF EXISTS " + freshSchema + " CASCADE");
                statement.execute("DROP SCHEMA IF EXISTS " + upgradeSchema + " CASCADE");
            }
        }
    }

    @Test
    void publishedMainV8UpgradesWithoutLosingNotificationOrConfigurationData() throws Exception {
        String schema = schema("main_v8_upgrade");
        try (Connection c = connection();
                Statement statement = c.createStatement()) {
            migrate(schema, MigrationVersion.fromVersion("8"));
            insertSyntheticUser(c, schema);
            statement.execute("SET search_path TO " + schema);
            statement.executeUpdate(
                    "INSERT INTO notifications(user_id,title,content,type) SELECT id,'Synthetic upgrade','Preserve notification content','SYSTEM' FROM users WHERE username='upgrade_fixture'");
            long settings;
            try (ResultSet rows =
                    statement.executeQuery("SELECT count(*) FROM system_configurations")) {
                rows.next();
                settings = rows.getLong(1);
            }
            migrate(schema, null);
            assertEquals(15, version(c, schema));
            assertEquals(1, countSyntheticUser(c, schema));
            try (ResultSet rows =
                    statement.executeQuery(
                            "SELECT content,updated_at FROM notifications WHERE title='Synthetic upgrade'")) {
                assertTrue(rows.next());
                assertEquals("Preserve notification content", rows.getString(1));
                assertNotNull(rows.getTimestamp(2));
            }
            try (ResultSet rows =
                    statement.executeQuery(
                            "SELECT count(*),count(created_at) FROM system_configurations")) {
                rows.next();
                assertEquals(settings + 1, rows.getLong(1));
                assertEquals(settings + 1, rows.getLong(2));
            }
            try (ResultSet rows =
                    statement.executeQuery(
                            "SELECT config_value FROM system_configurations WHERE config_key='billing.auto_generate_invoice'")) {
                assertTrue(rows.next());
                assertEquals("false", rows.getString(1));
            }
            assertTrue(hasColumn(c, schema, "missions", "billing_status"));
            assertTrue(hasColumn(c, schema, "ai_tasks", "updated_at"));
            assertTrue(hasColumn(c, schema, "ai_detections", "updated_at"));
            assertTrue(hasUniqueIndex(c, schema, "uk_users_phone_number"));
        } finally {
            try (Connection c = connection();
                    Statement statement = c.createStatement()) {
                statement.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
            }
        }
    }

    @Test
    void v12MediaUpgradePreservesConfirmedOwnershipAndQueuesOnlyDeletedTombstones()
            throws Exception {
        String schema = schema("media_v12_upgrade");
        try (Connection c = connection();
                Statement statement = c.createStatement()) {
            migrate(schema, MigrationVersion.fromVersion("12"));
            statement.execute("SET search_path TO " + schema);
            statement.executeUpdate(
                    "INSERT INTO media_assets(original_name,object_key,content_type,size,type,uploaded_by,storage_provider,confirmed,deleted,created_at,updated_at) VALUES ('confirmed.pdf','migration/confirmed','application/pdf',52,'DOCUMENT','synthetic-owner','test',true,false,CURRENT_TIMESTAMP-INTERVAL '2 days',CURRENT_TIMESTAMP),('pending.pdf','migration/pending','application/pdf',52,'DOCUMENT','synthetic-owner','test',false,false,CURRENT_TIMESTAMP-INTERVAL '2 days',CURRENT_TIMESTAMP),('deleted.pdf','migration/deleted','application/pdf',52,'DOCUMENT','synthetic-owner','test',true,true,CURRENT_TIMESTAMP-INTERVAL '2 days',CURRENT_TIMESTAMP)");
            migrate(schema, null);
            assertEquals(15, version(c, schema));
            assertEquals(37, tableCount(c, schema));
            try (ResultSet rows =
                    statement.executeQuery(
                            "SELECT object_key,uploaded_by,confirmed,deleted,upload_valid_until,delete_after,delete_attempts FROM media_assets ORDER BY object_key")) {
                assertTrue(rows.next());
                assertEquals("migration/confirmed", rows.getString(1));
                assertEquals("synthetic-owner", rows.getString(2));
                assertTrue(rows.getBoolean(3));
                assertFalse(rows.getBoolean(4));
                org.junit.jupiter.api.Assertions.assertNull(rows.getTimestamp(5));
                org.junit.jupiter.api.Assertions.assertNull(rows.getTimestamp(6));
                assertEquals(0, rows.getInt(7));
                assertTrue(rows.next());
                assertEquals("migration/deleted", rows.getString(1));
                assertTrue(rows.getBoolean(3));
                assertTrue(rows.getBoolean(4));
                assertNotNull(rows.getTimestamp(6));
                assertTrue(rows.next());
                assertEquals("migration/pending", rows.getString(1));
                org.junit.jupiter.api.Assertions.assertFalse(rows.getBoolean(3));
                org.junit.jupiter.api.Assertions.assertFalse(rows.getBoolean(4));
                assertNotNull(rows.getTimestamp(5));
                org.junit.jupiter.api.Assertions.assertNull(rows.getTimestamp(6));
            }
        } finally {
            try (Connection c = connection();
                    Statement statement = c.createStatement()) {
                statement.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
            }
        }
    }

    @Test
    void profilePhoneIndexAllowsAbsentValuesButRejectsTrimmedDuplicates() throws Exception {
        String schema = schema("profile_phone");
        try (Connection c = connection();
                Statement s = c.createStatement()) {
            migrate(schema, null);
            s.execute("SET search_path TO " + schema);
            assertTrue(hasUniqueIndex(c, schema, "uk_users_phone_number"));
            String prefix =
                    "INSERT INTO users(username,email,phone_number,role,status,failed_attempts,manual_locked) VALUES ";
            s.executeUpdate(
                    prefix
                            + "('absent1','absent1@example.invalid',NULL,'ROLE_PILOT','ACTIVE',0,false),('absent2','absent2@example.invalid',NULL,'ROLE_PILOT','ACTIVE',0,false),('blank1','blank1@example.invalid','','ROLE_PILOT','ACTIVE',0,false),('blank2','blank2@example.invalid','  ','ROLE_PILOT','ACTIVE',0,false)");
            s.executeUpdate(
                    prefix
                            + "('phone1','phone1@example.invalid',' 0900123123 ','ROLE_PILOT','ACTIVE',0,false)");
            assertEquals(
                    "23505",
                    assertThrows(
                                    SQLException.class,
                                    () ->
                                            s.executeUpdate(
                                                    prefix
                                                            + "('phone2','phone2@example.invalid','0900123123','ROLE_PILOT','ACTIVE',0,false)"))
                            .getSQLState());
        } finally {
            try (Connection c = connection();
                    Statement s = c.createStatement()) {
                s.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
            }
        }
    }

    @Test
    void profileMigrationRefusesLegacyDuplicatesWithoutRewritingPersonalData() throws Exception {
        String schema = schema("profile_duplicate");
        try (Connection c = connection();
                Statement s = c.createStatement()) {
            migrate(schema, MigrationVersion.fromVersion("8"));
            s.execute("SET search_path TO " + schema);
            s.executeUpdate(
                    "INSERT INTO users(username,email,phone_number,role,status,failed_attempts,manual_locked) VALUES ('dup1','dup1@example.invalid','0900123999','ROLE_PILOT','ACTIVE',0,false),('dup2','dup2@example.invalid','0900123999','ROLE_PILOT','ACTIVE',0,false)");
            assertThrows(org.flywaydb.core.api.FlywayException.class, () -> migrate(schema, null));
            assertEquals(9, version(c, schema));
            try (ResultSet r =
                    s.executeQuery("SELECT count(*) FROM users WHERE phone_number='0900123999'")) {
                assertTrue(r.next());
                assertEquals(2, r.getInt(1));
            }
        } finally {
            try (Connection c = connection();
                    Statement s = c.createStatement()) {
                s.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
            }
        }
    }

    private static void migrate(String schema, MigrationVersion target) {
        var configuration =
                Flyway.configure()
                        .dataSource(
                                System.getenv("UAV_STABILIZATION_DB_URL"),
                                System.getenv("UAV_STABILIZATION_DB_USER"),
                                System.getenv("UAV_STABILIZATION_DB_PASSWORD"))
                        .locations(MIGRATIONS)
                        .schemas(schema)
                        .defaultSchema(schema)
                        .createSchemas(true);
        if (target != null) configuration.target(target);
        configuration.load().migrate();
    }

    private static Connection connection() throws SQLException {
        return DriverManager.getConnection(
                System.getenv("UAV_STABILIZATION_DB_URL"),
                System.getenv("UAV_STABILIZATION_DB_USER"),
                System.getenv("UAV_STABILIZATION_DB_PASSWORD"));
    }

    private static void createSchema(Connection connection, String schema) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("CREATE SCHEMA " + schema);
        }
    }

    private static int version(Connection connection, String schema) throws SQLException {
        String sql =
                "SELECT COALESCE(MAX(version::int), 0) FROM "
                        + schema
                        + ".flyway_schema_history WHERE success = true";
        try (Statement statement = connection.createStatement();
                ResultSet result = statement.executeQuery(sql)) {
            result.next();
            return result.getInt(1);
        }
    }

    private static int tableCount(Connection connection, String schema) throws SQLException {
        String sql =
                "SELECT count(*) FROM information_schema.tables WHERE table_schema = '"
                        + schema
                        + "' AND table_type = 'BASE TABLE' AND table_name <> 'flyway_schema_history'";
        try (Statement statement = connection.createStatement();
                ResultSet result = statement.executeQuery(sql)) {
            result.next();
            return result.getInt(1);
        }
    }

    private static boolean hasColumn(
            Connection connection, String schema, String table, String column) throws SQLException {
        String sql =
                "SELECT 1 FROM information_schema.columns WHERE table_schema = '"
                        + schema
                        + "' AND table_name = '"
                        + table
                        + "' AND column_name = '"
                        + column
                        + "'";
        try (Statement statement = connection.createStatement();
                ResultSet result = statement.executeQuery(sql)) {
            return result.next();
        }
    }

    private static boolean hasUniqueIndex(Connection connection, String schema, String index)
            throws SQLException {
        String sql =
                "SELECT 1 FROM pg_indexes WHERE schemaname = '"
                        + schema
                        + "' AND indexname = '"
                        + index
                        + "'";
        try (Statement statement = connection.createStatement();
                ResultSet result = statement.executeQuery(sql)) {
            return result.next();
        }
    }

    private static void insertSyntheticUser(Connection connection, String schema)
            throws SQLException {
        String sql =
                "INSERT INTO "
                        + schema
                        + ".users (username, email, role, status, failed_attempts, manual_locked) VALUES ('upgrade_fixture', 'upgrade_fixture@example.test', 'ROLE_PILOT', 'ACTIVE', 0, false)";
        try (Statement statement = connection.createStatement()) {
            statement.executeUpdate(sql);
        }
    }

    private static int countSyntheticUser(Connection connection, String schema)
            throws SQLException {
        String sql = "SELECT count(*) FROM " + schema + ".users WHERE username = 'upgrade_fixture'";
        try (Statement statement = connection.createStatement();
                ResultSet result = statement.executeQuery(sql)) {
            result.next();
            return result.getInt(1);
        }
    }

    private static String schema(String prefix) {
        return prefix + "_" + UUID.randomUUID().toString().replace("-", "");
    }
}
