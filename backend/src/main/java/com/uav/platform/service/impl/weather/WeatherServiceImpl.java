package com.uav.platform.service.impl.weather;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.dto.record.weather.HourlyWeatherSlot;
import com.uav.platform.dto.record.weather.SafetyThresholds;
import com.uav.platform.dto.record.weather.WeatherForecastData;
import com.uav.platform.dto.request.weather.WeatherProviderUpdateRequest;
import com.uav.platform.dto.response.weather.StationWeatherSummaryResponse;
import com.uav.platform.dto.response.weather.WeatherAssessmentResponse;
import com.uav.platform.dto.response.weather.WeatherProviderSettingsResponse;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.mission.ServiceOffering;
import com.uav.platform.entity.station.Station;
import com.uav.platform.entity.weather.WeatherObservationCache;
import com.uav.platform.entity.weather.WeatherProviderSettings;
import com.uav.platform.enums.audit.AuditAction;
import com.uav.platform.enums.station.StationStatus;
import com.uav.platform.enums.weather.WeatherProviderType;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.mission.ServiceOfferingRepository;
import com.uav.platform.repository.station.StationRepository;
import com.uav.platform.repository.weather.WeatherObservationCacheRepository;
import com.uav.platform.repository.weather.WeatherProviderSettingsRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.mission.MissionAccessService;
import com.uav.platform.service.settings.SystemConfigService;
import com.uav.platform.service.weather.WeatherService;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.function.Function;

/**
 * Open-Meteo hourly forecasts (wind at 10/80/120 m) plus the NOAA planetary Kp index, cached per
 * ~1.1 km grid cell and hour (cache-aside). When a source fails the last cached forecast is used,
 * otherwise the answer is UNAVAILABLE: weather never breaks a mission screen.
 */
@Slf4j
@Service
public class WeatherServiceImpl implements WeatherService {
    static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    static final DateTimeFormatter HOUR_KEY = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:00");
    static final String OPEN_METEO_URL =
            "https://api.open-meteo.com/v1/forecast?latitude=%s&longitude=%s"
                    + "&hourly=temperature_2m,relative_humidity_2m,precipitation,precipitation_probability,"
                    + "weather_code,cloud_cover,visibility,wind_speed_10m,wind_speed_80m,wind_speed_120m,"
                    + "wind_direction_10m,wind_gusts_10m&wind_speed_unit=ms&timezone=Asia%%2FHo_Chi_Minh"
                    + "&forecast_days=16";
    static final String NOAA_KP_URL =
            "https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json";
    static final String OPEN_WEATHER_URL =
            "https://api.openweathermap.org/data/2.5/weather?lat=%s&lon=%s&units=metric&appid=%s";
    static final Duration HTTP_TIMEOUT = Duration.ofSeconds(4);
    static final int SERIES_HOURS = 25;
    static final int MAX_STATIONS = 50;
    static final Duration CACHE_RETENTION = Duration.ofDays(2);
    private static final DateTimeFormatter NOAA_TIME =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm[:ss][.SSS]", Locale.ROOT);
    private static final TypeReference<List<HourlyWeatherSlot>> SLOTS = new TypeReference<>() {};

    private final WeatherObservationCacheRepository cache;
    private final WeatherProviderSettingsRepository providerSettings;
    private final SystemConfigService config;
    private final ServiceOfferingRepository services;
    private final MissionAccessService missionAccess;
    private final StationRepository stations;
    private final AuditLogService audit;
    private final WeatherCipherOperations cipher;
    private final FlightSafetyEvaluatorOperations evaluator;
    private final ObjectMapper json;
    private final HttpClient http;
    private final Clock clock;
    private final boolean remoteEnabled;

    @Autowired
    public WeatherServiceImpl(
            WeatherObservationCacheRepository cache,
            WeatherProviderSettingsRepository providerSettings,
            SystemConfigService config,
            ServiceOfferingRepository services,
            MissionAccessService missionAccess,
            StationRepository stations,
            AuditLogService audit,
            WeatherCipherOperations cipher,
            FlightSafetyEvaluatorOperations evaluator,
            @Value("${app.weather.remote-enabled:true}") boolean remoteEnabled) {
        this(
                cache,
                providerSettings,
                config,
                services,
                missionAccess,
                stations,
                audit,
                cipher,
                evaluator,
                new ObjectMapper(),
                HttpClient.newBuilder()
                        .connectTimeout(HTTP_TIMEOUT)
                        .followRedirects(HttpClient.Redirect.NORMAL)
                        .build(),
                Clock.system(ZONE),
                remoteEnabled);
    }

    /** Explicit collaborators (HTTP client, JSON mapper, clock) for tests. */
    public WeatherServiceImpl(
            WeatherObservationCacheRepository cache,
            WeatherProviderSettingsRepository providerSettings,
            SystemConfigService config,
            ServiceOfferingRepository services,
            MissionAccessService missionAccess,
            StationRepository stations,
            AuditLogService audit,
            WeatherCipherOperations cipher,
            FlightSafetyEvaluatorOperations evaluator,
            ObjectMapper json,
            HttpClient http,
            Clock clock,
            boolean remoteEnabled) {
        this.cache = cache;
        this.providerSettings = providerSettings;
        this.config = config;
        this.services = services;
        this.missionAccess = missionAccess;
        this.stations = stations;
        this.audit = audit;
        this.cipher = cipher;
        this.evaluator = evaluator;
        this.json = json;
        this.http = http;
        this.clock = clock;
        this.remoteEnabled = remoteEnabled;
    }

    @Override
    public WeatherAssessmentResponse forecast(double lat, double lng, String at, Long serviceId) {
        requireCoordinates(lat, lng);
        Double serviceMaxWind =
                serviceId == null
                        ? null
                        : services.findById(serviceId)
                                .map(ServiceOffering::getMaxWindMs)
                                .orElse(null);
        return assess(lat, lng, parseTime(at), serviceMaxWind);
    }

    /** Not transactional: a forecast fetched here is cached in its own write. */
    @Override
    public WeatherAssessmentResponse forMission(Long missionId, Authentication authentication) {
        Mission mission = missionAccess.accessible(missionId, authentication);
        Double serviceMaxWind = serviceMaxWind(mission);
        if (mission.getLatitude() == null || mission.getLongitude() == null) {
            return evaluator.unavailable(
                    thresholds(serviceMaxWind),
                    hourKey(now()),
                    false,
                    currentSettings().getProvider().name(),
                    "MISSION_LOCATION_MISSING");
        }
        return assess(
                mission.getLatitude().doubleValue(),
                mission.getLongitude().doubleValue(),
                mission.getStartTime(),
                serviceMaxWind);
    }

    @Override
    public List<StationWeatherSummaryResponse> stations() {
        return stations.findAll(Sort.by("code")).stream()
                .filter(s -> s.getStatus() == StationStatus.ACTIVE)
                .filter(s -> s.getLatitude() != null && s.getLongitude() != null)
                .limit(MAX_STATIONS)
                .map(this::stationSummary)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public WeatherProviderSettingsResponse providerSettings() {
        return toResponse(currentSettings());
    }

    @Override
    @Transactional
    public WeatherProviderSettingsResponse updateProvider(
            WeatherProviderUpdateRequest request, Authentication authentication) {
        WeatherProviderSettings settings =
                providerSettings.findById(1).orElseGet(WeatherProviderSettings::new);
        settings.setProvider(request.provider());
        settings.setCacheTtlMinutes(request.cacheTtlMinutes());
        settings.setEnforcePreflightBlock(request.enforcePreflightBlock());
        if (request.apiKey() != null) {
            String key = request.apiKey().trim();
            settings.setApiKeyCipher(key.isEmpty() ? null : cipher.encrypt(key));
        }
        settings.setUpdatedAt(LocalDateTime.now(clock));
        settings.setUpdatedBy(authentication.getName());
        WeatherProviderSettings saved = providerSettings.save(settings);
        audit.record(
                null,
                authentication.getName(),
                AuditAction.UPDATE,
                "WEATHER_PROVIDER",
                "1",
                saved.getProvider().name()
                        + " ttl="
                        + saved.getCacheTtlMinutes()
                        + " block="
                        + saved.isEnforcePreflightBlock()
                        + " key="
                        + (saved.getApiKeyCipher() != null));
        return toResponse(saved);
    }

    /**
     * Runs outside any caller transaction, so a failed cache write can never roll back the caller
     * (for example a mission start).
     */
    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public WeatherAssessmentResponse assess(
            double lat, double lng, LocalDateTime at, Double serviceMaxWindMs) {
        LocalDateTime now = now();
        LocalDateTime target =
                (at == null || at.isBefore(now) ? now : at).truncatedTo(ChronoUnit.HOURS);
        boolean forecast = target.isAfter(now.truncatedTo(ChronoUnit.HOURS));
        SafetyThresholds limits = thresholds(serviceMaxWindMs);
        WeatherProviderSettings settings = currentSettings();
        String provider = settings.getProvider().name();
        String hour = hourKey(target);
        WeatherForecastData data = load(lat, lng, hour, settings, !forecast);
        if (data == null)
            return evaluator.unavailable(
                    limits, hour, forecast, provider, "WEATHER_SOURCE_UNAVAILABLE");
        if (data.hours().isEmpty())
            return evaluator.unavailable(limits, hour, forecast, provider, "FORECAST_OUT_OF_RANGE");
        return evaluator.assessment(data, limits, forecast);
    }

    @Override
    public boolean preflightBlockEnabled() {
        return currentSettings().isEnforcePreflightBlock();
    }

    /** The service is read by id so a detached mission's lazy reference is never initialised. */
    private Double serviceMaxWind(Mission mission) {
        ServiceOffering service = mission.getService();
        if (service == null || service.getId() == null) return null;
        return services.findById(service.getId()).map(ServiceOffering::getMaxWindMs).orElse(null);
    }

    private StationWeatherSummaryResponse stationSummary(Station station) {
        return new StationWeatherSummaryResponse(
                station.getId(),
                station.getCode(),
                station.getName(),
                station.getLatitude(),
                station.getLongitude(),
                assess(station.getLatitude(), station.getLongitude(), null, null));
    }

    /** Fresh cache first, then the remote sources; a stale row is better than nothing when they fail. */
    private WeatherForecastData load(
            double lat,
            double lng,
            String hour,
            WeatherProviderSettings settings,
            boolean currentHour) {
        double gridLat = round2(lat);
        double gridLng = round2(lng);
        String provider = settings.getProvider().name();
        LocalDateTime now = LocalDateTime.now(clock);
        Optional<WeatherObservationCache> row =
                cache.findByGridLatAndGridLngAndTargetHourAndProvider(
                        gridLat, gridLng, hour, provider);
        Optional<WeatherForecastData> cached = row.flatMap(this::fromRow);
        if (cached.isPresent()
                && row.get()
                        .getFetchedAt()
                        .isAfter(now.minusMinutes(settings.getCacheTtlMinutes())))
            return cached.get();
        if (!remoteEnabled) return cached.orElse(null);
        try {
            List<HourlyWeatherSlot> hours = openMeteo(gridLat, gridLng, hour);
            if (hours.isEmpty()) return new WeatherForecastData(hours, null, provider, false);
            if (currentHour) hours = withLiveObservation(hours, gridLat, gridLng, settings);
            Double kp = kpIndex(hour);
            store(row.orElse(null), gridLat, gridLng, hour, provider, hours, kp, now);
            return new WeatherForecastData(hours, kp, provider, false);
        } catch (IOException | RuntimeException ex) {
            log.warn(
                    "Weather source unavailable for {},{} {}: {}",
                    gridLat,
                    gridLng,
                    hour,
                    ex.toString());
            return cached.orElse(null);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return cached.orElse(null);
        }
    }

    private Optional<WeatherForecastData> fromRow(WeatherObservationCache row) {
        try {
            List<HourlyWeatherSlot> hours = json.readValue(row.getPayloadJson(), SLOTS);
            return hours.isEmpty()
                    ? Optional.empty()
                    : Optional.of(
                            new WeatherForecastData(
                                    hours, row.getKpIndex(), row.getProvider(), true));
        } catch (IOException ex) {
            return Optional.empty();
        }
    }

    private void store(
            WeatherObservationCache existing,
            double gridLat,
            double gridLng,
            String hour,
            String provider,
            List<HourlyWeatherSlot> hours,
            Double kp,
            LocalDateTime fetchedAt)
            throws IOException {
        String payload = json.writeValueAsString(hours);
        try {
            WeatherObservationCache row =
                    existing != null
                            ? existing
                            : new WeatherObservationCache(
                                    gridLat, gridLng, hour, provider, null, null, null);
            row.setPayloadJson(payload);
            row.setKpIndex(kp);
            row.setFetchedAt(fetchedAt);
            cache.save(row);
            cache.deleteByFetchedAtBefore(fetchedAt.minus(CACHE_RETENTION));
        } catch (RuntimeException ex) {
            // A concurrent request may have cached the same cell first; the fresh data still
            // answers.
            log.debug("Weather cache write skipped: {}", ex.getClass().getSimpleName());
        }
    }

    /** The hourly series from {@code hour} on (up to 25 hours); empty when the hour is out of range. */
    List<HourlyWeatherSlot> openMeteo(double lat, double lng, String hour)
            throws IOException, InterruptedException {
        JsonNode hourly =
                json.readTree(get(String.format(Locale.ROOT, OPEN_METEO_URL, lat, lng)))
                        .path("hourly");
        JsonNode times = hourly.path("time");
        int start = -1;
        for (int i = 0; i < times.size(); i++) {
            if (times.get(i).asText().startsWith(hour.substring(0, 13))) {
                start = i;
                break;
            }
        }
        List<HourlyWeatherSlot> slots = new ArrayList<>();
        if (start < 0) return slots;
        for (int i = start; i < Math.min(times.size(), start + SERIES_HOURS); i++) {
            slots.add(
                    new HourlyWeatherSlot(
                            times.get(i).asText(),
                            number(hourly, "temperature_2m", i),
                            integer(hourly, "relative_humidity_2m", i),
                            number(hourly, "wind_speed_10m", i),
                            number(hourly, "wind_speed_80m", i),
                            number(hourly, "wind_speed_120m", i),
                            number(hourly, "wind_gusts_10m", i),
                            integer(hourly, "wind_direction_10m", i),
                            number(hourly, "visibility", i),
                            number(hourly, "precipitation", i),
                            integer(hourly, "precipitation_probability", i),
                            integer(hourly, "cloud_cover", i),
                            integer(hourly, "weather_code", i)));
        }
        return slots;
    }

    /** NOAA planetary Kp nearest to the hour (UTC); null when the feed cannot be read. */
    Double kpIndex(String hour) {
        try {
            JsonNode rows = json.readTree(get(NOAA_KP_URL));
            LocalDateTime targetUtc =
                    LocalDateTime.parse(hour, HOUR_KEY)
                            .atZone(ZONE)
                            .withZoneSameInstant(ZoneOffset.UTC)
                            .toLocalDateTime();
            Double best = null;
            long bestDistance = Long.MAX_VALUE;
            for (JsonNode row : rows) {
                String time = row.isArray() ? row.path(0).asText() : row.path("time_tag").asText();
                JsonNode kpNode = row.isArray() ? row.path(1) : row.path("kp");
                LocalDateTime tag;
                try {
                    tag = LocalDateTime.parse(time.replace('T', ' '), NOAA_TIME);
                } catch (DateTimeParseException ex) {
                    continue; // header row
                }
                double kp;
                try {
                    kp = Double.parseDouble(kpNode.asText());
                } catch (NumberFormatException ex) {
                    continue;
                }
                long distance = Math.abs(Duration.between(tag, targetUtc).toMinutes());
                if (distance < bestDistance) {
                    bestDistance = distance;
                    best = kp;
                }
            }
            return best;
        } catch (IOException | RuntimeException ex) {
            log.debug("NOAA Kp feed unavailable: {}", ex.toString());
            return null;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return null;
        }
    }

    /** With OpenWeatherMap and a key, the current hour uses its live observation where it has one. */
    private List<HourlyWeatherSlot> withLiveObservation(
            List<HourlyWeatherSlot> hours,
            double lat,
            double lng,
            WeatherProviderSettings settings) {
        if (settings.getProvider() != WeatherProviderType.OPENWEATHERMAP
                || settings.getApiKeyCipher() == null) return hours;
        try {
            String key =
                    URLEncoder.encode(
                            cipher.decrypt(settings.getApiKeyCipher()), StandardCharsets.UTF_8);
            JsonNode live =
                    json.readTree(get(String.format(Locale.ROOT, OPEN_WEATHER_URL, lat, lng, key)));
            HourlyWeatherSlot first = hours.getFirst();
            HourlyWeatherSlot merged =
                    new HourlyWeatherSlot(
                            first.time(),
                            orElse(live.path("main"), "temp", first.temperatureC()),
                            live.path("main").hasNonNull("humidity")
                                    ? live.path("main").path("humidity").asInt()
                                    : first.humidityPct(),
                            orElse(live.path("wind"), "speed", first.windSpeed10mMs()),
                            first.windSpeed80mMs(),
                            first.windSpeed120mMs(),
                            orElse(live.path("wind"), "gust", first.windGustsMs()),
                            live.path("wind").hasNonNull("deg")
                                    ? live.path("wind").path("deg").asInt()
                                    : first.windDirectionDeg(),
                            orElse(live, "visibility", first.visibilityMeters()),
                            first.precipitationMm(),
                            first.precipitationProbabilityPct(),
                            first.cloudCoverPct(),
                            first.weatherCode());
            List<HourlyWeatherSlot> result = new ArrayList<>(hours);
            result.set(0, merged);
            return result;
        } catch (IOException | RuntimeException ex) {
            log.warn("OpenWeatherMap observation unavailable: {}", ex.getClass().getSimpleName());
            return hours;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return hours;
        }
    }

    private String get(String url) throws IOException, InterruptedException {
        HttpRequest request =
                HttpRequest.newBuilder(URI.create(url))
                        .timeout(HTTP_TIMEOUT)
                        .header("Accept", "application/json")
                        .GET()
                        .build();
        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() / 100 != 2)
            throw new IOException(
                    "HTTP " + response.statusCode() + " from " + request.uri().getHost());
        return response.body();
    }

    SafetyThresholds thresholds(Double serviceMaxWindMs) {
        return new SafetyThresholds(
                setting("uav.safety.max_wind_speed_limit", 12.0),
                serviceMaxWindMs,
                setting("uav.safety.max_wind_gust_limit", 15.0),
                setting("uav.safety.min_visibility_meters", 3000),
                setting("uav.safety.max_precipitation_mm", 0.5),
                setting("uav.safety.max_kp_index", 5.0));
    }

    private double setting(String key, double fallback) {
        try {
            double value =
                    Double.parseDouble(config.valueOrDefault(key, String.valueOf(fallback)).trim());
            return Double.isFinite(value) ? value : fallback;
        } catch (RuntimeException ex) {
            return fallback;
        }
    }

    private WeatherProviderSettings currentSettings() {
        return providerSettings.findById(1).orElseGet(WeatherProviderSettings::new);
    }

    private WeatherProviderSettingsResponse toResponse(WeatherProviderSettings settings) {
        return new WeatherProviderSettingsResponse(
                settings.getProvider(),
                settings.getApiKeyCipher() != null,
                settings.getCacheTtlMinutes(),
                settings.isEnforcePreflightBlock(),
                settings.getUpdatedAt(),
                settings.getUpdatedBy());
    }

    private LocalDateTime now() {
        return LocalDateTime.now(clock.withZone(ZONE));
    }

    private LocalDateTime parseTime(String at) {
        if (at == null || at.isBlank()) return null;
        String value = at.trim();
        for (Function<String, LocalDateTime> parser :
                List.<Function<String, LocalDateTime>>of(
                        LocalDateTime::parse,
                        text ->
                                OffsetDateTime.parse(text)
                                        .atZoneSameInstant(ZONE)
                                        .toLocalDateTime())) {
            try {
                return parser.apply(value);
            } catch (DateTimeParseException ignored) {
                // try the next format
            }
        }
        throw SystemException.badRequest("WEATHER_INVALID_TIME", "WEATHER_INVALID_TIME");
    }

    private static void requireCoordinates(double lat, double lng) {
        if (!Double.isFinite(lat)
                || !Double.isFinite(lng)
                || lat < -90
                || lat > 90
                || lng < -180
                || lng > 180)
            throw SystemException.badRequest(
                    "WEATHER_INVALID_COORDINATES", "WEATHER_INVALID_COORDINATES");
    }

    private static String hourKey(LocalDateTime time) {
        return time.truncatedTo(ChronoUnit.HOURS).format(HOUR_KEY);
    }

    static double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private static Double number(JsonNode hourly, String field, int index) {
        JsonNode node = hourly.path(field).path(index);
        return node.isNumber() ? node.asDouble() : null;
    }

    private static Integer integer(JsonNode hourly, String field, int index) {
        JsonNode node = hourly.path(field).path(index);
        return node.isNumber() ? (int) Math.round(node.asDouble()) : null;
    }

    private static Double orElse(JsonNode parent, String field, Double fallback) {
        JsonNode node = parent.path(field);
        return node.isNumber() ? node.asDouble() : fallback;
    }
}
