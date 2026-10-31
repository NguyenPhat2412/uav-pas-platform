package com.uav.platform.integration.dashboard;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.dto.response.dashboard.MissionDashboardResponse;
import com.uav.platform.entity.inventory.Equipment;
import com.uav.platform.enums.audit.*;
import com.uav.platform.enums.inventory.*;
import com.uav.platform.enums.media.*;
import com.uav.platform.enums.mission.*;
import com.uav.platform.enums.station.*;
import com.uav.platform.enums.uav.*;
import com.uav.platform.repository.audit.AuditLogRepository;
import com.uav.platform.repository.inventory.EquipmentRepository;
import com.uav.platform.repository.media.MediaAssetRepository;
import com.uav.platform.repository.mission.MissionRepository;
import com.uav.platform.repository.station.StationRepository;
import com.uav.platform.repository.uav.UavRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.impl.dashboard.DashboardServiceImpl;
import com.uav.platform.service.impl.inventory.EquipmentOperations;
import com.uav.platform.service.permission.PermissionService;

import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.util.List;

class MissionDashboardTest {
    @Test
    void missionSummaryCountsStatusesForAllMissionViewer() {
        MissionRepository missions = mock(MissionRepository.class);
        PermissionService permissions = mock(PermissionService.class);
        when(permissions.has(any(), eq("MISSION_VIEW_ALL"))).thenReturn(true);
        when(missions.count()).thenReturn(9L);
        when(missions.count(any(Specification.class))).thenReturn(2L, 1L, 2L, 1L, 3L, 0L);
        DashboardServiceImpl service =
                new DashboardServiceImpl(
                        mock(UserRepository.class),
                        mock(StationRepository.class),
                        mock(UavRepository.class),
                        mock(EquipmentRepository.class),
                        mock(MediaAssetRepository.class),
                        mock(AuditLogRepository.class),
                        permissions,
                        missions);

        MissionDashboardResponse response = service.missionSummary(auth("admin"));

        assertEquals(9L, response.totalMissions());
        assertEquals(2L, response.pendingMissions());
        assertEquals(3L, response.completedMissions());
    }

    @Test
    void summaryLoadsOnlyActiveEquipmentThroughSpecification() {
        EquipmentRepository equipment = mock(EquipmentRepository.class);
        Equipment active =
                new Equipment(
                        "Battery",
                        com.uav.platform.enums.inventory.EquipmentType.BATTERY,
                        null,
                        null);
        EquipmentOperations.stockIn(active, 8);
        EquipmentOperations.reserve(active, 3);
        when(equipment.findAll(any(Specification.class))).thenReturn(List.of(active));
        DashboardServiceImpl service =
                new DashboardServiceImpl(
                        mock(UserRepository.class),
                        mock(StationRepository.class),
                        mock(UavRepository.class),
                        equipment,
                        mock(MediaAssetRepository.class),
                        mock(AuditLogRepository.class));

        service.summary(null);

        verify(equipment).findAll(any(Specification.class));
        verify(equipment, never()).findAll();
    }

    private UsernamePasswordAuthenticationToken auth(String username) {
        return UsernamePasswordAuthenticationToken.authenticated(username, "n/a", List.of());
    }
}
