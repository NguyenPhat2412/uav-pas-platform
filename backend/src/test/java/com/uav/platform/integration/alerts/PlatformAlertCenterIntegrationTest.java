package com.uav.platform.integration.alerts;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.uav.platform.dto.request.devicekey.CreateDeviceKeyRequest;
import com.uav.platform.dto.request.uav.UavRequest;
import com.uav.platform.dto.response.alerts.AdminAlertResponse;
import com.uav.platform.dto.response.dashboard.SystemHealthResponse;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.alerts.AlertCenterService;
import com.uav.platform.service.dashboard.SystemHealthService;
import com.uav.platform.service.devicekey.DeviceKeyService;
import com.uav.platform.service.uav.UavService;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@SpringBootTest(
        properties =
                "spring.datasource.url=jdbc:h2:mem:platform_alerts;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE")
class PlatformAlertCenterIntegrationTest {
    @Autowired AlertCenterService alerts;
    @Autowired UavService uavs;
    @Autowired UserRepository users;
    @Autowired DeviceKeyService deviceKeys;
    @Autowired JdbcTemplate db;
    @Autowired WebApplicationContext context;
    @MockitoBean SystemHealthService health;

    private AppUser user(UserRole role) {
        String s = UUID.randomUUID().toString().substring(0, 8);
        return users.save(
                new AppUser(
                        "al_" + s,
                        "al_" + s + "@example.invalid",
                        "synthetic-placeholder",
                        null,
                        null,
                        null,
                        null,
                        role,
                        UserStatus.ACTIVE));
    }

    private AdminAlertResponse find(List<AdminAlertResponse> items, String id) {
        return items.stream().filter(a -> a.id().equals(id)).findFirst().orElse(null);
    }

    @Test
    void aggregatesFleetMaintenanceKeysAndHealthBySeverity() {
        when(health.check())
                .thenReturn(
                        new SystemHealthResponse(
                                "DOWN",
                                LocalDateTime.now(),
                                List.of(
                                        new SystemHealthResponse.Component(
                                                "database", "UP", 1L, Map.of()),
                                        new SystemHealthResponse.Component(
                                                "storage", "DOWN", null, Map.of())),
                                null));
        AppUser admin = user(UserRole.ROLE_ADMIN);
        String s = UUID.randomUUID().toString().substring(0, 8);
        Long flying =
                uavs.create(
                                new UavRequest("Alert A", "AL-A-" + s, "Synthetic"),
                                admin.getUsername())
                        .id();
        Long silent =
                uavs.create(
                                new UavRequest("Alert B", "AL-B-" + s, "Synthetic"),
                                admin.getUsername())
                        .id();
        Long healthy =
                uavs.create(
                                new UavRequest("Alert C", "AL-C-" + s, "Synthetic"),
                                admin.getUsername())
                        .id();
        db.update("UPDATE uavs SET status = 'IN_USE' WHERE id IN (?, ?)", flying, silent);
        insertTelemetry(flying, 12, LocalDateTime.now().minusMinutes(1));
        insertTelemetry(silent, 90, LocalDateTime.now().minusMinutes(25));
        insertTelemetry(healthy, 95, LocalDateTime.now().minusMinutes(1));
        db.update(
                "INSERT INTO maintenance_schedules (uav_id, title, interval_days, next_due_date, active, version,"
                        + " created_at, updated_at) VALUES (?, 'Rotor check', 30, ?, TRUE, 0, ?, ?)",
                healthy,
                java.sql.Date.valueOf(LocalDate.now().minusDays(3)),
                Timestamp.valueOf(LocalDateTime.now()),
                Timestamp.valueOf(LocalDateTime.now()));
        deviceKeys.create(
                new CreateDeviceKeyRequest("Soon " + s, null, LocalDateTime.now().plusDays(2)),
                admin.getUsername());

        var result = alerts.current();
        var items = result.items();
        var battery = find(items, "uav-battery-" + flying);
        assertNotNull(battery);
        assertEquals("CRITICAL", battery.severity());
        assertEquals("adminPlatform.alerts.messages.UAV_BATTERY_LOW", battery.messageKey());
        assertEquals(12, battery.params().get("battery"));
        assertEquals("CRITICAL", find(items, "uav-telemetry-" + silent).severity());
        assertNull(find(items, "uav-battery-" + healthy));
        assertNull(find(items, "uav-telemetry-" + healthy));
        assertTrue(
                items.stream()
                        .anyMatch(
                                a ->
                                        a.code().equals("MAINTENANCE_OVERDUE")
                                                && a.params().get("days").equals(3L)));
        assertTrue(
                items.stream()
                        .anyMatch(
                                a ->
                                        a.code().equals("DEVICE_KEY_EXPIRING")
                                                && a.href().equals("/admin/device-keys")));
        assertEquals("CRITICAL", find(items, "health-storage").severity());
        assertNull(find(items, "health-database"));
        // Most severe first and totals match.
        assertEquals("CRITICAL", items.get(0).severity());
        assertEquals(items.size(), result.critical() + result.warning() + result.info());
    }

    @Test
    void endpointRequiresAdminRoleAndDashboardPermission() throws Exception {
        when(health.check())
                .thenReturn(new SystemHealthResponse("UP", LocalDateTime.now(), List.of(), null));
        var mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        AppUser admin = user(UserRole.ROLE_ADMIN);
        AppUser operator = user(UserRole.ROLE_OPERATOR);
        mvc.perform(
                        get("/api/v1/admin/alerts")
                                .with(
                                        authentication(
                                                new UsernamePasswordAuthenticationToken(
                                                        admin.getUsername(),
                                                        null,
                                                        List.of(
                                                                new SimpleGrantedAuthority(
                                                                        "ROLE_ADMIN"))))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray());
        mvc.perform(
                        get("/api/v1/admin/alerts")
                                .with(
                                        authentication(
                                                new UsernamePasswordAuthenticationToken(
                                                        operator.getUsername(),
                                                        null,
                                                        List.of(
                                                                new SimpleGrantedAuthority(
                                                                        "ROLE_OPERATOR"))))))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/alerts")).andExpect(status().isUnauthorized());
    }

    private void insertTelemetry(Long uavId, int battery, LocalDateTime at) {
        db.update(
                "INSERT INTO uav_telemetry (uav_id, recorded_at, received_at, latitude, longitude, battery_pct,"
                        + " reported_by) VALUES (?, ?, ?, 21.0, 105.8, ?, 'test')",
                uavId,
                Timestamp.valueOf(at),
                Timestamp.valueOf(at),
                battery);
    }
}
