package com.uav.platform.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.dto.record.StorageUsage;
import com.uav.platform.dto.response.DatabaseStatusResponse;
import com.uav.platform.dto.response.DeploymentInfoResponse;
import com.uav.platform.dto.response.StorageStatusResponse;
import com.uav.platform.service.ObjectStorageService;
import com.uav.platform.service.TlsCertificateService;
import com.zaxxer.hikari.HikariDataSource;
import com.zaxxer.hikari.HikariPoolMXBean;

import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.time.Instant;
import java.util.List;
import java.util.Map;

class InfrastructureServiceUnitTest {

    @Test
    @SuppressWarnings("unchecked")
    void deploymentStorageAndDatabaseReportsCoverSuccessAndFallbackBranches() throws Exception {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        HikariDataSource ds = mock(HikariDataSource.class);
        HikariPoolMXBean poolBean = mock(HikariPoolMXBean.class);
        ObjectStorageService storage = mock(ObjectStorageService.class);
        TlsCertificateService tls = mock(TlsCertificateService.class);
        Environment env = mock(Environment.class);

        when(env.getActiveProfiles()).thenReturn(new String[] {"prod"});
        when(jdbc.query(contains("flyway_schema_history"), any(RowMapper.class)))
                .thenReturn(
                        List.of(
                                new DeploymentInfoResponse.Migration(
                                        "68", "aes", Instant.now(), 12, true)));

        InfrastructureServiceImpl service =
                new InfrastructureServiceImpl(
                        jdbc,
                        ds,
                        storage,
                        tls,
                        env,
                        "1.0.0",
                        "abc123",
                        "2026-11-23",
                        "https://uav.all1.vn");

        DeploymentInfoResponse dep = service.deployment();
        assertEquals("1.0.0", dep.version());
        assertEquals("68", dep.flywayVersion());

        // Storage UP + cached
        when(storage.provider()).thenReturn("google-drive+r2");
        when(storage.bucketReachable()).thenReturn(true);
        when(storage.usage(anyLong())).thenReturn(new StorageUsage(15L, 2048L, false));
        when(jdbc.queryForMap(contains("from media_assets")))
                .thenReturn(
                        Map.of(
                                "confirmed", 10L,
                                "confirmed_bytes", 1000L,
                                "awaiting", 1L,
                                "expired", 0L,
                                "pending_cleanup", 2L,
                                "overdue", 0L,
                                "retrying", 0L,
                                "purged", 3L));
        StorageStatusResponse st1 = service.storage();
        assertEquals("UP", st1.reachable());
        assertEquals(15L, st1.objectCount());
        assertEquals(10L, st1.media().confirmed());
        // Second call hits cache
        assertEquals("UP", service.storage().reachable());
        verify(storage, times(1)).usage(anyLong());

        // Storage failure & unsupported branches on fresh instances
        InfrastructureServiceImpl svcDown =
                new InfrastructureServiceImpl(jdbc, ds, storage, tls, env, "", null, " ", "");
        doThrow(new RuntimeException("conn refused")).when(storage).bucketReachable();
        assertEquals("DOWN", svcDown.storage().reachable());

        InfrastructureServiceImpl svcUnsupported =
                new InfrastructureServiceImpl(jdbc, ds, storage, tls, env, "1", "c", "t", "");
        doThrow(new UnsupportedOperationException()).when(storage).bucketReachable();
        doThrow(new UnsupportedOperationException()).when(storage).usage(anyLong());
        StorageStatusResponse unsupRes = svcUnsupported.storage();
        assertEquals("UNKNOWN", unsupRes.reachable());
        assertEquals("UNSUPPORTED", unsupRes.usageError());

        // Database status with Hikari pool metrics
        when(jdbc.queryForObject("show server_version", String.class)).thenReturn("16.2");
        when(jdbc.queryForObject("select pg_database_size(current_database())", Long.class))
                .thenReturn(102400L);
        when(jdbc.queryForMap(contains("pg_stat_activity")))
                .thenReturn(Map.of("active", 2L, "idle", 3L, "idle_tx", 0L, "total", 5L));
        when(jdbc.queryForObject("select current_setting('max_connections')::int", Integer.class))
                .thenReturn(100);
        when(jdbc.query(contains("pg_stat_user_tables"), any(RowMapper.class)))
                .thenReturn(List.of(new DatabaseStatusResponse.TableSize("missions", 4096L, 50L)));
        when(ds.isWrapperFor(HikariDataSource.class)).thenReturn(true);
        when(ds.unwrap(HikariDataSource.class)).thenReturn(ds);
        when(ds.getHikariPoolMXBean()).thenReturn(poolBean);
        when(poolBean.getActiveConnections()).thenReturn(1);
        when(poolBean.getIdleConnections()).thenReturn(3);
        when(poolBean.getTotalConnections()).thenReturn(4);
        when(poolBean.getThreadsAwaitingConnection()).thenReturn(0);
        when(ds.getMaximumPoolSize()).thenReturn(10);

        DatabaseStatusResponse db = service.database();
        assertEquals("16.2", db.version());
        assertEquals(102400L, db.sizeBytes());
        assertNotNull(db.pool());
        assertEquals(10, db.pool().maximumPoolSize());
    }
}
