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

/**
 * Verifies the two supported migration paths against a real disposable PostgreSQL instance.
 * The database URL/password are supplied only by the test environment and never written to evidence.
 */
@EnabledIfEnvironmentVariable(named = "UAV_STABILIZATION_DB_URL", matches = "jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/uav_stabilization")
class MigrationUpgradePostgresTest {
    private static final String MIGRATIONS = "classpath:db/migration";

    @Test
    void freshAndV1UpgradePreserveSyntheticData() throws Exception {
        String freshSchema = schema("fresh");
        String upgradeSchema = schema("upgrade");
        try (Connection connection = connection()) {
            createSchema(connection, freshSchema);
            createSchema(connection, upgradeSchema);

            migrate(freshSchema, null);
            assertEquals(2, version(connection, freshSchema));
            assertTrue(hasColumn(connection, freshSchema, "media_assets", "confirmed"));
            assertEquals(19, tableCount(connection, freshSchema));

            migrate(upgradeSchema, MigrationVersion.fromVersion("1"));
            assertEquals(1, version(connection, upgradeSchema));
            insertSyntheticUser(connection, upgradeSchema);
            assertEquals(1, countSyntheticUser(connection, upgradeSchema));

            migrate(upgradeSchema, null);
            assertEquals(2, version(connection, upgradeSchema));
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
