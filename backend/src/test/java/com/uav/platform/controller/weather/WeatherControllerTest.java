package com.uav.platform.controller.weather;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.station.Station;
import com.uav.platform.enums.station.StationStatus;
import com.uav.platform.error.GlobalExceptionHandler;
import com.uav.platform.repository.mission.ServiceOfferingRepository;
import com.uav.platform.repository.station.StationRepository;
import com.uav.platform.repository.weather.WeatherObservationCacheRepository;
import com.uav.platform.repository.weather.WeatherProviderSettingsRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.impl.weather.FlightSafetyEvaluatorOperations;
import com.uav.platform.service.impl.weather.WeatherCipherOperations;
import com.uav.platform.service.impl.weather.WeatherServiceImpl;
import com.uav.platform.service.mission.MissionAccessService;
import com.uav.platform.service.settings.SystemConfigService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.net.http.HttpClient;
import java.time.Clock;
import java.util.List;
import java.util.Optional;

/** HTTP contract of the five weather endpoints, on the real service with remote sources switched off. */
class WeatherControllerTest {
    private final UsernamePasswordAuthenticationToken admin =
            new UsernamePasswordAuthenticationToken("admin", "n/a", List.of());
    private WeatherProviderSettingsRepository settings;
    private MissionAccessService access;
    private StationRepository stations;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        WeatherObservationCacheRepository cache = mock(WeatherObservationCacheRepository.class);
        settings = mock(WeatherProviderSettingsRepository.class);
        SystemConfigService config = mock(SystemConfigService.class);
        access = mock(MissionAccessService.class);
        stations = mock(StationRepository.class);
        when(config.valueOrDefault(anyString(), anyString()))
                .thenAnswer(call -> call.getArgument(1));
        when(settings.findById(1)).thenReturn(Optional.empty());
        when(settings.save(any())).thenAnswer(call -> call.getArgument(0));
        when(cache.findByGridLatAndGridLngAndTargetHourAndProvider(
                        anyDouble(), anyDouble(), anyString(), anyString()))
                .thenReturn(Optional.empty());
        WeatherServiceImpl service =
                new WeatherServiceImpl(
                        cache,
                        settings,
                        config,
                        mock(ServiceOfferingRepository.class),
                        access,
                        stations,
                        mock(AuditLogService.class),
                        new WeatherCipherOperations("controller-test-secret-of-32-bytes"),
                        new FlightSafetyEvaluatorOperations(),
                        new ObjectMapper(),
                        mock(HttpClient.class),
                        Clock.systemDefaultZone(),
                        false);
        mvc =
                MockMvcBuilders.standaloneSetup(new WeatherController(service))
                        .setControllerAdvice(new GlobalExceptionHandler())
                        .build();
    }

    @Test
    void forecastAnswersEvenWhenNoSourceIsReachable() throws Exception {
        mvc.perform(
                        get("/api/v1/weather/forecast")
                                .param("lat", "21.0285")
                                .param("lng", "105.8542")
                                .param("serviceId", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.clearance").value("UNAVAILABLE"))
                .andExpect(jsonPath("$.reasonCodes[0]").value("WEATHER_SOURCE_UNAVAILABLE"))
                .andExpect(jsonPath("$.effectiveMaxWindMs").value(12.0))
                .andExpect(jsonPath("$.recommendedWindows").isArray());
    }

    @Test
    void forecastRejectsInvalidCoordinatesAndTime() throws Exception {
        mvc.perform(get("/api/v1/weather/forecast").param("lat", "95").param("lng", "105"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/weather/forecast").param("lat", "21").param("lng", "-190"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/weather/forecast").param("lat", "north").param("lng", "105"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/weather/forecast").param("lng", "105"))
                .andExpect(status().isBadRequest());
        mvc.perform(
                        get("/api/v1/weather/forecast")
                                .param("lat", "21")
                                .param("lng", "105")
                                .param("at", "soon"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void missionWeatherUsesTheMissionSite() throws Exception {
        Mission mission = new Mission();
        mission.setLatitude(new BigDecimal("21.03"));
        mission.setLongitude(new BigDecimal("105.85"));
        when(access.accessible(eq(42L), any())).thenReturn(mission);
        mvc.perform(get("/api/v1/weather/missions/42").principal(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.clearance").value("UNAVAILABLE"));
        mvc.perform(get("/api/v1/weather/missions/abc").principal(admin))
                .andExpect(status().isBadRequest());
    }

    @Test
    void stationsListOnlyFlyableStations() throws Exception {
        Station station = new Station();
        station.setId(5L);
        station.setCode("HN-01");
        station.setName("Hà Nội");
        station.setStatus(StationStatus.ACTIVE);
        station.setLatitude(21.0);
        station.setLongitude(105.8);
        when(stations.findAll(any(Sort.class))).thenReturn(List.of(station));
        mvc.perform(get("/api/v1/weather/stations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].stationId").value(5))
                .andExpect(jsonPath("$[0].code").value("HN-01"))
                .andExpect(jsonPath("$[0].assessment.clearance").value("UNAVAILABLE"));
    }

    @Test
    void providerSettingsNeverExposeTheKey() throws Exception {
        mvc.perform(get("/api/v1/admin/weather/provider"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.provider").value("OPEN_METEO"))
                .andExpect(jsonPath("$.apiKeyConfigured").value(false))
                .andExpect(jsonPath("$.apiKeyCipher").doesNotExist());
        mvc.perform(
                        put("/api/v1/admin/weather/provider")
                                .principal(admin)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"provider\":\"OPENWEATHERMAP\",\"apiKey\":\"owm-123\",\"cacheTtlMinutes\":20,\"enforcePreflightBlock\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.provider").value("OPENWEATHERMAP"))
                .andExpect(jsonPath("$.apiKeyConfigured").value(true))
                .andExpect(jsonPath("$.enforcePreflightBlock").value(true))
                .andExpect(jsonPath("$.updatedBy").value("admin"))
                .andExpect(jsonPath("$.apiKey").doesNotExist())
                .andExpect(jsonPath("$.apiKeyCipher").doesNotExist());
    }

    @Test
    void providerUpdatesAreValidated() throws Exception {
        for (String body :
                List.of(
                        "{\"provider\":\"OPEN_METEO\",\"cacheTtlMinutes\":0,\"enforcePreflightBlock\":false}",
                        "{\"provider\":\"OPEN_METEO\",\"cacheTtlMinutes\":121,\"enforcePreflightBlock\":false}",
                        "{\"cacheTtlMinutes\":30,\"enforcePreflightBlock\":false}",
                        "{\"provider\":\"OPEN_METEO\",\"apiKey\":\""
                                + "k".repeat(257)
                                + "\",\"cacheTtlMinutes\":30,\"enforcePreflightBlock\":false}",
                        "{\"provider\":\"DARK_SKY\",\"cacheTtlMinutes\":30,\"enforcePreflightBlock\":false}")) {
            mvc.perform(
                            put("/api/v1/admin/weather/provider")
                                    .principal(admin)
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(body))
                    .andExpect(status().isBadRequest());
        }
        verify(settings, never()).save(any());
    }
}
