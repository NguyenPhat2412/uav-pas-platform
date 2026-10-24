package com.uav.platform.modules.sar.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.notification.service.NotificationService;
import com.uav.platform.modules.permission.service.PermissionService;
import com.uav.platform.modules.sar.entity.SarMission;
import com.uav.platform.modules.sar.enums.SarStatus;
import com.uav.platform.modules.sar.repository.SarMissionRepository;
import com.uav.platform.modules.sar.service.impl.SarServiceImpl;
import com.uav.platform.modules.uav.entity.Uav;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.webhook.service.WebhookService;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.util.*;

class SarCockpitTest {
    final SarMissionRepository sars = mock(SarMissionRepository.class);
    final MissionRepository missions = mock(MissionRepository.class);
    final WebhookService hooks = mock(WebhookService.class);
    final PermissionService permissions = mock(PermissionService.class);
    final SarServiceImpl service =
            new SarServiceImpl(sars, missions, mock(NotificationService.class), hooks, permissions);
    final UsernamePasswordAuthenticationToken auth =
            new UsernamePasswordAuthenticationToken("pilot", "", List.of(() -> "ROLE_X"));

    private static SarMission sar(SarStatus status, Mission mission) {
        SarMission sar = new SarMission();
        sar.setMission(mission);
        sar.setSarStatus(status);
        sar.setLkpLatitude(20.7);
        sar.setLkpLongitude(107.0);
        return sar;
    }

    @Test
    @SuppressWarnings("unchecked")
    void cockpitListHidesRescuedUnlessAsked() {
        when(permissions.has(any(), eq("MISSION_VIEW_ALL"))).thenReturn(true);
        Mission m = mock(Mission.class);
        when(m.getCode()).thenReturn("MS-1");
        when(sars.findAll(any(Specification.class), any(Sort.class)))
                .thenReturn(List.of(sar(SarStatus.SEARCHING, m), sar(SarStatus.RESCUED, m)));
        assertEquals(1, service.listForCockpit(false, auth).size());
        assertEquals(2, service.listForCockpit(true, auth).size());
        assertEquals("MS-1", service.listForCockpit(false, auth).get(0).missionCode());
    }

    @Test
    void rthRequiresAssignedOperatorAndUavAndQueuesWebhook() {
        Mission m = mock(Mission.class);
        AppUser operator = mock(AppUser.class);
        when(operator.getUsername()).thenReturn("pilot");
        when(m.getOperator()).thenReturn(operator);
        when(m.getId()).thenReturn(5L);
        when(missions.findById(5L)).thenReturn(Optional.of(m));
        assertThrows(RuntimeException.class, () -> service.requestReturnToHome(5L, auth));
        verifyNoInteractions(hooks);

        Uav uav = new Uav("M350", "SN-9", "DJI");
        uav.setId(9L);
        when(m.getUav()).thenReturn(uav);
        SarMission sar = sar(SarStatus.SEARCHING, m);
        when(sars.findByMissionId(5L)).thenReturn(Optional.of(sar));
        when(hooks.dispatchEvent(eq("SAR_RTH_REQUESTED"), anyMap())).thenReturn("QUEUED");
        var result = service.requestReturnToHome(5L, auth);
        assertEquals("QUEUED", result.status());
        assertFalse(result.externalDeliveryConfirmed());
        assertEquals(SarStatus.SUSPENDED, sar.getSarStatus());
    }
}
