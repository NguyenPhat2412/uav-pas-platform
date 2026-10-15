package com.uav.platform.stabilization;

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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Verifies the two supported migration paths against a real disposable PostgreSQL instance.
 * The database URL/password are supplied only by the test environment and never written to evidence.
 */
@EnabledIfEnvironmentVariable(named = "UAV_STABILIZATION_DB_URL", matches = "jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/uav_(stabilization|ba_test_suite)")
class MigrationUpgradePostgresTest {
    private static final String MIGRATIONS = "classpath:db/migration";

    @Test
    void v2UpgradePreservesFleetAndInventoryAndEnforcesOneActiveRepairOrder() throws Exception {
        String schema = schema("maintenance_upgrade");
        try (Connection c = connection(); Statement s = c.createStatement()) {
            migrate(schema, MigrationVersion.fromVersion("2"));
            s.execute("SET search_path TO " + schema);
            s.executeUpdate("INSERT INTO uav_stations(id,code,name,status) VALUES (501,'MIGRATION-HOME','Synthetic station','ACTIVE')");
            s.executeUpdate("INSERT INTO uavs(id,model,serial_number,manufacturer,status,station_id) VALUES (501,'Synthetic','MIGRATION-UAV','Synthetic','AVAILABLE',501)");
            s.executeUpdate("INSERT INTO equipment(id,name,type,status,station_id,quantity,available_quantity,reserved_quantity) VALUES (501,'Synthetic battery','BATTERY','ACTIVE',501,7,5,2)");
            migrate(schema, null);
            assertEquals(3, version(c, schema));
            assertTrue(hasUniqueIndex(c, schema, "uk_repair_order_active_uav"));
            try (ResultSet r = s.executeQuery("SELECT u.status,u.station_id,e.quantity,e.available_quantity,e.reserved_quantity FROM uavs u JOIN equipment e ON u.station_id=e.station_id WHERE u.id=501")) {
                assertTrue(r.next()); assertEquals("AVAILABLE", r.getString(1)); assertEquals(501, r.getLong(2));
                assertEquals(7, r.getInt(3)); assertEquals(5, r.getInt(4)); assertEquals(2, r.getInt(5));
            }
            String insert = "INSERT INTO repair_orders(uav_id,title,planned_date,technician_name,status) VALUES (501,'Synthetic repair',CURRENT_DATE,'Synthetic technician','OPEN')";
            s.executeUpdate(insert);
            assertEquals("23505", assertThrows(SQLException.class, () -> s.executeUpdate(insert)).getSQLState());
            s.executeUpdate("UPDATE repair_orders SET status='CANCELLED' WHERE uav_id=501");
            assertEquals(1, s.executeUpdate(insert));
        } finally {
            try (Connection c = connection(); Statement s = c.createStatement()) { s.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE"); }
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
            assertEquals(3, version(connection, freshSchema));
            assertTrue(hasColumn(connection, freshSchema, "media_assets", "confirmed"));
            assertEquals(22, tableCount(connection, freshSchema));

            migrate(upgradeSchema, MigrationVersion.fromVersion("1"));
            assertEquals(1, version(connection, upgradeSchema));
            insertSyntheticUser(connection, upgradeSchema);
            assertEquals(1, countSyntheticUser(connection, upgradeSchema));

            migrate(upgradeSchema, null);
            assertEquals(3, version(connection, upgradeSchema));
            assertTrue(hasColumn(connection, upgradeSchema, "media_assets", "deleted"));
            assertTrue(hasUniqueIndex(connection, upgradeSchema, "uk_inventory_request_id"));
            assertEquals(1, countSyntheticUser(connection, upgradeSchema));
        } finally {
            try (Connection connection = connection(); Statement statement = connection.createStatement()) {
                statement.execute("DROP SCHEMA IF EXISTS " + freshSchema + " CASCADE");
                statement.execute("DROP SCHEMA IF EXISTS " + upgradeSchema + " CASCADE");
            }
        }
    }

    private static void migrate(String schema, MigrationVersion target) {
        var configuration = Flyway.configure()
                .dataSource(System.getenv("UAV_STABILIZATION_DB_URL"), System.getenv("UAV_STABILIZATION_DB_USER"), System.getenv("UAV_STABILIZATION_DB_PASSWORD"))
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
        String sql = "SELECT COALESCE(MAX(version::int), 0) FROM " + schema + ".flyway_schema_history WHERE success = true";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            result.next();
            return result.getInt(1);
        }
    }

    private static int tableCount(Connection connection, String schema) throws SQLException {
        String sql = "SELECT count(*) FROM information_schema.tables WHERE table_schema = '" + schema + "' AND table_type = 'BASE TABLE' AND table_name <> 'flyway_schema_history'";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            result.next();
            return result.getInt(1);
        }
    }

    private static boolean hasColumn(Connection connection, String schema, String table, String column) throws SQLException {
        String sql = "SELECT 1 FROM information_schema.columns WHERE table_schema = '" + schema + "' AND table_name = '" + table + "' AND column_name = '" + column + "'";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            return result.next();
        }
    }

    private static boolean hasUniqueIndex(Connection connection, String schema, String index) throws SQLException {
        String sql = "SELECT 1 FROM pg_indexes WHERE schemaname = '" + schema + "' AND indexname = '" + index + "'";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            return result.next();
        }
    }

    private static void insertSyntheticUser(Connection connection, String schema) throws SQLException {
        String sql = "INSERT INTO " + schema + ".users (username, email, role, status, failed_attempts, manual_locked) VALUES ('upgrade_fixture', 'upgrade_fixture@example.test', 'ROLE_PILOT', 'ACTIVE', 0, false)";
        try (Statement statement = connection.createStatement()) {
            statement.executeUpdate(sql);
        }
    }

    private static int countSyntheticUser(Connection connection, String schema) throws SQLException {
        String sql = "SELECT count(*) FROM " + schema + ".users WHERE username = 'upgrade_fixture'";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            result.next();
            return result.getInt(1);
        }
    }

    private static String schema(String prefix) {
        return prefix + "_" + UUID.randomUUID().toString().replace("-", "");
    }
}
