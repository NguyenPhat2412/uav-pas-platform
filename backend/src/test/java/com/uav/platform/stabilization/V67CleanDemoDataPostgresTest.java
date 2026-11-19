package com.uav.platform.stabilization;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * Verifies V67 clean demo data migration on a real disposable PostgreSQL schema, including
 * idempotency when re-applying every V67 statement.
 */
@EnabledIfEnvironmentVariable(
        named = "UAV_STABILIZATION_DB_URL",
        matches = "jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/uav_(stabilization|ba_test_suite)")
class V67CleanDemoDataPostgresTest {

    private static final Set<String> ALLOWED_CLEAN_COVERS =
            Set.of(
                    "/images/services/aerial-inspection-grid.webp",
                    "/images/services/aerial-recording-cinema.webp",
                    "/images/services/uav-rental-fleet.webp",
                    "/images/solutions/infra-3d-survey.webp",
                    "/images/solutions/edge-ai-kv260-tracking.webp",
                    "/images/solutions/sar-emergency-response.webp",
                    "/images/process/step-05-data-handover.webp");

    @Test
    void freshPostgresSchemaRunsV67CleanlyAndIsIdempotent() throws Exception {
        String schema = "v67_clean_" + UUID.randomUUID().toString().replace("-", "");
        try (Connection c =
                        DriverManager.getConnection(
                                System.getenv("UAV_STABILIZATION_DB_URL"),
                                System.getenv("UAV_STABILIZATION_DB_USER"),
                                System.getenv("UAV_STABILIZATION_DB_PASSWORD"));
                Statement s = c.createStatement()) {
            Flyway.configure()
                    .dataSource(
                            System.getenv("UAV_STABILIZATION_DB_URL"),
                            System.getenv("UAV_STABILIZATION_DB_USER"),
                            System.getenv("UAV_STABILIZATION_DB_PASSWORD"))
                    .locations("classpath:db/migration")
                    .schemas(schema)
                    .defaultSchema(schema)
                    .createSchemas(true)
                    .load()
                    .migrate();

            s.execute("SET search_path TO " + schema);

            for (String[] pair :
                    List.of(
                            new String[] {"marketplace_listings", "title"},
                            new String[] {"uavs", "model"},
                            new String[] {"users", "full_name"},
                            new String[] {"provider_pilots", "full_name"},
                            new String[] {"projects", "name"},
                            new String[] {"provider_profiles", "display_name"},
                            new String[] {"service_plans", "name"},
                            new String[] {"missions", "title"})) {
                try (ResultSet r =
                        s.executeQuery(
                                "SELECT "
                                        + pair[1]
                                        + " FROM "
                                        + pair[0]
                                        + " WHERE "
                                        + pair[1]
                                        + " IS NOT NULL")) {
                    while (r.next()) {
                        String val = r.getString(1);
                        assertFalse(
                                val.toLowerCase(Locale.ROOT).contains("minh ho"),
                                pair[0] + "." + pair[1] + " still contains 'minh ho': " + val);
                    }
                }
            }

            Set<String> covers = new HashSet<>();
            try (ResultSet r =
                    s.executeQuery(
                            "SELECT slug, cover_image_url FROM marketplace_listings WHERE deleted = FALSE")) {
                while (r.next()) {
                    String slug = r.getString(1);
                    String cover = r.getString(2);
                    assertNotNull(cover, "Demo listing cover must be populated: " + slug);
                    assertTrue(ALLOWED_CLEAN_COVERS.contains(cover), "Unexpected cover: " + cover);
                    assertTrue(covers.add(cover), "Duplicate cover across listings: " + cover);
                }
            }
            assertEquals(6, covers.size());

            try (ResultSet r =
                    s.executeQuery(
                            "SELECT config_value FROM system_configurations WHERE config_key = 'marketplace.rfq_enabled'")) {
                assertTrue(r.next());
                assertEquals("false", r.getString(1));
            }

            // Re-executing V67 statements on PostgreSQL must touch 0 rows
            String sql =
                    Files.readString(
                            Path.of(
                                    "src/main/resources/db/migration/V67__clean_demo_names_covers_and_disable_rfq.sql"));
            for (String raw : sql.split(";")) {
                String stmt = raw.replaceAll("(?m)^--.*$", "").trim();
                if (stmt.isEmpty()) continue;
                assertEquals(0, s.executeUpdate(stmt), "Expected 0 rows on re-run: " + stmt);
            }
        } finally {
            dropSchema(schema);
        }
    }

    @Test
    void upgradeFromV66OnPostgresScrubsDirtyNamesAndBannedCovers() throws Exception {
        String schema = "v67_upgrade_" + UUID.randomUUID().toString().replace("-", "");
        try (Connection c =
                        DriverManager.getConnection(
                                System.getenv("UAV_STABILIZATION_DB_URL"),
                                System.getenv("UAV_STABILIZATION_DB_USER"),
                                System.getenv("UAV_STABILIZATION_DB_PASSWORD"));
                Statement s = c.createStatement()) {
            Flyway.configure()
                    .dataSource(
                            System.getenv("UAV_STABILIZATION_DB_URL"),
                            System.getenv("UAV_STABILIZATION_DB_USER"),
                            System.getenv("UAV_STABILIZATION_DB_PASSWORD"))
                    .locations("classpath:db/migration")
                    .schemas(schema)
                    .defaultSchema(schema)
                    .createSchemas(true)
                    .target(MigrationVersion.fromVersion("66"))
                    .load()
                    .migrate();

            s.execute("SET search_path TO " + schema);
            s.executeUpdate(
                    "UPDATE marketplace_listings SET title = 'Khảo sát khu đất – minh họa', cover_image_url = '/images/services/data-collection-corridor.webp' WHERE slug = 'khao-sat-ban-do-2d-du-an-minh-hoa'");
            s.executeUpdate(
                    "UPDATE marketplace_listings SET title = 'Kiểm tra mái pin (minh hoạ)', cover_image_url = '/images/uav-photos/usgs-plum-island-team.webp' WHERE slug = 'kiem-tra-nhiet-dien-mat-troi-minh-hoa'");
            s.executeUpdate(
                    "UPDATE system_configurations SET config_value = 'true' WHERE config_key = 'marketplace.rfq_enabled'");

            Flyway.configure()
                    .dataSource(
                            System.getenv("UAV_STABILIZATION_DB_URL"),
                            System.getenv("UAV_STABILIZATION_DB_USER"),
                            System.getenv("UAV_STABILIZATION_DB_PASSWORD"))
                    .locations("classpath:db/migration")
                    .schemas(schema)
                    .defaultSchema(schema)
                    .load()
                    .migrate();

            try (ResultSet r =
                    s.executeQuery(
                            "SELECT title, cover_image_url, description FROM marketplace_listings WHERE slug = 'khao-sat-ban-do-2d-du-an-minh-hoa'")) {
                assertTrue(r.next());
                assertEquals("Khảo sát khu đất", r.getString(1));
                assertEquals("/images/process/step-05-data-handover.webp", r.getString(2));
                assertTrue(r.getString(3).contains("minh hoạ"));
            }

            try (ResultSet r =
                    s.executeQuery(
                            "SELECT config_value FROM system_configurations WHERE config_key = 'marketplace.rfq_enabled'")) {
                assertTrue(r.next());
                assertEquals("false", r.getString(1));
            }
        } finally {
            dropSchema(schema);
        }
    }

    private static void dropSchema(String schema) throws Exception {
        try (Connection c =
                        DriverManager.getConnection(
                                System.getenv("UAV_STABILIZATION_DB_URL"),
                                System.getenv("UAV_STABILIZATION_DB_USER"),
                                System.getenv("UAV_STABILIZATION_DB_PASSWORD"));
                Statement s = c.createStatement()) {
            s.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
        }
    }
}
