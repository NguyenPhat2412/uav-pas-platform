package com.uav.platform.modules.sar.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.notification.service.NotificationService;
import com.uav.platform.modules.sar.dto.request.FlightPlanRequest;
import com.uav.platform.modules.sar.dto.request.TelemetryEvaluateRequest;
import com.uav.platform.modules.sar.dto.response.FlightPlanResponse;
import com.uav.platform.modules.sar.dto.response.TelemetryEvaluateResponse;
import com.uav.platform.modules.sar.repository.SarMissionRepository;
import com.uav.platform.modules.sar.service.impl.SarServiceImpl;
import com.uav.platform.modules.webhook.service.WebhookService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@ExtendWith(MockitoExtension.class)
class SarAlgorithmServiceTest {

    @Mock private SarMissionRepository sarRepository;

    @Mock private MissionRepository missionRepository;

    @Mock private NotificationService notificationService;

    @Mock private WebhookService webhookService;

    private SarServiceImpl sarService;
    private final org.springframework.security.core.Authentication auth =
            org.springframework.security.authentication.UsernamePasswordAuthenticationToken
                    .authenticated("assigned", "", List.of());

    private void authorizedMission() {
        var mission =
                org.mockito.Mockito.mock(com.uav.platform.modules.mission.entity.Mission.class);
        var user = org.mockito.Mockito.mock(com.uav.platform.modules.user.entity.AppUser.class);
        when(user.getUsername()).thenReturn("assigned");
        org.mockito.Mockito.lenient().when(user.getId()).thenReturn(1L);
        when(mission.getOperator()).thenReturn(user);
        org.mockito.Mockito.lenient()
                .when(mission.getUav())
                .thenReturn(
                        new com.uav.platform.modules.uav.entity.Uav(
                                "Model", "UAV-SAR-01", "Fixture"));
        when(missionRepository.findById(1L)).thenReturn(Optional.of(mission));
    }

    @BeforeEach
    void setUp() {
        sarService =
                new SarServiceImpl(
                        sarRepository,
                        missionRepository,
                        notificationService,
                        webhookService,
                        org.mockito.Mockito.mock(
                                com.uav.platform.modules.permission.service.PermissionService
                                        .class));
    }

    @Test
    void generateFlightPlanProducesValidIamsarExpandingSquareSpiral() {
        FlightPlanRequest request = new FlightPlanRequest(1L, 20.7284, 107.0512, 50.0, 8, 12.0);
        FlightPlanResponse response = sarService.generateFlightPlan(request, null);

        assertEquals("IAMSAR_EXPANDING_SQUARE", response.patternType());
        assertEquals(9, response.waypoints().size(), "Should include LKP datum + 8 spiral legs");
        assertEquals("LKP (Datum)", response.waypoints().get(0).label());
        assertEquals(50.0, response.waypoints().get(1).legDistanceMeters());
        assertEquals(50.0, response.waypoints().get(2).legDistanceMeters());
        assertEquals(100.0, response.waypoints().get(3).legDistanceMeters());
        assertEquals(100.0, response.waypoints().get(4).legDistanceMeters());
        assertTrue(response.totalDistanceMeters() >= 1000.0);
        assertTrue(response.estimatedFlightMinutes() > 0.0);
    }

    @Test
    void evaluateTelemetryDetectsCriticalBatteryAndGeofenceBreachAndDispatchesWebhook() {
        List<List<Double>> polygon =
                List.of(
                        List.of(20.7310, 107.0480),
                        List.of(20.7315, 107.0550),
                        List.of(20.7265, 107.0560),
                        List.of(20.7260, 107.0490));

        // Point outside polygon and low battery (18%)
        TelemetryEvaluateRequest criticalReq =
                new TelemetryEvaluateRequest(
                        1L,
                        "UAV-SAR-01",
                        20.7400,
                        107.0600,
                        20.7270,
                        107.0500,
                        18.0,
                        12.0,
                        2.2,
                        20.0,
                        polygon);

        authorizedMission();

        TelemetryEvaluateResponse result = sarService.evaluateTelemetry(criticalReq, auth);

        assertTrue(result.mustTriggerRth());
        assertEquals("CRITICAL_RECOMMEND_RTH", result.rthStatus());
        assertFalse(result.insideGeofence());
        assertTrue(result.alertDispatched());
        verify(webhookService).dispatchEvent(eq("GEOFENCE_BREACH"), anyMap());
        verify(webhookService).dispatchEvent(eq("BATTERY_CRITICAL_RTH"), anyMap());
    }

    @Test
    void evaluateTelemetryConfirmsSafeFlightInsidePolygon() {
        List<List<Double>> polygon =
                List.of(
                        List.of(20.7310, 107.0480),
                        List.of(20.7315, 107.0550),
                        List.of(20.7265, 107.0560),
                        List.of(20.7260, 107.0490));

        TelemetryEvaluateRequest safeReq =
                new TelemetryEvaluateRequest(
                        1L,
                        "UAV-SAR-01",
                        20.7284,
                        107.0512,
                        20.7270,
                        107.0500,
                        82.0,
                        12.0,
                        2.2,
                        20.0,
                        polygon);

        authorizedMission();
        TelemetryEvaluateResponse result = sarService.evaluateTelemetry(safeReq, auth);

        assertFalse(result.mustTriggerRth());
        assertEquals("SAFE", result.rthStatus());
        assertTrue(result.insideGeofence());
        assertFalse(result.alertDispatched());
    }

    @Test
    void dispatchRescueCoordinatesBroadcastsEmergencyWebhook() {
        when(sarRepository.findByMissionId(1L)).thenReturn(Optional.empty());
        authorizedMission();
        when(webhookService.dispatchEvent(eq("SAR_EMERGENCY_TRIGGERED"), anyMap()))
                .thenReturn("UNCONFIGURED");

        Map<String, Object> result =
                sarService.dispatchRescueCoordinates(
                        1L, Map.of("coordinates", "20.7284, 107.0512", "victimCount", 2), auth);

        assertEquals(false, result.get("externalDeliveryConfirmed"));
        verify(webhookService).dispatchEvent(eq("SAR_EMERGENCY_TRIGGERED"), anyMap());
    }
}
