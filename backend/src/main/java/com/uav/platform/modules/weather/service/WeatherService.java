package com.uav.platform.modules.weather.service;

import com.uav.platform.modules.weather.dto.request.WeatherProviderUpdateRequest;
import com.uav.platform.modules.weather.dto.response.StationWeatherSummaryResponse;
import com.uav.platform.modules.weather.dto.response.WeatherAssessmentResponse;
import com.uav.platform.modules.weather.dto.response.WeatherProviderSettingsResponse;

import org.springframework.security.core.Authentication;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Low-altitude weather and take-off clearance. Lookups never fail because a weather source is
 * down: they fall back to the last cached forecast or answer {@code UNAVAILABLE}.
 */
public interface WeatherService {
    /** {@code at}: local ISO date-time (Asia/Ho_Chi_Minh), now when blank. */
    WeatherAssessmentResponse forecast(double lat, double lng, String at, Long serviceId);

    /** At the mission site and start time (now once it is due); enforces mission visibility. */
    WeatherAssessmentResponse forMission(Long missionId, Authentication authentication);

    List<StationWeatherSummaryResponse> stations();

    WeatherProviderSettingsResponse providerSettings();

    WeatherProviderSettingsResponse updateProvider(
            WeatherProviderUpdateRequest request, Authentication authentication);

    /** For other modules (mission start, alert center); {@code at} null means now. */
    WeatherAssessmentResponse assess(
            double lat, double lng, LocalDateTime at, Double serviceMaxWindMs);

    /** Whether a NO_GO assessment must stop a mission from starting. */
    boolean preflightBlockEnabled();
}
