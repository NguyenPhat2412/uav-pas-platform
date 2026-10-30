package com.uav.platform.modules.weather.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.audit.enums.AuditAction;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.mission.entity.ServiceOffering;
import com.uav.platform.modules.mission.repository.ServiceOfferingRepository;
import com.uav.platform.modules.mission.service.MissionAccessService;
import com.uav.platform.modules.settings.service.SystemConfigService;
import com.uav.platform.modules.station.entity.Station;
import com.uav.platform.modules.station.enums.StationStatus;
import com.uav.platform.modules.station.repository.StationRepository;
import com.uav.platform.modules.weather.dto.record.HourlyWeatherSlot;
import com.uav.platform.modules.weather.dto.request.WeatherProviderUpdateRequest;
import com.uav.platform.modules.weather.dto.response.StationWeatherSummaryResponse;
import com.uav.platform.modules.weather.dto.response.WeatherAssessmentResponse;
import com.uav.platform.modules.weather.dto.response.WeatherProviderSettingsResponse;
import com.uav.platform.modules.weather.entity.WeatherObservationCache;
import com.uav.platform.modules.weather.entity.WeatherProviderSettings;
import com.uav.platform.modules.weather.enums.FlightClearanceLevel;
import com.uav.platform.modules.weather.enums.WeatherProviderType;
import com.uav.platform.modules.weather.repository.WeatherObservationCacheRepository;
import com.uav.platform.modules.weather.repository.WeatherProviderSettingsRepository;
import com.uav.platform.modules.weather.service.impl.FlightSafetyEvaluatorOperations;
import com.uav.platform.modules.weather.service.impl.WeatherCipherOperations;
import com.uav.platform.modules.weather.service.impl.WeatherServiceImpl;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

class WeatherServiceImplTest {
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    /** 2026-10-31 08:15 in Hanoi. */
    private static final Clock CLOCK =
            Clock.fixed(LocalDateTime.of(2026, 10, 31, 8, 15).atZone(ZONE).toInstant(), ZONE);

    private final ObjectMapper json = new ObjectMapper();
    private WeatherObservationCacheRepository cache;
    private WeatherProviderSettingsRepository providerSettings;
    private SystemConfigService config;
    private ServiceOfferingRepository services;
    private MissionAccessService access;
    private StationRepository stations;
    private AuditLogService audit;
    private WeatherCipherOperations cipher;
    private HttpClient http;
    private final Map<String, Object> responses = new java.util.HashMap<>();
    private final AtomicInteger calls = new AtomicInteger();
    private final Authentication admin =
            new UsernamePasswordAuthenticationToken("admin", "n/a", List.of());

    @BeforeEach
    void setUp() throws Exception {
        cache = mock(WeatherObservationCacheRepository.class);
        providerSettings = mock(WeatherProviderSettingsRepository.class);
        config = mock(SystemConfigService.class);
        services = mock(ServiceOfferingRepository.class);
        access = mock(MissionAccessService.class);
        stations = mock(StationRepository.class);
        audit = mock(AuditLogService.class);
        cipher = new WeatherCipherOperations("weather-service-test-secret-32-bytes");
        http = mock(HttpClient.class);
        when(config.valueOrDefault(anyString(), anyString()))
                .thenAnswer(call -> call.getArgument(1));
        when(providerSettings.findById(1)).thenReturn(Optional.empty());
        when(providerSettings.save(any())).thenAnswer(call -> call.getArgument(0));
        when(cache.findByGridLatAndGridLngAndTargetHourAndProvider(
                        anyDouble(), anyDouble(), anyString(), anyString()))
                .thenReturn(Optional.empty());
        responses.put(
                "api.open-meteo.com", openMeteo(LocalDateTime.of(2026, 10, 31, 0, 0), 48, 3.0));
        responses.put(
                "services.swpc.noaa.gov",
                "[[\"time_tag\",\"kp\",\"observed\",\"noaa_scale\"],"
                        + "[\"2026-10-30 21:00:00\",\"6.00\",\"observed\",null],"
                        + "[\"2026-10-31 00:00:00\",\"2.33\",\"predicted\",null],"
                        + "[\"2026-10-31 03:00:00\",\"n/a\",\"predicted\",null]]");
        when(http.send(any(HttpRequest.class), any()))
                .thenAnswer(
                        call -> {
                            calls.incrementAndGet();
                            HttpRequest request = call.getArgument(0);
                            Object answer = responses.get(request.uri().getHost());
                            if (answer instanceof IOException failure) throw failure;
                            if (answer instanceof InterruptedException interrupted)
                                throw interrupted;
                            @SuppressWarnings("unchecked")
                            HttpResponse<String> response = mock(HttpResponse.class);
                            if (answer instanceof Integer status) {
                                when(response.statusCode()).thenReturn(status);
                            } else {
                                when(response.statusCode()).thenReturn(200);
                                when(response.body()).thenReturn((String) answer);
                            }
                            return response;
                        });
    }

    private WeatherServiceImpl service(boolean remote) {
        return new WeatherServiceImpl(
                cache,
                providerSettings,
                config,
                services,
                access,
                stations,
                audit,
                cipher,
                new FlightSafetyEvaluatorOperations(),
                json,
                http,
                CLOCK,
                remote);
    }

    /** Hourly series from {@code start}; hour 11 is stormy, every other hour has {@code wind} m/s. */
    static String openMeteo(LocalDateTime start, int hours, double wind) {
        StringBuilder time = new StringBuilder(),
                temp = new StringBuilder(),
                speed = new StringBuilder(),
                speed80 = new StringBuilder(),
                gust = new StringBuilder(),
                list = new StringBuilder();
        for (int i = 0; i < hours; i++) {
            String sep = i == 0 ? "" : ",";
            LocalDateTime at = start.plusHours(i);
            double w = at.getHour() == 11 ? 20.0 : wind;
            time.append(sep).append('"').append(at.toString(), 0, 16).append('"');
            temp.append(sep).append(28.5);
            speed.append(sep).append(w);
            speed80.append(sep).append(w + 1);
            gust.append(sep).append(w + 2);
            list.append(sep).append(i == 1 ? "null" : "10");
        }
        return "{\"hourly\":{\"time\":["
                + time
                + "],\"temperature_2m\":["
                + temp
                + "],\"relative_humidity_2m\":["
                + list
                + "],\"wind_speed_10m\":["
                + speed
                + "],\"wind_speed_80m\":["
                + speed80
                + "],\"wind_speed_120m\":["
                + speed80
                + "],\"wind_gusts_10m\":["
                + gust
                + "],\"wind_direction_10m\":["
                + list
                + "],\"visibility\":["
                + list.toString().replace("10", "24000")
                + "],\"precipitation\":["
                + temp.toString().replace("28.5", "0.0")
                + "],\"precipitation_probability\":["
                + list
                + "],\"cloud_cover\":["
                + list
                + "],\"weather_code\":["
                + list
                + "]}}";
    }

    private WeatherObservationCache row(LocalDateTime fetchedAt, double wind) throws Exception {
        List<HourlyWeatherSlot> hours =
                List.of(
                        new HourlyWeatherSlot(
                                "2026-10-31T08:00",
                                27.0,
                                70,
                                wind,
                                wind,
                                wind,
                                wind + 1,
                                90,
                                20000.0,
                                0.0,
                                0,
                                10,
                                1));
        return new WeatherObservationCache(
                21.03,
                105.85,
                "2026-10-31T08:00",
                "OPEN_METEO",
                json.writeValueAsString(hours),
                1.0,
                fetchedAt);
    }

    @Test
    void fetchesForecastAndKpThenCachesThem() {
        WeatherAssessmentResponse result = service(true).assess(21.0285, 105.8542, null, null);
        assertEquals(FlightClearanceLevel.GO, result.clearance());
        assertEquals("2026-10-31T08:00", result.evaluatedTime());
        assertFalse(result.forecast());
        assertFalse(result.fromCache());
        assertEquals(2.33, result.kpIndex());
        assertEquals(4.0, result.windSpeed80mMs());
        assertEquals(3, result.recommendedWindows().size());
        assertTrue(
                result.recommendedWindows().stream()
                        .noneMatch(w -> w.startTime().endsWith("T11:00")));
        ArgumentCaptor<WeatherObservationCache> saved =
                ArgumentCaptor.forClass(WeatherObservationCache.class);
        verify(cache).save(saved.capture());
        assertEquals(21.03, saved.getValue().getGridLat());
        assertEquals(105.85, saved.getValue().getGridLng());
        assertEquals("2026-10-31T08:00", saved.getValue().getTargetHour());
        assertEquals("OPEN_METEO", saved.getValue().getProvider());
        verify(cache).deleteByFetchedAtBefore(LocalDateTime.of(2026, 10, 29, 8, 15));
    }

    @Test
    void aFreshCacheRowAnswersWithoutCallingOut() throws Exception {
        when(cache.findByGridLatAndGridLngAndTargetHourAndProvider(
                        21.03, 105.85, "2026-10-31T08:00", "OPEN_METEO"))
                .thenReturn(Optional.of(row(LocalDateTime.of(2026, 10, 31, 8, 0), 2.0)));
        WeatherAssessmentResponse result = service(true).assess(21.0285, 105.8542, null, null);
        assertTrue(result.fromCache());
        assertEquals(1.0, result.kpIndex());
        assertEquals(0, calls.get());
    }

    @Test
    void aStaleRowIsUsedWhenTheSourceFails() throws Exception {
        when(cache.findByGridLatAndGridLngAndTargetHourAndProvider(
                        anyDouble(), anyDouble(), anyString(), anyString()))
                .thenReturn(Optional.of(row(LocalDateTime.of(2026, 10, 31, 6, 0), 13.0)));
        responses.put("api.open-meteo.com", new IOException("timeout"));
        WeatherAssessmentResponse result = service(true).assess(21.0285, 105.8542, null, null);
        assertTrue(result.fromCache());
        assertEquals(FlightClearanceLevel.NO_GO, result.clearance());
    }

    @Test
    void staleRowIsRefreshedWhenTheSourceAnswers() throws Exception {
        WeatherObservationCache stale = row(LocalDateTime.of(2026, 10, 31, 6, 0), 13.0);
        when(cache.findByGridLatAndGridLngAndTargetHourAndProvider(
                        anyDouble(), anyDouble(), anyString(), anyString()))
                .thenReturn(Optional.of(stale));
        WeatherAssessmentResponse result = service(true).assess(21.0285, 105.8542, null, null);
        assertFalse(result.fromCache());
        verify(cache).save(stale);
        assertEquals(LocalDateTime.of(2026, 10, 31, 8, 15), stale.getFetchedAt());
    }

    @Test
    void withoutCacheOrSourceTheAnswerIsUnavailableNotAnError() {
        responses.put("api.open-meteo.com", new IOException("down"));
        WeatherAssessmentResponse result = service(true).assess(21.0, 105.8, null, 9.0);
        assertEquals(FlightClearanceLevel.UNAVAILABLE, result.clearance());
        assertEquals(List.of("WEATHER_SOURCE_UNAVAILABLE"), result.reasonCodes());
        assertEquals(9.0, result.effectiveMaxWindMs());
    }

    @Test
    void anHttpErrorStatusCountsAsAFailedSource() {
        responses.put("api.open-meteo.com", 503);
        assertEquals(
                FlightClearanceLevel.UNAVAILABLE,
                service(true).assess(21.0, 105.8, null, null).clearance());
    }

    @Test
    void anInterruptedFetchFallsBackAndKeepsTheFlag() {
        responses.put("api.open-meteo.com", new InterruptedException("stop"));
        assertEquals(
                FlightClearanceLevel.UNAVAILABLE,
                service(true).assess(21.0, 105.8, null, null).clearance());
        assertTrue(Thread.interrupted());
    }

    @Test
    void anHourOutsideTheForecastIsOutOfRange() {
        WeatherAssessmentResponse result =
                service(true).assess(21.0, 105.8, LocalDateTime.of(2026, 12, 25, 9, 0), null);
        assertEquals(List.of("FORECAST_OUT_OF_RANGE"), result.reasonCodes());
        assertTrue(result.forecast());
        verify(cache, never()).save(any());
    }

    @Test
    void aFutureHourIsAForecastAndAPastOneMeansNow() {
        WeatherAssessmentResponse future =
                service(true).assess(21.0, 105.8, LocalDateTime.of(2026, 10, 31, 14, 40), null);
        assertTrue(future.forecast());
        assertEquals("2026-10-31T14:00", future.evaluatedTime());
        WeatherAssessmentResponse past =
                service(true).assess(21.0, 105.8, LocalDateTime.of(2026, 10, 30, 9, 0), null);
        assertFalse(past.forecast());
        assertEquals("2026-10-31T08:00", past.evaluatedTime());
    }

    @Test
    void remoteSourcesCanBeSwitchedOff() throws Exception {
        assertEquals(
                FlightClearanceLevel.UNAVAILABLE,
                service(false).assess(21.0, 105.8, null, null).clearance());
        when(cache.findByGridLatAndGridLngAndTargetHourAndProvider(
                        anyDouble(), anyDouble(), anyString(), anyString()))
                .thenReturn(Optional.of(row(LocalDateTime.of(2026, 10, 30, 6, 0), 2.0)));
        assertTrue(service(false).assess(21.0, 105.8, null, null).fromCache());
        assertEquals(0, calls.get());
    }

    @Test
    void aCorruptCacheRowIsIgnored() throws Exception {
        WeatherObservationCache corrupt = row(LocalDateTime.of(2026, 10, 31, 8, 10), 2.0);
        corrupt.setPayloadJson("{broken");
        when(cache.findByGridLatAndGridLngAndTargetHourAndProvider(
                        anyDouble(), anyDouble(), anyString(), anyString()))
                .thenReturn(Optional.of(corrupt));
        assertFalse(service(true).assess(21.0, 105.8, null, null).fromCache());
        corrupt.setPayloadJson("[]");
        assertFalse(service(true).assess(21.0, 105.8, null, null).fromCache());
    }

    @Test
    void aFailedCacheWriteStillReturnsTheFreshForecast() {
        when(cache.save(any())).thenThrow(new IllegalStateException("duplicate cell"));
        WeatherAssessmentResponse result = service(true).assess(21.0, 105.8, null, null);
        assertEquals(FlightClearanceLevel.GO, result.clearance());
        assertFalse(result.fromCache());
    }

    @Test
    void kpIsOptionalAndReadsBothFeedShapes() {
        responses.put("services.swpc.noaa.gov", new IOException("noaa down"));
        assertNull(service(true).assess(21.0, 105.8, null, null).kpIndex());
        responses.put(
                "services.swpc.noaa.gov",
                "[{\"time_tag\":\"2026-10-31T00:00:00\",\"kp\":4.67},{\"time_tag\":\"x\",\"kp\":9}]");
        assertEquals(4.67, service(true).assess(21.0, 105.8, null, null).kpIndex());
        responses.put("services.swpc.noaa.gov", new InterruptedException("stop"));
        assertNull(service(true).assess(21.0, 105.8, null, null).kpIndex());
        assertTrue(Thread.interrupted());
    }

    @Test
    void openWeatherMapLiveObservationReplacesTheCurrentHour() {
        WeatherProviderSettings settings = new WeatherProviderSettings();
        settings.setProvider(WeatherProviderType.OPENWEATHERMAP);
        settings.setApiKeyCipher(cipher.encrypt("owm-key"));
        when(providerSettings.findById(1)).thenReturn(Optional.of(settings));
        responses.put(
                "api.openweathermap.org",
                "{\"main\":{\"temp\":31.0,\"humidity\":55},\"wind\":{\"speed\":14.0,\"gust\":18.0,\"deg\":200},\"visibility\":9000}");
        WeatherAssessmentResponse result = service(true).assess(21.0, 105.8, null, null);
        assertEquals("OPENWEATHERMAP", result.provider());
        assertEquals(14.0, result.windSpeed10mMs());
        assertEquals(55, result.humidityPct());
        assertEquals(200, result.windDirectionDeg());
        assertEquals(FlightClearanceLevel.NO_GO, result.clearance());

        responses.put("api.openweathermap.org", "{\"main\":{},\"wind\":{}}");
        WeatherAssessmentResponse partial = service(true).assess(21.0, 105.8, null, null);
        assertEquals(3.0, partial.windSpeed10mMs());

        responses.put("api.openweathermap.org", new IOException("owm down"));
        assertEquals(3.0, service(true).assess(21.0, 105.8, null, null).windSpeed10mMs());
        responses.put("api.openweathermap.org", new InterruptedException("stop"));
        assertEquals(3.0, service(true).assess(21.0, 105.8, null, null).windSpeed10mMs());
        assertTrue(Thread.interrupted());

        settings.setApiKeyCipher(null);
        assertEquals(3.0, service(true).assess(21.0, 105.8, null, null).windSpeed10mMs());
    }

    @Test
    void forecastValidatesCoordinatesAndTime() {
        WeatherServiceImpl weather = service(false);
        for (double[] bad :
                new double[][] {
                    {91, 0},
                    {-91, 0},
                    {0, 181},
                    {0, -181},
                    {Double.NaN, 0},
                    {0, Double.POSITIVE_INFINITY}
                }) {
            SystemException error =
                    assertThrows(
                            SystemException.class,
                            () -> weather.forecast(bad[0], bad[1], null, null));
            assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        }
        SystemException time =
                assertThrows(
                        SystemException.class, () -> weather.forecast(21, 105, "tomorrow", null));
        assertEquals(HttpStatus.BAD_REQUEST, time.getStatus());
        assertEquals(
                "2026-10-31T14:00",
                service(true).forecast(21, 105, "2026-10-31T14:30", null).evaluatedTime());
        assertEquals(
                "2026-10-31T14:00",
                service(true).forecast(21, 105, "2026-10-31T07:30:00Z", null).evaluatedTime());
        assertEquals(
                "2026-10-31T08:00", service(true).forecast(21, 105, "  ", null).evaluatedTime());
    }

    @Test
    void aBookedServiceTightensTheWindLimit() {
        ServiceOffering offering = mock(ServiceOffering.class);
        when(offering.getMaxWindMs()).thenReturn(5.0);
        when(services.findById(7L)).thenReturn(Optional.of(offering));
        WeatherAssessmentResponse result = service(true).forecast(21, 105, null, 7L);
        assertEquals(5.0, result.effectiveMaxWindMs());
        assertEquals(FlightClearanceLevel.CAUTION, result.clearance());
        when(services.findById(8L)).thenReturn(Optional.empty());
        assertEquals(12.0, service(true).forecast(21, 105, null, 8L).effectiveMaxWindMs());
    }

    @Test
    void missionWeatherUsesItsSiteStartAndService() {
        ServiceOffering offering = mock(ServiceOffering.class);
        when(offering.getId()).thenReturn(3L);
        when(offering.getMaxWindMs()).thenReturn(4.0);
        when(services.findById(3L)).thenReturn(Optional.of(offering));
        Mission mission = new Mission();
        mission.setLatitude(new BigDecimal("21.0285"));
        mission.setLongitude(new BigDecimal("105.8542"));
        mission.setStartTime(LocalDateTime.of(2026, 10, 31, 15, 0));
        mission.setService(offering);
        when(access.accessible(42L, admin)).thenReturn(mission);
        WeatherAssessmentResponse result = service(true).forMission(42L, admin);
        assertEquals("2026-10-31T15:00", result.evaluatedTime());
        assertEquals(4.0, result.effectiveMaxWindMs());

        mission.setService(null);
        assertEquals(12.0, service(true).forMission(42L, admin).effectiveMaxWindMs());
        mission.setService(mock(ServiceOffering.class));
        assertEquals(12.0, service(true).forMission(42L, admin).effectiveMaxWindMs());

        mission.setLongitude(null);
        WeatherAssessmentResponse missing = service(true).forMission(42L, admin);
        assertEquals(List.of("MISSION_LOCATION_MISSING"), missing.reasonCodes());
        mission.setLongitude(BigDecimal.ONE);
        mission.setLatitude(null);
        assertEquals(
                FlightClearanceLevel.UNAVAILABLE, service(true).forMission(42L, admin).clearance());
    }

    @Test
    void stationsListActiveStationsWithCoordinates() {
        List<Station> all = new ArrayList<>();
        all.add(station(1L, "HN-01", StationStatus.ACTIVE, 21.0, 105.8));
        all.add(station(2L, "HN-02", StationStatus.INACTIVE, 21.1, 105.9));
        all.add(station(3L, "HN-03", StationStatus.ACTIVE, null, 105.9));
        all.add(station(4L, "HN-04", StationStatus.ACTIVE, 21.2, null));
        when(stations.findAll(any(Sort.class))).thenReturn(all);
        List<StationWeatherSummaryResponse> result = service(true).stations();
        assertEquals(1, result.size());
        assertEquals("HN-01", result.getFirst().code());
        assertEquals(1L, result.getFirst().stationId());
        assertEquals(FlightClearanceLevel.GO, result.getFirst().assessment().clearance());
    }

    private static Station station(
            Long id, String code, StationStatus status, Double lat, Double lng) {
        Station station = new Station();
        station.setId(id);
        station.setCode(code);
        station.setName("Station " + code);
        station.setStatus(status);
        station.setLatitude(lat);
        station.setLongitude(lng);
        return station;
    }

    @Test
    void providerSettingsDefaultToOpenMeteoWithoutAKey() {
        WeatherProviderSettingsResponse settings = service(false).providerSettings();
        assertEquals(WeatherProviderType.OPEN_METEO, settings.provider());
        assertFalse(settings.apiKeyConfigured());
        assertEquals(30, settings.cacheTtlMinutes());
        assertFalse(settings.enforcePreflightBlock());
        assertFalse(service(false).preflightBlockEnabled());
    }

    @Test
    void updatingTheProviderSealsTheKeyAndNeverReturnsIt() throws Exception {
        WeatherProviderSettingsResponse saved =
                service(false)
                        .updateProvider(
                                new WeatherProviderUpdateRequest(
                                        WeatherProviderType.OPENWEATHERMAP,
                                        "  owm-secret  ",
                                        15,
                                        true),
                                admin);
        ArgumentCaptor<WeatherProviderSettings> captor =
                ArgumentCaptor.forClass(WeatherProviderSettings.class);
        verify(providerSettings).save(captor.capture());
        WeatherProviderSettings stored = captor.getValue();
        assertEquals("owm-secret", cipher.decrypt(stored.getApiKeyCipher()));
        assertTrue(saved.apiKeyConfigured());
        assertEquals(15, saved.cacheTtlMinutes());
        assertTrue(saved.enforcePreflightBlock());
        assertEquals("admin", saved.updatedBy());
        assertFalse(saved.toString().contains(stored.getApiKeyCipher()));
        assertFalse(saved.toString().contains("owm-secret"));
        verify(audit)
                .record(
                        isNull(),
                        eq("admin"),
                        eq(AuditAction.UPDATE),
                        eq("WEATHER_PROVIDER"),
                        eq("1"),
                        contains("key=true"));

        when(providerSettings.findById(1)).thenReturn(Optional.of(stored));
        String sealed = stored.getApiKeyCipher();
        service(false)
                .updateProvider(
                        new WeatherProviderUpdateRequest(
                                WeatherProviderType.OPENWEATHERMAP, null, 20, true),
                        admin);
        assertEquals(sealed, stored.getApiKeyCipher());
        assertTrue(service(false).preflightBlockEnabled());
        WeatherProviderSettingsResponse cleared =
                service(false)
                        .updateProvider(
                                new WeatherProviderUpdateRequest(
                                        WeatherProviderType.OPEN_METEO, "", 20, false),
                                admin);
        assertNull(stored.getApiKeyCipher());
        assertFalse(cleared.apiKeyConfigured());
    }

    @Test
    void invalidThresholdSettingsFallBackToDefaults() {
        when(config.valueOrDefault(eq("uav.safety.max_wind_speed_limit"), anyString()))
                .thenReturn("windy");
        when(config.valueOrDefault(eq("uav.safety.max_wind_gust_limit"), anyString()))
                .thenReturn("NaN");
        WeatherAssessmentResponse result = service(false).assess(21.0, 105.8, null, null);
        assertEquals(12.0, result.effectiveMaxWindMs());
        when(config.valueOrDefault(eq("uav.safety.max_wind_speed_limit"), anyString()))
                .thenReturn(" 8.5 ");
        assertEquals(8.5, service(false).assess(21.0, 105.8, null, null).effectiveMaxWindMs());
    }
}
