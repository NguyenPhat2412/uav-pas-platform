package com.uav.platform.integration.maintenance;

import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.util.UUID;

/** Same service/MVC/concurrency contracts on an isolated real PostgreSQL schema. */
@EnabledIfEnvironmentVariable(
        named = "UAV_STABILIZATION_DB_URL",
        matches = "jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/uav_(stabilization|ba_test_suite)")
class MaintenancePlanningPostgresTest extends MaintenancePlanningIntegrationTest {
    private static final String SCHEMA =
            "maintenance_" + UUID.randomUUID().toString().replace("-", "");

    @DynamicPropertySource
    static void postgres(DynamicPropertyRegistry p) {
        p.add("spring.datasource.url", () -> System.getenv("UAV_STABILIZATION_DB_URL"));
        p.add("spring.datasource.username", () -> System.getenv("UAV_STABILIZATION_DB_USER"));
        p.add("spring.datasource.password", () -> System.getenv("UAV_STABILIZATION_DB_PASSWORD"));
        p.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        p.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
        p.add("spring.flyway.enabled", () -> true);
        p.add("spring.flyway.schemas", () -> SCHEMA);
        p.add("spring.flyway.default-schema", () -> SCHEMA);
        p.add("spring.jpa.properties.hibernate.default_schema", () -> SCHEMA);
        p.add("spring.datasource.hikari.connection-init-sql", () -> "SET search_path TO " + SCHEMA);
        p.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        p.add("app.phase1.compatibility-schema.enabled", () -> false);
    }
}
