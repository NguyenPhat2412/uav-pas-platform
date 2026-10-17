package com.uav.platform.modules.sar.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.notification.service.NotificationService;
import com.uav.platform.modules.permission.service.PermissionService;
import com.uav.platform.modules.sar.dto.request.TelemetryEvaluateRequest;
import com.uav.platform.modules.sar.repository.SarMissionRepository;
import com.uav.platform.modules.sar.service.impl.SarServiceImpl;
import com.uav.platform.modules.webhook.service.WebhookService;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.util.*;

class SarAuthorizationTest {
    @Test
    void missingMissionHasNoSideEffects() {
        check(false);
    }

    @Test
    void unassignedOperatorHasNoSideEffects() {
        check(true);
    }

    void check(boolean exists) {
        var missions = mock(MissionRepository.class);
        var notices = mock(NotificationService.class);
        var hooks = mock(WebhookService.class);
        when(missions.findById(123L))
                .thenReturn(exists ? Optional.of(mock(Mission.class)) : Optional.empty());
        var service =
                new SarServiceImpl(
                        mock(SarMissionRepository.class),
                        missions,
                        notices,
                        hooks,
                        mock(PermissionService.class));
        var auth = new UsernamePasswordAuthenticationToken("unassigned", "", List.of());
        var failure =
                assertThrows(
                        RuntimeException.class,
                        () ->
                                service.evaluateTelemetry(
                                        new TelemetryEvaluateRequest(
                                                123L, "OTHER", 20, 107, 20, 107, 1, 12, null, null,
                                                null),
                                        auth));
        if (exists)
            assertInstanceOf(
                    org.springframework.security.access.AccessDeniedException.class, failure);
        else
            assertEquals(
                    org.springframework.http.HttpStatus.NOT_FOUND,
                    ((com.uav.platform.error.SystemException) failure).getStatus());
        verifyNoInteractions(notices, hooks);
        assertThrows(
                RuntimeException.class,
                () ->
                        service.dispatchRescueCoordinates(
                                123L,
                                new com.uav.platform.modules.sar.dto.request.RescueDispatchRequest(
                                        Map.of()),
                                auth));
        verifyNoInteractions(notices, hooks);
    }

    @Test
    void assignedAndGlobalActorsRequireMatchingUavAndNeverClaimFlightCommand() {
        var missions = mock(MissionRepository.class);
        var notices = mock(NotificationService.class);
        var hooks = mock(WebhookService.class);
        var permissions = mock(PermissionService.class);
        var mission = mock(Mission.class);
        var operator = mock(com.uav.platform.modules.user.entity.AppUser.class);
        when(operator.getUsername()).thenReturn("assigned");
        when(mission.getOperator()).thenReturn(operator);
        when(mission.getUav())
                .thenReturn(
                        new com.uav.platform.modules.uav.entity.Uav("Fixture", "MATCH", "Fixture"));
        when(missions.findById(123L)).thenReturn(Optional.of(mission));
        var service =
                new SarServiceImpl(
                        mock(SarMissionRepository.class), missions, notices, hooks, permissions);
        var auth = UsernamePasswordAuthenticationToken.authenticated("assigned", "", List.of());
        var mismatch =
                new TelemetryEvaluateRequest(
                        123L, "OTHER", 20, 107, 20, 107, 1, 12, null, null, null);
        assertThrows(
                com.uav.platform.error.SystemException.class,
                () -> service.evaluateTelemetry(mismatch, auth));
        verifyNoInteractions(notices, hooks);
        var request =
                new TelemetryEvaluateRequest(
                        123L, "MATCH", 20, 107, 20, 107, 1, 12, null, null, null);
        var response = service.evaluateTelemetry(request, auth);
        assertTrue(response.mustTriggerRth());
        assertFalse(response.flightCommandSent());
        assertEquals("UNCONFIGURED", response.deliveryStatus());
        var global = UsernamePasswordAuthenticationToken.authenticated("commander", "", List.of());
        when(permissions.has(global, "MISSION_VIEW_ALL")).thenReturn(true);
        assertFalse(service.evaluateTelemetry(request, global).flightCommandSent());
    }
}
