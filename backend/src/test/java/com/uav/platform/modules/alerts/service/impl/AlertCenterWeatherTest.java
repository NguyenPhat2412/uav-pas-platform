package com.uav.platform.modules.alerts.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.modules.alerts.dto.response.AdminAlertResponse;
import com.uav.platform.modules.dashboard.service.SystemHealthService;
import com.uav.platform.modules.devicekey.repository.DeviceApiKeyRepository;
import com.uav.platform.modules.settings.service.SystemConfigService;
import com.uav.platform.modules.weather.dto.response.WeatherAssessmentResponse;
import com.uav.platform.modules.weather.enums.FlightClearanceLevel;
import com.uav.platform.modules.weather.service.WeatherService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;

import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;

/** Missions about to fly into a NO_GO forecast surface in the admin alert center. */
class AlertCenterWeatherTest {
    private JdbcTemplate db;
    private WeatherService weather;
    private ObjectProvider<WeatherService> weatherProvider;
    private ObjectProvider<SystemHealthService> health;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() throws Exception {
        db = mock(JdbcTemplate.class);
        weather = mock(WeatherService.class);
        weatherProvider = mock(ObjectProvider.class);
        health = mock(ObjectProvider.class);
        when(weatherProvider.getIfAvailable()).thenReturn(weather);
        ResultSet row = mock(ResultSet.class);
        when(row.getLong("id")).thenReturn(42L);
        when(row.getString("code")).thenReturn("MS-42");
        when(row.getDouble("latitude")).thenReturn(21.03);
        when(row.getDouble("longitude")).thenReturn(105.85);
        when(row.getDouble("max_wind_ms")).thenReturn(8.0);
        when(row.getTimestamp("start_time"))
                .thenReturn(Timestamp.valueOf(LocalDateTime.of(2026, 10, 31, 10, 0)));
        doAnswer(
                        call -> {
                            ((RowCallbackHandler) call.getArgument(1)).processRow(row);
                            return null;
                        })
                .when(db)
                .query(contains("FROM missions m"), any(RowCallbackHandler.class), any(), any());
    }

    private AlertCenterServiceImpl service(ObjectProvider<WeatherService> provider) {
        return new AlertCenterServiceImpl(
                db,
                mock(SystemConfigService.class),
                mock(DeviceApiKeyRepository.class),
                health,
                provider);
    }

    private static WeatherAssessmentResponse verdict(FlightClearanceLevel clearance) {
        return new WeatherAssessmentResponse(
                clearance,
                10,
                List.of("WIND_LIMIT_EXCEEDED", "WIND_GUST_EXCEEDED"),
                8.0,
                "2026-10-31T10:00",
                true,
                "OPEN_METEO",
                false,
                26.0,
                80,
                9.0,
                11.5,
                13.0,
                17.0,
                120,
                9000.0,
                0.0,
                20,
                60,
                3,
                2.0,
                1.25,
                List.of());
    }

    private List<AdminAlertResponse> weatherAlerts(AlertCenterServiceImpl service) {
        return service.current().items().stream()
                .filter(a -> a.code().equals("MISSION_WEATHER_HAZARD"))
                .toList();
    }

    @Test
    void aNoGoForecastRaisesAWarningLinkedToTheMission() {
        when(weather.assess(21.03, 105.85, LocalDateTime.of(2026, 10, 31, 10, 0), 8.0))
                .thenReturn(verdict(FlightClearanceLevel.NO_GO));
        List<AdminAlertResponse> alerts = weatherAlerts(service(weatherProvider));
        assertEquals(1, alerts.size());
        AdminAlertResponse alert = alerts.getFirst();
        assertEquals("WARNING", alert.severity());
        assertEquals("FLEET", alert.source());
        assertEquals("/operations/missions/42", alert.href());
        assertEquals("MS-42", alert.params().get("code"));
        assertEquals("WIND_LIMIT_EXCEEDED, WIND_GUST_EXCEEDED", alert.params().get("reasons"));
        assertEquals(11.5, alert.params().get("wind"));
        assertEquals(
                AlertCenterServiceImpl.KEY_PREFIX + "MISSION_WEATHER_HAZARD", alert.messageKey());
    }

    @Test
    void cautionOrUnavailableRaisesNothing() {
        when(weather.assess(anyDouble(), anyDouble(), any(), any()))
                .thenReturn(verdict(FlightClearanceLevel.CAUTION));
        assertTrue(weatherAlerts(service(weatherProvider)).isEmpty());
    }

    @Test
    void aWeatherFailureLeavesTheOtherFleetAlertsAlone() {
        when(weather.assess(anyDouble(), anyDouble(), any(), any()))
                .thenThrow(new IllegalStateException("down"));
        AlertCenterServiceImpl service = service(weatherProvider);
        assertTrue(weatherAlerts(service).isEmpty());
        assertTrue(
                service.current().items().stream().noneMatch(a -> a.id().equals("source-FLEET")));
    }

    @Test
    void withoutTheWeatherModuleNothingIsChecked() {
        when(weatherProvider.getIfAvailable()).thenReturn(null);
        assertTrue(weatherAlerts(service(weatherProvider)).isEmpty());
        assertTrue(
                weatherAlerts(
                                new AlertCenterServiceImpl(
                                        db,
                                        mock(SystemConfigService.class),
                                        mock(DeviceApiKeyRepository.class),
                                        health))
                        .isEmpty());
        verifyNoInteractions(weather);
    }
}
