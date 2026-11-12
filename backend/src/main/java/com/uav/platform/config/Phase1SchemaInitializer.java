package com.uav.platform.config;

import com.uav.platform.enums.permission.PermissionCode;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.stream.Collectors;

/** Small idempotent bridge for development databases created before Phase 1 auth fields existed. */
@Slf4j
@Component
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(
        name = "app.phase1.compatibility-schema.enabled",
        havingValue = "true",
        matchIfMissing = false)
@Order(0)
@RequiredArgsConstructor
public class Phase1SchemaInitializer implements org.springframework.boot.ApplicationRunner {
    private final JdbcTemplate jdbc;

    @Override
    public void run(org.springframework.boot.ApplicationArguments args) {
        try {
            jdbc.execute(
                    "alter table users add column if not exists manual_locked boolean not null default false");
            String database;
            try (var connection = jdbc.getDataSource().getConnection()) {
                database = connection.getMetaData().getDatabaseProductName();
            } catch (java.sql.SQLException ex) {
                throw new IllegalStateException("Unable to inspect database metadata", ex);
            }
            if (database.toLowerCase().contains("postgres")) {
                jdbc.execute(
                        "alter table permissions drop constraint if exists permissions_code_check");
                String allowed =
                        Arrays.stream(PermissionCode.values())
                                .map(code -> "'" + code.name() + "'")
                                .collect(Collectors.joining(","));
                jdbc.execute(
                        "alter table permissions add constraint permissions_code_check check (code in ("
                                + allowed
                                + "))");
            }
        } catch (RuntimeException ex) {
            // Hibernate or a migration tool may own schema changes in production; keep startup
            // diagnostics explicit.
            log.warn("Phase 1 compatibility migration did not run: {}", ex.getMessage());
        }
    }
}
