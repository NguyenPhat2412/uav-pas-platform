package com.uav.platform.controller.weather;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.request.weather.WeatherProviderUpdateRequest;
import com.uav.platform.dto.response.weather.StationWeatherSummaryResponse;
import com.uav.platform.dto.response.weather.WeatherAssessmentResponse;
import com.uav.platform.dto.response.weather.WeatherProviderSettingsResponse;
import com.uav.platform.service.weather.WeatherService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Low-altitude weather and take-off clearance; provider settings for administrators. */
@RestController
@RequiredArgsConstructor
public class WeatherController {
    private final WeatherService service;

    @GetMapping(ApiRoutes.Weather.BASE + ApiRoutes.Weather.FORECAST)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<WeatherAssessmentResponse> forecast(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(required = false) String at,
            @RequestParam(required = false) Long serviceId) {
        return ResponseEntity.ok(service.forecast(lat, lng, at, serviceId));
    }

    @GetMapping(ApiRoutes.Weather.BASE + ApiRoutes.Weather.BY_MISSION)
    @PreAuthorize(
            "@permissionService.has(authentication, 'MISSION_VIEW')"
                    + " or @permissionService.has(authentication, 'MISSION_VIEW_ALL')")
    public ResponseEntity<WeatherAssessmentResponse> mission(
            @PathVariable Long missionId, Authentication authentication) {
        return ResponseEntity.ok(service.forMission(missionId, authentication));
    }

    @GetMapping(ApiRoutes.Weather.BASE + ApiRoutes.Weather.STATIONS)
    @PreAuthorize("@permissionService.has(authentication, 'STATION_READ')")
    public ResponseEntity<List<StationWeatherSummaryResponse>> stations() {
        return ResponseEntity.ok(service.stations());
    }

    @GetMapping(ApiRoutes.Weather.ADMIN_PROVIDER)
    @PreAuthorize("@permissionService.has(authentication, 'PERMISSION_MANAGE')")
    public ResponseEntity<WeatherProviderSettingsResponse> provider() {
        return ResponseEntity.ok(service.providerSettings());
    }

    @PutMapping(ApiRoutes.Weather.ADMIN_PROVIDER)
    @PreAuthorize("@permissionService.has(authentication, 'PERMISSION_MANAGE')")
    public ResponseEntity<WeatherProviderSettingsResponse> updateProvider(
            @Valid @RequestBody WeatherProviderUpdateRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(service.updateProvider(request, authentication));
    }
}
