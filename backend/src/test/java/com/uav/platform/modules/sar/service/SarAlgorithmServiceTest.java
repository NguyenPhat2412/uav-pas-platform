package com.uav.platform.modules.sar.service;

import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.notification.service.NotificationService;
import com.uav.platform.modules.sar.config.request.FlightPlanRequest;
import com.uav.platform.modules.sar.config.request.TelemetryEvaluateRequest;
import com.uav.platform.modules.sar.config.response.FlightPlanResponse;
import com.uav.platform.modules.sar.config.response.TelemetryEvaluateResponse;
import com.uav.platform.modules.sar.repository.SarMissionRepository;
import com.uav.platform.modules.sar.service.impl.ISarService;
import com.uav.platform.modules.webhook.service.WebhookService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SarAlgorithmServiceTest {

    @Mock
    private SarMissionRepository sarRepository;

    @Mock
    private MissionRepository missionRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private WebhookService webhookService;

    private ISarService sarService;

    @BeforeEach
    void setUp() {
        sarService = new ISarService(sarRepository, missionRepository, notificationService, webhookService);
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
        List<List<Double>> polygon = List.of(
            List.of(20.7310, 107.0480),
            List.of(20.7315, 107.0550),
            List.of(20.7265, 107.0560),
            List.of(20.7260, 107.0490)
        );

        // Point outside polygon and low battery (18%)
        TelemetryEvaluateRequest criticalReq = new TelemetryEvaluateRequest(
            1L, "UAV-SAR-01",
            20.7400, 107.0600,
            20.7270, 107.0500,
            18.0, 12.0, 2.2, 20.0,
            polygon
        );

        when(missionRepository.findById(1L)).thenReturn(Optional.empty());

        TelemetryEvaluateResponse result = sarService.evaluateTelemetry(criticalReq, null);

        assertTrue(result.mustTriggerRth());
        assertEquals("CRITICAL_TRIGGER_RTH", result.rthStatus());
        assertFalse(result.insideGeofence());
        assertTrue(result.alertDispatched());
        verify(webhookService).broadcastEvent(eq("GEOFENCE_BREACH"), anyMap());
        verify(webhookService).broadcastEvent(eq("BATTERY_CRITICAL_RTH"), anyMap());
    }

    @Test
    void evaluateTelemetryConfirmsSafeFlightInsidePolygon() {
        List<List<Double>> polygon = List.of(
            List.of(20.7310, 107.0480),
            List.of(20.7315, 107.0550),
            List.of(20.7265, 107.0560),
            List.of(20.7260, 107.0490)
        );

        TelemetryEvaluateRequest safeReq = new TelemetryEvaluateRequest(
            1L, "UAV-SAR-01",
            20.7284, 107.0512,
            20.7270, 107.0500,
            82.0, 12.0, 2.2, 20.0,
            polygon
        );

        TelemetryEvaluateResponse result = sarService.evaluateTelemetry(safeReq, null);

        assertFalse(result.mustTriggerRth());
        assertEquals("SAFE", result.rthStatus());
        assertTrue(result.insideGeofence());
        assertFalse(result.alertDispatched());
    }

    @Test
    void dispatchRescueCoordinatesBroadcastsEmergencyWebhook() {
        when(sarRepository.findByMissionId(1L)).thenReturn(Optional.empty());
        when(missionRepository.findById(1L)).thenReturn(Optional.empty());

        Map<String, Object> result = sarService.dispatchRescueCoordinates(
            1L,
            Map.of("coordinates", "20.7284, 107.0512", "victimCount", 2),
            null
        );

        assertEquals("DISPATCHED", result.get("status"));
        verify(webhookService).broadcastEvent(eq("SAR_EMERGENCY_TRIGGERED"), anyMap());
    }
}
