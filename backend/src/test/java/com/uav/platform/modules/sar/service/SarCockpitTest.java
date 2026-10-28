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
        // RESCUED is filtered in the query (specification), so each call returns what the DB would.
        when(sars.findAll(
                        any(Specification.class),
                        any(org.springframework.data.domain.Pageable.class)))
                .thenReturn(
                        new org.springframework.data.domain.PageImpl<>(
                                List.of(sar(SarStatus.SEARCHING, m))),
                        new org.springframework.data.domain.PageImpl<>(
                                List.of(sar(SarStatus.SEARCHING, m), sar(SarStatus.RESCUED, m))),
                        new org.springframework.data.domain.PageImpl<>(
                                List.of(sar(SarStatus.SEARCHING, m))));
        assertEquals(1, service.listForCockpit(false, auth).size());
        assertEquals(2, service.listForCockpit(true, auth).size());
        assertEquals("MS-1", service.listForCockpit(false, auth).get(0).missionCode());
        var pages =
                org.mockito.ArgumentCaptor.forClass(org.springframework.data.domain.Pageable.class);
        verify(sars, times(3)).findAll(any(Specification.class), pages.capture());
        assertEquals(50, pages.getValue().getPageSize(), "cockpit default page size");
        assertEquals(
                org.springframework.data.domain.Sort.Direction.DESC,
                pages.getValue().getSort().getOrderFor("updatedAt").getDirection());
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

    private SarMission sarFor(
            com.uav.platform.modules.mission.enums.MissionStatus status, SarStatus sarStatus) {
        when(permissions.has(any(), eq("MISSION_VIEW_ALL"))).thenReturn(true);
        Mission m = mock(Mission.class);
        when(m.getStatus()).thenReturn(status);
        when(m.getId()).thenReturn(5L);
        lenient().when(missions.findById(5L)).thenReturn(Optional.of(m));
        SarMission sar = sar(sarStatus, m);
        when(sars.findByMissionId(5L)).thenReturn(Optional.of(sar));
        lenient().when(sars.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));
        return sar;
    }

    @Test
    void sarStatusFollowsTheSearchStateMachine() {
        SarMission sar =
                sarFor(
                        com.uav.platform.modules.mission.enums.MissionStatus.IN_PROGRESS,
                        SarStatus.SEARCHING);
        service.updateSarStatus(5L, SarStatus.TARGET_LOCATED, auth);
        service.updateSarStatus(5L, SarStatus.RESCUED, auth);
        assertEquals(SarStatus.RESCUED, sar.getSarStatus());
        var error =
                assertThrows(
                        com.uav.platform.error.SystemException.class,
                        () -> service.updateSarStatus(5L, SarStatus.SEARCHING, auth));
        assertEquals("SAR_STATUS_TRANSITION_INVALID", error.getCode());
    }

    @Test
    void closedMissionFreezesSarStatusAndArea() {
        SarMission sar =
                sarFor(
                        com.uav.platform.modules.mission.enums.MissionStatus.COMPLETED,
                        SarStatus.SEARCHING);
        var status =
                assertThrows(
                        com.uav.platform.error.SystemException.class,
                        () -> service.updateSarStatus(5L, SarStatus.SUSPENDED, auth));
        assertEquals("SAR_MISSION_CLOSED", status.getCode());
        var edit =
                assertThrows(
                        com.uav.platform.error.SystemException.class,
                        () -> service.registerSar(request(null), auth));
        assertEquals("SAR_MISSION_CLOSED", edit.getCode());
        assertEquals(SarStatus.SEARCHING, sar.getSarStatus());
    }

    @Test
    void editingALiveSearchAreaNeedsTheCurrentVersion() {
        SarMission sar =
                sarFor(
                        com.uav.platform.modules.mission.enums.MissionStatus.IN_PROGRESS,
                        SarStatus.SEARCHING);
        sar.setVersion(3);
        var missing =
                assertThrows(
                        com.uav.platform.error.SystemException.class,
                        () -> service.registerSar(request(null), auth));
        assertEquals("SAR_VERSION_REQUIRED", missing.getCode());
        var stale =
                assertThrows(
                        com.uav.platform.error.SystemException.class,
                        () -> service.registerSar(request(2L), auth));
        assertEquals("SAR_STALE", stale.getCode());
        service.registerSar(request(3L), auth);
        assertEquals(21.5, sar.getLkpLatitude());
    }

    private static com.uav.platform.modules.sar.dto.request.SarMissionRequest request(
            Long version) {
        return new com.uav.platform.modules.sar.dto.request.SarMissionRequest(
                5L,
                "[[21.5,105.8],[21.6,105.9],[21.4,105.9]]",
                21.5,
                105.8,
                null,
                null,
                null,
                null,
                version);
    }
}
