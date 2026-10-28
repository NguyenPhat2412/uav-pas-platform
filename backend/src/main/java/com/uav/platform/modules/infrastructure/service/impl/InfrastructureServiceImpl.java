package com.uav.platform.modules.infrastructure.service.impl;

import com.uav.platform.modules.infrastructure.dto.record.StorageUsageSnapshot;
import com.uav.platform.modules.infrastructure.dto.response.DatabaseStatusResponse;
import com.uav.platform.modules.infrastructure.dto.response.DeploymentInfoResponse;
import com.uav.platform.modules.infrastructure.dto.response.StorageStatusResponse;
import com.uav.platform.modules.infrastructure.service.InfrastructureService;
import com.uav.platform.modules.infrastructure.service.TlsCertificateService;
import com.uav.platform.modules.media.service.ObjectStorageService;
import com.zaxxer.hikari.HikariDataSource;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.lang.management.ManagementFactory;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import javax.sql.DataSource;

/**
 * Read-only infrastructure facts for admins. Every value is a count, size, version or timestamp; connection URLs,
 * hostnames, bucket names and credentials are never read into a response.
 */
@Service
@Slf4j
public class InfrastructureServiceImpl implements InfrastructureService {
    static final String UNKNOWN = "unknown";
    static final Duration STORAGE_CACHE = Duration.ofMinutes(10);
    static final Duration STORAGE_FAILURE_CACHE = Duration.ofMinutes(1);
    static final long STORAGE_SCAN_LIMIT = 100_000;

    private final JdbcTemplate jdbc;
    private final DataSource dataSource;
    private final ObjectStorageService storage;
    private final TlsCertificateService tls;
    private final Environment environment;
    private final String version;
    private final String gitCommit;
    private final String buildTime;
    private final String publicUrl;
    private final Clock clock;

    private volatile StorageUsageSnapshot usageSnapshot;

    @Autowired
    public InfrastructureServiceImpl(
            JdbcTemplate jdbc,
            DataSource dataSource,
            ObjectStorageService storage,
            TlsCertificateService tls,
            Environment environment,
            @Value("${app.build.version:unknown}") String version,
            @Value("${app.build.git-commit:unknown}") String gitCommit,
            @Value("${app.build.time:unknown}") String buildTime,
            @Value("${app.public-url:}") String publicUrl) {
        this.jdbc = jdbc;
        this.dataSource = dataSource;
        this.storage = storage;
        this.tls = tls;
        this.environment = environment;
        this.version = orUnknown(version);
        this.gitCommit = orUnknown(gitCommit);
        this.buildTime = orUnknown(buildTime);
        this.publicUrl = publicUrl == null || publicUrl.isBlank() ? null : publicUrl.trim();
        this.clock = Clock.systemUTC();
    }

    static String orUnknown(String value) {
        return value == null || value.isBlank() ? UNKNOWN : value.trim();
    }

    @Override
    public DeploymentInfoResponse deployment() {
        Instant now = clock.instant();
        var runtime = ManagementFactory.getRuntimeMXBean();
        List<DeploymentInfoResponse.Migration> migrations = migrations();
        String flywayVersion =
                migrations.stream()
                        .filter(m -> m.success() && m.version() != null)
                        .map(DeploymentInfoResponse.Migration::version)
                        .findFirst()
                        .orElse(null);
        return new DeploymentInfoResponse(
                version,
                gitCommit,
                buildTime,
                Arrays.asList(environment.getActiveProfiles()),
                System.getProperty("java.version"),
                System.getProperty("java.vendor"),
                Instant.ofEpochMilli(runtime.getStartTime()),
                runtime.getUptime() / 1000,
                ZoneId.systemDefault().getId(),
                now,
                publicUrl,
                flywayVersion,
                migrations,
                tls.current());
    }

    /** Newest first. An unreadable history (Flyway disabled, fresh test DB) yields an empty list. */
    private List<DeploymentInfoResponse.Migration> migrations() {
        try {
            return jdbc.query(
                    "select version, description, installed_on, execution_time, success "
                            + "from flyway_schema_history order by installed_rank desc",
                    (rs, i) -> {
                        Timestamp installed = rs.getTimestamp("installed_on");
                        int execution = rs.getInt("execution_time");
                        return new DeploymentInfoResponse.Migration(
                                rs.getString("version"),
                                rs.getString("description"),
                                installed == null ? null : installed.toInstant(),
                                rs.wasNull() ? null : execution,
                                rs.getBoolean("success"));
                    });
        } catch (RuntimeException unavailable) {
            log.debug("Flyway history unavailable: {}", unavailable.getClass().getSimpleName());
            return List.of();
        }
    }

    @Override
    public StorageStatusResponse storage() {
        StorageUsageSnapshot snapshot = usage();
        return new StorageStatusResponse(
                storage.provider(),
                snapshot.reachable(),
                snapshot.usage() == null ? null : snapshot.usage().objectCount(),
                snapshot.usage() == null ? null : snapshot.usage().totalBytes(),
                snapshot.usage() == null ? null : snapshot.usage().truncated(),
                snapshot.checkedAt(),
                snapshot.error(),
                mediaStats());
    }

    private StorageUsageSnapshot usage() {
        Instant now = clock.instant();
        StorageUsageSnapshot snapshot = usageSnapshot;
        if (fresh(snapshot, now)) return snapshot;
        synchronized (this) {
            snapshot = usageSnapshot;
            if (fresh(snapshot, now)) return snapshot;
            usageSnapshot = scanUsage(now);
            return usageSnapshot;
        }
    }

    private static boolean fresh(StorageUsageSnapshot snapshot, Instant now) {
        if (snapshot == null) return false;
        Duration ttl = snapshot.usage() != null ? STORAGE_CACHE : STORAGE_FAILURE_CACHE;
        return snapshot.checkedAt().plus(ttl).isAfter(now);
    }

    /** Exceptions are reduced to their type: S3 messages can contain the endpoint and bucket. */
    private StorageUsageSnapshot scanUsage(Instant now) {
        String reachable;
        try {
            reachable = storage.bucketReachable() ? "UP" : "DOWN";
        } catch (UnsupportedOperationException unsupported) {
            reachable = "UNKNOWN";
        } catch (RuntimeException failed) {
            reachable = "DOWN";
        }
        if ("DOWN".equals(reachable)) return new StorageUsageSnapshot(null, reachable, null, now);
        try {
            return new StorageUsageSnapshot(
                    storage.usage(STORAGE_SCAN_LIMIT), reachable, null, now);
        } catch (UnsupportedOperationException unsupported) {
            return new StorageUsageSnapshot(null, reachable, "UNSUPPORTED", now);
        } catch (RuntimeException failed) {
            return new StorageUsageSnapshot(
                    null, reachable, failed.getClass().getSimpleName(), now);
        }
    }

    /**
     * Media lifecycle from the media_assets table: confirmed uploads, signed uploads still pending or expired, and
     * the V13 cleanup queue (deleted rows whose object is not yet removed from storage).
     */
    private StorageStatusResponse.MediaStats mediaStats() {
        Map<String, Object> row =
                jdbc.queryForMap(
                        """
                        select
                          count(*) filter (where not deleted and confirmed) as confirmed,
                          coalesce(sum(size) filter (where not deleted and confirmed), 0) as confirmed_bytes,
                          count(*) filter (where not deleted and not confirmed
                            and (upload_valid_until is null or upload_valid_until >= current_timestamp)) as awaiting,
                          count(*) filter (where not deleted and not confirmed
                            and upload_valid_until < current_timestamp) as expired,
                          count(*) filter (where deleted and object_deleted_at is null) as pending_cleanup,
                          count(*) filter (where deleted and object_deleted_at is null
                            and delete_after < current_timestamp - interval '1 hour') as overdue,
                          count(*) filter (where deleted and object_deleted_at is null
                            and delete_attempts > 0) as retrying,
                          count(*) filter (where deleted and object_deleted_at is not null) as purged
                        from media_assets
                        """);
        return new StorageStatusResponse.MediaStats(
                num(row.get("confirmed")),
                num(row.get("confirmed_bytes")),
                num(row.get("awaiting")),
                num(row.get("expired")),
                num(row.get("pending_cleanup")),
                num(row.get("overdue")),
                num(row.get("retrying")),
                num(row.get("purged")));
    }

    @Override
    public DatabaseStatusResponse database() {
        String serverVersion = jdbc.queryForObject("show server_version", String.class);
        Long size = jdbc.queryForObject("select pg_database_size(current_database())", Long.class);
        Map<String, Object> activity =
                jdbc.queryForMap(
                        """
                        select
                          count(*) filter (where state = 'active') as active,
                          count(*) filter (where state = 'idle') as idle,
                          count(*) filter (where state like 'idle in transaction%') as idle_tx,
                          count(*) as total
                        from pg_stat_activity
                        where datname = current_database()
                        """);
        Integer max =
                jdbc.queryForObject(
                        "select current_setting('max_connections')::int", Integer.class);
        List<DatabaseStatusResponse.TableSize> tables =
                jdbc.query(
                        """
                        select relname, pg_total_relation_size(relid) as total_bytes, n_live_tup
                        from pg_stat_user_tables
                        order by pg_total_relation_size(relid) desc
                        limit 10
                        """,
                        (rs, i) ->
                                new DatabaseStatusResponse.TableSize(
                                        rs.getString("relname"),
                                        rs.getLong("total_bytes"),
                                        rs.getLong("n_live_tup")));
        return new DatabaseStatusResponse(
                serverVersion,
                size == null ? 0 : size,
                new DatabaseStatusResponse.Connections(
                        num(activity.get("active")),
                        num(activity.get("idle")),
                        num(activity.get("idle_tx")),
                        num(activity.get("total")),
                        max == null ? 0 : max),
                tables,
                pool());
    }

    private DatabaseStatusResponse.Pool pool() {
        try {
            if (!dataSource.isWrapperFor(HikariDataSource.class)) return null;
            HikariDataSource hikari = dataSource.unwrap(HikariDataSource.class);
            var bean = hikari.getHikariPoolMXBean();
            if (bean == null) return null;
            return new DatabaseStatusResponse.Pool(
                    bean.getActiveConnections(),
                    bean.getIdleConnections(),
                    bean.getTotalConnections(),
                    bean.getThreadsAwaitingConnection(),
                    hikari.getMaximumPoolSize());
        } catch (Exception unavailable) {
            return null;
        }
    }

    private static long num(Object value) {
        return value instanceof Number number ? number.longValue() : 0L;
    }
}
