package com.uav.platform.modules.mission.controller;

import com.uav.platform.modules.user.common.*;
import com.uav.platform.modules.uav.common.*;
import com.uav.platform.modules.station.common.*;
import com.uav.platform.modules.inventory.common.*;
import com.uav.platform.modules.media.common.*;
import com.uav.platform.modules.audit.common.*;
import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.mission.config.request.MissionCreateRequest;
import com.uav.platform.modules.mission.config.response.MissionResponse;
import com.uav.platform.modules.mission.common.MissionStatus;
import com.uav.platform.modules.mission.common.MissionType;
import com.uav.platform.modules.mission.service.MissionService;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class MissionControllerTest {
    @Test
    void createReturnsCreatedMission() {
        MissionService service = mock(MissionService.class);
        MissionController controller = new MissionController(service);
        MissionResponse expected = new MissionResponse(1L, "MSN-2026-000001", 2L, "Customer", null,
                MissionType.AREA_INSPECTION, "Inspect", null, LocalDate.now(), LocalDateTime.now(),
                LocalDateTime.now().plusHours(1), "Hanoi", null, null, null, null, null, null,
                MissionStatus.DRAFT, null, null, null, null, null, null, null, false, null, 0L);
        when(service.create(any(), eq("customer"))).thenReturn(expected);

        ResponseEntity<MissionResponse> response = controller.create(request(),
                UsernamePasswordAuthenticationToken.authenticated("customer", "n/a", List.of()));

        assertEquals(201, response.getStatusCode().value());
        assertEquals(expected, response.getBody());
    }

    private MissionCreateRequest request() {
        return new MissionCreateRequest(MissionType.AREA_INSPECTION, "Inspect", null,
                LocalDate.now(), LocalDateTime.now().plusDays(1), LocalDateTime.now().plusDays(1).plusHours(1),
                "Hanoi", null, null, null, null, null);
    }
}
