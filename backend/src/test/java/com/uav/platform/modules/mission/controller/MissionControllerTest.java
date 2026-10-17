package com.uav.platform.modules.mission.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.modules.audit.enums.*;
import com.uav.platform.modules.inventory.enums.*;
import com.uav.platform.modules.media.enums.*;
import com.uav.platform.modules.mission.dto.request.MissionCreateRequest;
import com.uav.platform.modules.mission.dto.response.MissionResponse;
import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.mission.enums.MissionStatus;
import com.uav.platform.modules.mission.enums.MissionType;
import com.uav.platform.modules.mission.service.MissionService;
import com.uav.platform.modules.station.enums.*;
import com.uav.platform.modules.uav.enums.*;

import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

class MissionControllerTest {
    @Test
    void createReturnsCreatedMission() {
        MissionService service = mock(MissionService.class);
        MissionController controller = new MissionController(service);
        MissionResponse expected =
                new MissionResponse(
                        1L,
                        "MSN-2026-000001",
                        2L,
                        "Customer",
                        null,
                        MissionType.AREA_INSPECTION,
                        "Inspect",
                        null,
                        LocalDate.now(),
                        LocalDateTime.now(),
                        LocalDateTime.now().plusHours(1),
                        "Hanoi",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        MissionStatus.DRAFT,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        false,
                        null,
                        0L,
                        "NOT_REQUESTED");
        when(service.create(any(), eq("customer"))).thenReturn(expected);

        ResponseEntity<MissionResponse> response =
                controller.create(
                        request(),
                        UsernamePasswordAuthenticationToken.authenticated(
                                "customer", "n/a", List.of()));

        assertEquals(201, response.getStatusCode().value());
        assertEquals(expected, response.getBody());
    }

    private MissionCreateRequest request() {
        return new MissionCreateRequest(
                MissionType.AREA_INSPECTION,
                "Inspect",
                null,
                LocalDate.now(),
                LocalDateTime.now().plusDays(1),
                LocalDateTime.now().plusDays(1).plusHours(1),
                "Hanoi",
                null,
                null,
                null,
                null,
                null);
    }
}
