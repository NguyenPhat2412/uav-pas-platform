package com.uav.platform.stabilization;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/** Boots with the real application migration defaults, not the H2 test overrides. */
@SpringBootTest(properties = {
        "app.storage.provider=test",
        "app.jwt.secret=migration-defaults-test-secret-at-least-32-bytes",
        "spring.sql.init.mode=never"
})
@TestPropertySource(locations = "file:src/main/resources/application.properties")
@EnabledIfEnvironmentVariable(named = "UAV_STABILIZATION_DB_URL",
        matches = "jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/uav_(stabilization|ba_test_suite)")
class MigrationDefaultsPostgresTest {
    private static final String SCHEMA = "migration_defaults_" + UUID.randomUUID().toString().replace("-", "");

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry p) {
        p.add("spring.datasource.url", () -> System.getenv("UAV_STABILIZATION_DB_URL"));
        p.add("spring.datasource.username", () -> System.getenv("UAV_STABILIZATION_DB_USER"));
        p.add("spring.datasource.password", () -> System.getenv("UAV_STABILIZATION_DB_PASSWORD"));
        p.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        p.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
        p.add("spring.flyway.schemas", () -> SCHEMA);
        p.add("spring.flyway.default-schema", () -> SCHEMA);
        p.add("spring.jpa.properties.hibernate.default_schema", () -> SCHEMA);
        p.add("spring.datasource.hikari.connection-init-sql", () -> "SET search_path TO " + SCHEMA);
    }

    @Autowired JdbcTemplate db;
    @Autowired Environment environment;
    @Autowired ApplicationContext context;

    @Test
    void freshDatabaseIsMigratedAndValidatedWithoutCompatibilityDdl() {
        assertEquals("validate", environment.getProperty("spring.jpa.hibernate.ddl-auto"));
        assertEquals(true, environment.getProperty("spring.flyway.enabled", Boolean.class));
        assertEquals(false, environment.getProperty("spring.flyway.baseline-on-migrate", Boolean.class));
        assertFalse(context.containsBean("phase1SchemaInitializer"));
        assertEquals(5, db.queryForObject("SELECT max(version::int) FROM flyway_schema_history WHERE success", Integer.class));
        assertEquals(1L, db.queryForObject("SELECT nextval('mission_code_seq')", Long.class));
    }
}
