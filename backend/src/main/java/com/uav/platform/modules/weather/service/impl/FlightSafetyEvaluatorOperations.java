package com.uav.platform.modules.weather.service.impl;

import com.uav.platform.modules.weather.dto.record.HourlyWeatherSlot;
import com.uav.platform.modules.weather.dto.record.SafetyThresholds;
import com.uav.platform.modules.weather.dto.record.SafetyVerdict;
import com.uav.platform.modules.weather.dto.record.WeatherForecastData;
import com.uav.platform.modules.weather.dto.response.RecommendedWindowResponse;
import com.uav.platform.modules.weather.dto.response.WeatherAssessmentResponse;
import com.uav.platform.modules.weather.enums.FlightClearanceLevel;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Deterministic take-off rules for small UAVs. Wind is judged at the higher of 10 m and 80 m (where
 * the aircraft flies) against the stricter of the system and service limits; a missing reading
 * never counts as a violation.
 */
@Component
public class FlightSafetyEvaluatorOperations {
    static final int RECOMMENDED_WINDOWS = 3;
    static final int SCAN_HOURS = 24;
    static final int DAY_START_HOUR = 6;
    static final int DAY_END_HOUR = 18;

    private static final int NO_GO_PENALTY = 35;
    private static final int CAUTION_PENALTY = 12;
    private static final int WIND_PENALTY = 20;
    private static final int NO_GO_CEILING = 39;
    private static final int CAUTION_CEILING = 79;

    public double effectiveWindLimit(SafetyThresholds thresholds) {
        Double service = thresholds.serviceMaxWindMs();
        return service != null && service > 0
                ? Math.min(thresholds.systemMaxWindMs(), service)
                : thresholds.systemMaxWindMs();
    }

    /** Stronger of the 10 m and 80 m winds; null when neither was reported. */
    public Double effectiveWind(HourlyWeatherSlot slot) {
        Double ground = slot.windSpeed10mMs();
        Double flight = slot.windSpeed80mMs();
        if (ground == null) return flight;
        if (flight == null) return ground;
        return Math.max(ground, flight);
    }

    public SafetyVerdict evaluate(HourlyWeatherSlot slot, Double kpIndex, SafetyThresholds limits) {
        List<String> noGo = new ArrayList<>();
        List<String> caution = new ArrayList<>();
        double windLimit = effectiveWindLimit(limits);
        Double wind = effectiveWind(slot);
        if (wind != null) {
            if (wind > windLimit) noGo.add("WIND_LIMIT_EXCEEDED");
            else if (wind >= 0.75 * windLimit) caution.add("WIND_NEAR_LIMIT");
        }
        Double gust = slot.windGustsMs();
        if (gust != null) {
            if (gust > limits.maxWindGustMs()) noGo.add("WIND_GUST_EXCEEDED");
            else if (gust >= 0.80 * limits.maxWindGustMs()) caution.add("WIND_GUST_HIGH");
        }
        if (slot.precipitationMm() != null && slot.precipitationMm() > limits.maxPrecipitationMm())
            noGo.add("PRECIPITATION_UNSAFE");
        if (slot.precipitationProbabilityPct() != null && slot.precipitationProbabilityPct() >= 50)
            caution.add("RAIN_PROBABILITY_HIGH");
        Double visibility = slot.visibilityMeters();
        if (visibility != null) {
            if (visibility < limits.minVisibilityMeters()) noGo.add("VISIBILITY_TOO_LOW");
            else if (visibility < limits.minVisibilityMeters() * 1.5)
                caution.add("VISIBILITY_MODERATE");
        }
        if (kpIndex != null) {
            if (kpIndex >= limits.maxKpIndex() + 1.0) noGo.add("GEOMAGNETIC_STORM");
            else if (kpIndex >= limits.maxKpIndex()) caution.add("KP_ELEVATED");
        }
        FlightClearanceLevel clearance =
                !noGo.isEmpty()
                        ? FlightClearanceLevel.NO_GO
                        : !caution.isEmpty()
                                ? FlightClearanceLevel.CAUTION
                                : FlightClearanceLevel.GO;
        double windShare = wind == null || windLimit <= 0 ? 0 : Math.min(1, wind / windLimit);
        int score =
                100
                        - NO_GO_PENALTY * noGo.size()
                        - CAUTION_PENALTY * caution.size()
                        - (int) Math.round(WIND_PENALTY * windShare);
        if (clearance == FlightClearanceLevel.NO_GO) score = Math.min(score, NO_GO_CEILING);
        if (clearance == FlightClearanceLevel.CAUTION) score = Math.min(score, CAUTION_CEILING);
        List<String> reasons = new ArrayList<>(noGo);
        reasons.addAll(caution);
        return new SafetyVerdict(
                clearance, Math.max(0, Math.min(100, score)), List.copyOf(reasons));
    }

    /**
     * Expected battery use relative to calm air: up to +25 % as wind approaches the limit, +8 % in
     * cold (&lt; 10 °C) or hot (&gt; 38 °C) air. Rounded to two decimals.
     */
    public double batteryDrainMultiplier(HourlyWeatherSlot slot, SafetyThresholds limits) {
        double windLimit = effectiveWindLimit(limits);
        Double wind = effectiveWind(slot);
        double ratio = wind == null || windLimit <= 0 ? 0 : Math.min(1, wind / windLimit);
        Double temperature = slot.temperatureC();
        double thermal = temperature != null && (temperature < 10 || temperature > 38) ? 0.08 : 0;
        return Math.round((1.0 + 0.25 * ratio * ratio + thermal) * 100.0) / 100.0;
    }

    /**
     * Up to three daytime (06:00–18:00) hours within the next 24 that are not NO_GO, best score
     * first and earlier hour on ties.
     */
    public List<RecommendedWindowResponse> recommendedWindows(
            List<HourlyWeatherSlot> hours, Double kpIndex, SafetyThresholds limits) {
        List<RecommendedWindowResponse> windows = new ArrayList<>();
        for (HourlyWeatherSlot slot : hours.stream().limit(SCAN_HOURS).toList()) {
            int hour = hourOfDay(slot.time());
            if (hour < DAY_START_HOUR || hour >= DAY_END_HOUR) continue;
            SafetyVerdict verdict = evaluate(slot, kpIndex, limits);
            if (verdict.clearance() == FlightClearanceLevel.NO_GO) continue;
            windows.add(
                    new RecommendedWindowResponse(
                            slot.time(),
                            verdict.clearance(),
                            slot.windSpeed80mMs(),
                            slot.windGustsMs(),
                            slot.precipitationProbabilityPct(),
                            verdict.safetyScore()));
        }
        return windows.stream()
                .sorted(
                        Comparator.comparingInt(RecommendedWindowResponse::safetyScore)
                                .reversed()
                                .thenComparing(RecommendedWindowResponse::startTime))
                .limit(RECOMMENDED_WINDOWS)
                .toList();
    }

    /** Full assessment of the first hour of {@code data}. */
    public WeatherAssessmentResponse assessment(
            WeatherForecastData data, SafetyThresholds limits, boolean forecast) {
        HourlyWeatherSlot slot = data.hours().getFirst();
        SafetyVerdict verdict = evaluate(slot, data.kpIndex(), limits);
        return new WeatherAssessmentResponse(
                verdict.clearance(),
                verdict.safetyScore(),
                verdict.reasonCodes(),
                effectiveWindLimit(limits),
                slot.time(),
                forecast,
                data.provider(),
                data.fromCache(),
                slot.temperatureC(),
                slot.humidityPct(),
                slot.windSpeed10mMs(),
                slot.windSpeed80mMs(),
                slot.windSpeed120mMs(),
                slot.windGustsMs(),
                slot.windDirectionDeg(),
                slot.visibilityMeters(),
                slot.precipitationMm(),
                slot.precipitationProbabilityPct(),
                slot.cloudCoverPct(),
                slot.weatherCode(),
                data.kpIndex(),
                batteryDrainMultiplier(slot, limits),
                recommendedWindows(data.hours(), data.kpIndex(), limits));
    }

    /** No data for that place and hour; {@code reason} explains why (e.g. WEATHER_SOURCE_UNAVAILABLE). */
    public WeatherAssessmentResponse unavailable(
            SafetyThresholds limits,
            String evaluatedTime,
            boolean forecast,
            String provider,
            String reason) {
        return new WeatherAssessmentResponse(
                FlightClearanceLevel.UNAVAILABLE,
                0,
                List.of(reason),
                effectiveWindLimit(limits),
                evaluatedTime,
                forecast,
                provider,
                false,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                1.0,
                List.of());
    }

    private static int hourOfDay(String time) {
        if (time == null || time.length() < 13) return -1;
        try {
            return Integer.parseInt(time.substring(11, 13));
        } catch (NumberFormatException ex) {
            return -1;
        }
    }
}
