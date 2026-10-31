package com.uav.platform.service.weather;

import static org.junit.jupiter.api.Assertions.*;

import com.uav.platform.dto.record.weather.HourlyWeatherSlot;
import com.uav.platform.dto.record.weather.SafetyThresholds;
import com.uav.platform.dto.record.weather.SafetyVerdict;
import com.uav.platform.dto.record.weather.WeatherForecastData;
import com.uav.platform.dto.response.weather.RecommendedWindowResponse;
import com.uav.platform.dto.response.weather.WeatherAssessmentResponse;
import com.uav.platform.enums.weather.FlightClearanceLevel;
import com.uav.platform.service.impl.weather.FlightSafetyEvaluatorOperations;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

class FlightSafetyEvaluatorOperationsTest {
    private static final SafetyThresholds LIMITS =
            new SafetyThresholds(12.0, null, 15.0, 3000, 0.5, 5.0);
    private final FlightSafetyEvaluatorOperations evaluator = new FlightSafetyEvaluatorOperations();

    static HourlyWeatherSlot calm(String time) {
        return new HourlyWeatherSlot(
                time, 28.0, 70, 2.0, 3.0, 4.0, 5.0, 90, 20000.0, 0.0, 10, 20, 1);
    }

    private static HourlyWeatherSlot slot(
            Double wind10,
            Double wind80,
            Double gust,
            Double visibility,
            Double rain,
            Integer rainPct,
            Double temp) {
        return new HourlyWeatherSlot(
                "2026-10-31T09:00",
                temp,
                60,
                wind10,
                wind80,
                9.0,
                gust,
                180,
                visibility,
                rain,
                rainPct,
                40,
                3);
    }

    @Test
    void calmAirIsGoWithAHighScore() {
        SafetyVerdict verdict = evaluator.evaluate(calm("2026-10-31T09:00"), 2.0, LIMITS);
        assertEquals(FlightClearanceLevel.GO, verdict.clearance());
        assertTrue(verdict.reasonCodes().isEmpty());
        assertEquals(95, verdict.safetyScore());
    }

    @Test
    void windAtFlightAltitudeBeyondTheSystemLimitIsNoGo() {
        SafetyVerdict verdict =
                evaluator.evaluate(slot(4.0, 12.5, 6.0, 20000.0, 0.0, 0, 25.0), null, LIMITS);
        assertEquals(FlightClearanceLevel.NO_GO, verdict.clearance());
        assertEquals(List.of("WIND_LIMIT_EXCEEDED"), verdict.reasonCodes());
        assertTrue(verdict.safetyScore() <= 39);
    }

    @Test
    void theStricterServiceWindLimitApplies() {
        SafetyThresholds strict = new SafetyThresholds(12.0, 8.0, 15.0, 3000, 0.5, 5.0);
        assertEquals(8.0, evaluator.effectiveWindLimit(strict));
        assertEquals(
                12.0,
                evaluator.effectiveWindLimit(
                        new SafetyThresholds(12.0, 0.0, 15.0, 3000, 0.5, 5.0)));
        assertEquals(
                12.0,
                evaluator.effectiveWindLimit(
                        new SafetyThresholds(12.0, 20.0, 15.0, 3000, 0.5, 5.0)));
        SafetyVerdict verdict =
                evaluator.evaluate(slot(9.0, 5.0, 6.0, 20000.0, 0.0, 0, 25.0), null, strict);
        assertEquals(List.of("WIND_LIMIT_EXCEEDED"), verdict.reasonCodes());
    }

    @Test
    void everyNoGoRuleIsReported() {
        SafetyVerdict verdict =
                evaluator.evaluate(slot(13.0, 14.0, 16.0, 1000.0, 2.0, 90, 25.0), 6.0, LIMITS);
        assertEquals(FlightClearanceLevel.NO_GO, verdict.clearance());
        assertEquals(
                List.of(
                        "WIND_LIMIT_EXCEEDED",
                        "WIND_GUST_EXCEEDED",
                        "PRECIPITATION_UNSAFE",
                        "VISIBILITY_TOO_LOW",
                        "GEOMAGNETIC_STORM",
                        "RAIN_PROBABILITY_HIGH"),
                verdict.reasonCodes());
        assertEquals(0, verdict.safetyScore());
    }

    @Test
    void everyCautionRuleIsReported() {
        SafetyVerdict verdict =
                evaluator.evaluate(slot(9.0, 8.0, 12.0, 4000.0, 0.1, 50, 25.0), 5.0, LIMITS);
        assertEquals(FlightClearanceLevel.CAUTION, verdict.clearance());
        assertEquals(
                List.of(
                        "WIND_NEAR_LIMIT",
                        "WIND_GUST_HIGH",
                        "RAIN_PROBABILITY_HIGH",
                        "VISIBILITY_MODERATE",
                        "KP_ELEVATED"),
                verdict.reasonCodes());
        assertTrue(verdict.safetyScore() <= 79);
    }

    @Test
    void missingReadingsNeverCountAsViolations() {
        HourlyWeatherSlot empty =
                new HourlyWeatherSlot(
                        "2026-10-31T09:00",
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
                        null);
        SafetyVerdict verdict = evaluator.evaluate(empty, null, LIMITS);
        assertEquals(FlightClearanceLevel.GO, verdict.clearance());
        assertEquals(100, verdict.safetyScore());
        assertNull(evaluator.effectiveWind(empty));
        assertEquals(1.0, evaluator.batteryDrainMultiplier(empty, LIMITS));
    }

    @Test
    void effectiveWindUsesTheStrongerOfGroundAndFlightLevel() {
        assertEquals(7.0, evaluator.effectiveWind(slot(7.0, null, null, null, null, null, null)));
        assertEquals(6.0, evaluator.effectiveWind(slot(null, 6.0, null, null, null, null, null)));
        assertEquals(9.0, evaluator.effectiveWind(slot(4.0, 9.0, null, null, null, null, null)));
    }

    @Test
    void batteryDrainGrowsWithWindAndExtremeTemperatures() {
        assertEquals(
                1.25,
                evaluator.batteryDrainMultiplier(
                        slot(12.0, 12.0, null, null, null, null, 25.0), LIMITS));
        assertEquals(
                1.25,
                evaluator.batteryDrainMultiplier(
                        slot(30.0, 30.0, null, null, null, null, 25.0), LIMITS));
        assertEquals(
                1.14,
                evaluator.batteryDrainMultiplier(
                                slot(6.0, 6.0, null, null, null, null, 25.0), LIMITS)
                        + 0.08,
                0.001);
        assertEquals(
                1.08,
                evaluator.batteryDrainMultiplier(
                        slot(0.0, 0.0, null, null, null, null, 5.0), LIMITS));
        assertEquals(
                1.08,
                evaluator.batteryDrainMultiplier(
                        slot(0.0, 0.0, null, null, null, null, 40.0), LIMITS));
        assertEquals(
                1.0,
                evaluator.batteryDrainMultiplier(
                        slot(0.0, 0.0, null, null, null, null, 10.0),
                        new SafetyThresholds(0, null, 15, 3000, 0.5, 5)));
    }

    @Test
    void recommendsTheThreeBestDaytimeHoursThatAreNotNoGo() {
        List<HourlyWeatherSlot> hours = new ArrayList<>();
        for (int h = 0; h < 30; h++) {
            String time =
                    String.format("2026-10-%02dT%02d:00", 31 + h / 24 - (h >= 24 ? 0 : 0), h % 24);
            double wind = h == 7 ? 1.0 : h == 9 ? 1.5 : h == 11 ? 14.0 : h == 15 ? 1.0 : 6.0;
            hours.add(
                    new HourlyWeatherSlot(
                            time, 28.0, 60, wind, wind, wind, 3.0, 90, 20000.0, 0.0, 0, 10, 1));
        }
        hours.add(
                new HourlyWeatherSlot(
                        "bad", 28.0, 60, 0.0, 0.0, 0.0, 0.0, 90, 20000.0, 0.0, 0, 10, 1));
        List<RecommendedWindowResponse> windows = evaluator.recommendedWindows(hours, 1.0, LIMITS);
        assertEquals(3, windows.size());
        assertEquals("2026-10-31T07:00", windows.get(0).startTime());
        assertEquals("2026-10-31T15:00", windows.get(1).startTime());
        assertEquals("2026-10-31T09:00", windows.get(2).startTime());
        assertTrue(windows.stream().noneMatch(w -> w.startTime().endsWith("T11:00")));
        assertTrue(windows.stream().noneMatch(w -> w.startTime().endsWith("T03:00")));
        assertEquals(FlightClearanceLevel.GO, windows.getFirst().clearance());
        assertTrue(
                evaluator
                        .recommendedWindows(
                                List.of(
                                        new HourlyWeatherSlot(
                                                null, null, null, null, null, null, null, null,
                                                null, null, null, null, null),
                                        new HourlyWeatherSlot(
                                                "2026-10-31TXX:00",
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
                                                null)),
                                null,
                                LIMITS)
                        .isEmpty());
    }

    @Test
    void assessmentDescribesTheFirstHour() {
        WeatherForecastData data =
                new WeatherForecastData(
                        List.of(calm("2026-10-31T09:00"), calm("2026-10-31T10:00")),
                        2.0,
                        "OPEN_METEO",
                        true);
        WeatherAssessmentResponse assessment = evaluator.assessment(data, LIMITS, true);
        assertEquals(FlightClearanceLevel.GO, assessment.clearance());
        assertEquals("2026-10-31T09:00", assessment.evaluatedTime());
        assertTrue(assessment.forecast());
        assertTrue(assessment.fromCache());
        assertEquals("OPEN_METEO", assessment.provider());
        assertEquals(12.0, assessment.effectiveMaxWindMs());
        assertEquals(3.0, assessment.windSpeed80mMs());
        assertEquals(2.0, assessment.kpIndex());
        assertEquals(2, assessment.recommendedWindows().size());
        assertTrue(assessment.batteryDrainMultiplier() > 1.0);
    }

    @Test
    void unavailableCarriesTheReasonAndNoReadings() {
        WeatherAssessmentResponse assessment =
                evaluator.unavailable(
                        LIMITS,
                        "2026-10-31T09:00",
                        false,
                        "OPEN_METEO",
                        "WEATHER_SOURCE_UNAVAILABLE");
        assertEquals(FlightClearanceLevel.UNAVAILABLE, assessment.clearance());
        assertEquals(List.of("WEATHER_SOURCE_UNAVAILABLE"), assessment.reasonCodes());
        assertNull(assessment.windSpeed10mMs());
        assertEquals(1.0, assessment.batteryDrainMultiplier());
        assertTrue(assessment.recommendedWindows().isEmpty());
    }
}
