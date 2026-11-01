package com.uav.platform.service.impl.weather;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.dto.record.weather.CachedKpFeed;
import com.uav.platform.dto.record.weather.CachedWeatherSeries;
import com.uav.platform.dto.record.weather.HourlyWeatherSlot;
import com.uav.platform.dto.record.weather.KpReading;
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
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
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
    static final int REMOTE_CONCURRENCY = 2;
    static final int MAX_ATTEMPTS = 3;
    static final Duration RETRY_BACKOFF = Duration.ofMillis(400);
    static final Duration MAX_RETRY_DELAY = Duration.ofSeconds(2);
    static final int SERIES_HOURS = 25;

    /** NOAA publishes Kp in 3-hour steps; one read per half hour is plenty. */
    static final Duration KP_TTL = Duration.ofMinutes(30);

    /** A Kp reading older than this is no longer used when the feed is down. */
    static final Duration KP_STALE_LIMIT = Duration.ofHours(6);

    /** Upper bound on cells kept in memory (a few hundred covers every station and map place). */
    static final int MAX_SERIES_CELLS = 500;

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
    private final Semaphore remoteSlots = new Semaphore(REMOTE_CONCURRENCY, true);

    /**
     * The whole Open-Meteo series per grid cell. One call answers every hour of the next 16 days, so
     * the home strip's five hours or a map of places cost one remote call per cell, not one per hour.
     */
    private final Map<String, CachedWeatherSeries> seriesCache = new ConcurrentHashMap<>();

    /** One lock per cell, so concurrent requests for the same cell share a single remote call. */
    private final Map<String, Object> cellLocks = new ConcurrentHashMap<>();

    private volatile CachedKpFeed kpFeed;

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
        if (request.cacheTtlMinutes() < 1 || request.cacheTtlMinutes() > 120) {
            throw SystemException.badRequest(
                            "Thời gian lưu đệm phải từ 1 đến 120 phút.",
                            "WEATHER_CACHE_TTL_INVALID")
                    .at("cacheTtlMinutes");
        }
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
            List<HourlyWeatherSlot> hours =
                    slice(series(gridLat, gridLng, settings.getCacheTtlMinutes()), hour);
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

    /**
     * The cell's full hourly series: from memory while younger than the cache TTL, otherwise fetched
     * once under the cell's lock (a second caller waiting on that lock reuses the result). A failed
     * fetch throws, and the caller falls back to its stale database row.
     */
    private List<HourlyWeatherSlot> series(double gridLat, double gridLng, int ttlMinutes)
            throws IOException, InterruptedException {
        String key = gridLat + "," + gridLng;
        CachedWeatherSeries hit = seriesCache.get(key);
        if (fresh(hit, ttlMinutes)) return hit.slots();
        synchronized (cellLocks.computeIfAbsent(key, k -> new Object())) {
            hit = seriesCache.get(key);
            if (fresh(hit, ttlMinutes)) return hit.slots();
            List<HourlyWeatherSlot> slots = openMeteoSeries(gridLat, gridLng);
            if (seriesCache.size() >= MAX_SERIES_CELLS) evictStaleSeries(ttlMinutes);
            seriesCache.put(key, new CachedWeatherSeries(LocalDateTime.now(clock), slots));
            return slots;
        }
    }

    private boolean fresh(CachedWeatherSeries hit, int ttlMinutes) {
        return hit != null
                && !hit.slots().isEmpty()
                && hit.fetchedAt().isAfter(LocalDateTime.now(clock).minusMinutes(ttlMinutes));
    }

    /** Drops expired cells; if every cell is still fresh, drops the oldest so memory stays bounded. */
    private void evictStaleSeries(int ttlMinutes) {
        LocalDateTime cutoff = LocalDateTime.now(clock).minusMinutes(ttlMinutes);
        seriesCache.entrySet().removeIf(entry -> !entry.getValue().fetchedAt().isAfter(cutoff));
        if (seriesCache.size() < MAX_SERIES_CELLS) return;
        seriesCache.entrySet().stream()
                .min(
                        Map.Entry.comparingByValue(
                                Comparator.comparing(CachedWeatherSeries::fetchedAt)))
                .ifPresent(oldest -> seriesCache.remove(oldest.getKey()));
    }

    /** {@code hour} and the following hours (up to 25); empty when the hour is outside the series. */
    public static List<HourlyWeatherSlot> slice(List<HourlyWeatherSlot> series, String hour) {
        String prefix = hour.substring(0, 13);
        for (int i = 0; i < series.size(); i++) {
            String time = series.get(i).time();
            if (time != null && time.startsWith(prefix))
                return List.copyOf(series.subList(i, Math.min(series.size(), i + SERIES_HOURS)));
        }
        return List.of();
    }

    /** Every hourly slot Open-Meteo returns for the cell (16 days). */
    List<HourlyWeatherSlot> openMeteoSeries(double lat, double lng)
            throws IOException, InterruptedException {
        JsonNode hourly =
                json.readTree(get(String.format(Locale.ROOT, OPEN_METEO_URL, lat, lng)))
                        .path("hourly");
        JsonNode times = hourly.path("time");
        List<HourlyWeatherSlot> slots = new ArrayList<>(times.size());
        for (int i = 0; i < times.size(); i++) {
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

    /** NOAA planetary Kp nearest to the hour (UTC); null when no reading is available. */
    Double kpIndex(String hour) {
        List<KpReading> points = kpPoints();
        if (points == null || points.isEmpty()) return null;
        LocalDateTime targetUtc =
                LocalDateTime.parse(hour, HOUR_KEY)
                        .atZone(ZONE)
                        .withZoneSameInstant(ZoneOffset.UTC)
                        .toLocalDateTime();
        Double best = null;
        long bestDistance = Long.MAX_VALUE;
        for (KpReading point : points) {
            long distance = Math.abs(Duration.between(point.tagUtc(), targetUtc).toMinutes());
            if (distance < bestDistance) {
                bestDistance = distance;
                best = point.kp();
            }
        }
        return best;
    }

    /**
     * The Kp feed, read at most every {@link #KP_TTL}. When NOAA cannot be read the last reading is
     * used while younger than {@link #KP_STALE_LIMIT}; after that Kp is simply unknown (it is
     * optional in the assessment).
     */
    private List<KpReading> kpPoints() {
        LocalDateTime now = LocalDateTime.now(clock);
        CachedKpFeed feed = kpFeed;
        if (feed != null && feed.fetchedAt().isAfter(now.minus(KP_TTL))) return feed.readings();
        try {
            List<KpReading> points = parseKp(json.readTree(get(NOAA_KP_URL)));
            kpFeed = new CachedKpFeed(now, points);
            return points;
        } catch (IOException | RuntimeException ex) {
            log.debug("NOAA Kp feed unavailable: {}", ex.toString());
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        }
        return feed != null && feed.fetchedAt().isAfter(now.minus(KP_STALE_LIMIT))
                ? feed.readings()
                : null;
    }

    /** Both NOAA shapes (array rows with a header, or objects); unreadable rows are skipped. */
    private static List<KpReading> parseKp(JsonNode rows) {
        List<KpReading> points = new ArrayList<>();
        for (JsonNode row : rows) {
            String time = row.isArray() ? row.path(0).asText() : row.path("time_tag").asText();
            JsonNode kpNode = row.isArray() ? row.path(1) : row.path("kp");
            try {
                points.add(
                        new KpReading(
                                LocalDateTime.parse(time.replace('T', ' '), NOAA_TIME),
                                Double.parseDouble(kpNode.asText())));
            } catch (DateTimeParseException | NumberFormatException ex) {
                // header row or a missing value ("n/a")
            }
        }
        return List.copyOf(points);
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

    /**
     * One outbound call. At most {@link #REMOTE_CONCURRENCY} run at once, because Open-Meteo answers a
     * burst of full 16-day requests from one IP with HTTP 429 (a map with several places and the home
     * strip's hours fire together); a 429 is retried after a short pause or the server's Retry-After.
     */
    private String get(String url) throws IOException, InterruptedException {
        HttpRequest request =
                HttpRequest.newBuilder(URI.create(url))
                        .timeout(HTTP_TIMEOUT)
                        .header("Accept", "application/json")
                        .GET()
                        .build();
        if (!remoteSlots.tryAcquire(HTTP_TIMEOUT.toMillis() * 2, TimeUnit.MILLISECONDS))
            throw new IOException("Weather sources busy");
        try {
            for (int attempt = 1; ; attempt++) {
                HttpResponse<String> response =
                        http.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() == 429 && attempt < MAX_ATTEMPTS) {
                    Thread.sleep(retryDelay(response, attempt).toMillis());
                    continue;
                }
                if (response.statusCode() / 100 != 2)
                    throw new IOException(
                            "HTTP " + response.statusCode() + " from " + request.uri().getHost());
                return response.body();
            }
        } finally {
            remoteSlots.release();
        }
    }

    /** Retry-After in seconds when the server sends one (capped), else a growing short pause. */
    public static Duration retryDelay(HttpResponse<?> response, int attempt) {
        Duration fallback = RETRY_BACKOFF.multipliedBy(attempt);
        if (response.headers() == null) return fallback;
        return response.headers()
                .firstValue("Retry-After")
                .flatMap(
                        value -> {
                            try {
                                return Optional.of(
                                        Duration.ofSeconds(Long.parseLong(value.trim())));
                            } catch (NumberFormatException ex) {
                                return Optional.empty();
                            }
                        })
                .map(delay -> delay.compareTo(MAX_RETRY_DELAY) > 0 ? MAX_RETRY_DELAY : delay)
                .orElse(fallback);
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
