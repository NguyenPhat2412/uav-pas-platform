package com.uav.platform.service.impl.mission;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.dto.response.weather.WeatherAssessmentResponse;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.enums.mission.MissionEventType;
import com.uav.platform.enums.mission.MissionStatus;
import com.uav.platform.enums.weather.FlightClearanceLevel;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.mission.MissionMapper;
import com.uav.platform.repository.mission.MissionEventRepository;
import com.uav.platform.repository.mission.MissionMediaRepository;
import com.uav.platform.repository.mission.MissionRepository;
import com.uav.platform.repository.mission.ServiceOfferingRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.billing.QuotaService;
import com.uav.platform.service.mission.MissionAccessService;
import com.uav.platform.service.mission.MissionBillingService;
import com.uav.platform.service.mission.MissionEventService;
import com.uav.platform.service.mission.MissionResourceService;
import com.uav.platform.service.weather.WeatherService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** Take-off weather check: advisory by default, blocking only when an administrator enabled it. */
class MissionWeatherPreflightTest {
    private final Authentication operator =
            new UsernamePasswordAuthenticationToken("operator", "n/a", List.of());
    private MissionAccessService access;
    private MissionEventService events;
    private WeatherService weather;
    private ObjectProvider<WeatherService> provider;
    private Mission mission;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        access = mock(MissionAccessService.class);
        events = mock(MissionEventService.class);
        weather = mock(WeatherService.class);
        provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(weather);
        mission = new Mission();
        mission.setStatus(MissionStatus.READY);
        mission.setStartTime(LocalDateTime.now());
        mission.setOperatorAccepted(true);
        mission.setLatitude(new BigDecimal("21.0285"));
        mission.setLongitude(new BigDecimal("105.8542"));
        when(access.accessibleForUpdate(7L, operator)).thenReturn(mission);
    }

    private MissionLifecycleServiceImpl service(ObjectProvider<WeatherService> weatherProvider) {
        return new MissionLifecycleServiceImpl(
                mock(MissionRepository.class),
                mock(ServiceOfferingRepository.class),
                mock(AuditLogService.class),
                mock(MissionEventRepository.class),
                mock(QuotaService.class),
                mock(MissionMediaRepository.class),
                access,
                events,
                mock(MissionResourceService.class),
                mock(MissionBillingService.class),
                mock(MissionMapper.class),
                weatherProvider);
    }

    private static WeatherAssessmentResponse verdict(
            FlightClearanceLevel clearance, Double wind80) {
        return new WeatherAssessmentResponse(
                clearance,
                20,
                List.of("WIND_LIMIT_EXCEEDED"),
                12.0,
                "2026-10-31T08:00",
                false,
                "OPEN_METEO",
                false,
                28.0,
                70,
                9.0,
                wind80,
                15.0,
                18.0,
                90,
                20000.0,
                0.0,
                10,
                20,
                1,
                2.0,
                1.25,
                List.of());
    }

    private String startNote() {
        var captor = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(events)
                .record(
                        eq(mission),
                        eq(MissionEventType.STATUS_CHANGED),
                        eq(operator),
                        eq(MissionStatus.READY),
                        eq(MissionStatus.IN_PROGRESS),
                        captor.capture());
        return captor.getValue();
    }

    @Test
    void noGoBlocksTheStartWhenTheAdministratorEnabledIt() {
        when(weather.assess(eq(21.0285), eq(105.8542), isNull(), isNull()))
                .thenReturn(verdict(FlightClearanceLevel.NO_GO, 14.2));
        when(weather.preflightBlockEnabled()).thenReturn(true);
        SystemException error =
                assertThrows(SystemException.class, () -> service(provider).start(7L, operator));
        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        assertEquals("MISSION_WEATHER_UNSAFE", error.getMessage());
        assertEquals(MissionStatus.READY, mission.getStatus());
        verifyNoInteractions(events);
    }

    @Test
    void noGoIsRecordedButDoesNotBlockByDefault() {
        when(weather.assess(anyDouble(), anyDouble(), isNull(), any()))
                .thenReturn(verdict(FlightClearanceLevel.NO_GO, 14.2));
        service(provider).start(7L, operator);
        assertEquals(MissionStatus.IN_PROGRESS, mission.getStatus());
        assertEquals("Mission started · weather NO_GO, wind 80 m 14.2 m/s", startNote());
    }

    @Test
    void goWithoutAFlightLevelReadingStillAnnotatesTheStart() {
        when(weather.assess(anyDouble(), anyDouble(), isNull(), any()))
                .thenReturn(verdict(FlightClearanceLevel.GO, null));
        when(weather.preflightBlockEnabled()).thenReturn(true);
        service(provider).start(7L, operator);
        assertEquals("Mission started · weather GO", startNote());
    }

    @Test
    void aWeatherFailureNeverBlocksTheStart() {
        when(weather.assess(anyDouble(), anyDouble(), any(), any()))
                .thenThrow(new IllegalStateException("down"));
        service(provider).start(7L, operator);
        assertEquals("Mission started", startNote());
    }

    @Test
    void missingSiteOrWeatherModuleSkipsTheCheck() {
        mission.setLongitude(null);
        service(provider).start(7L, operator);
        assertEquals("Mission started", startNote());
        verifyNoInteractions(weather);
    }

    @Test
    void theLegacyConstructorStartsWithoutWeather() {
        MissionLifecycleServiceImpl legacy =
                new MissionLifecycleServiceImpl(
                        mock(MissionRepository.class),
                        mock(ServiceOfferingRepository.class),
                        mock(AuditLogService.class),
                        mock(MissionEventRepository.class),
                        mock(QuotaService.class),
                        mock(MissionMediaRepository.class),
                        access,
                        events,
                        mock(MissionResourceService.class),
                        mock(MissionBillingService.class),
                        mock(MissionMapper.class));
        legacy.start(7L, operator);
        assertEquals("Mission started", startNote());
        when(provider.getIfAvailable()).thenReturn(null);
        mission.setStatus(MissionStatus.READY);
        clearInvocations(events);
        service(provider).start(7L, operator);
        assertEquals("Mission started", startNote());
    }
}
