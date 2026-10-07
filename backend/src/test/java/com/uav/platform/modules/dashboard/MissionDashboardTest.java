package com.uav.platform.modules.dashboard;

import com.uav.platform.modules.user.common.*;
import com.uav.platform.modules.uav.common.*;
import com.uav.platform.modules.station.common.*;
import com.uav.platform.modules.inventory.common.*;
import com.uav.platform.modules.media.common.*;
import com.uav.platform.modules.audit.common.*;
import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.common.UserStatus;
import com.uav.platform.modules.user.repository.UserRepository;
import com.uav.platform.modules.user.service.PermissionService;
import com.uav.platform.modules.dashboard.config.response.MissionDashboardResponse;
import com.uav.platform.modules.dashboard.service.impl.IDashboardService;
import com.uav.platform.modules.audit.repository.AuditLogRepository;
import com.uav.platform.modules.inventory.repository.EquipmentRepository;
import com.uav.platform.modules.media.repository.MediaAssetRepository;
import com.uav.platform.modules.mission.common.MissionStatus;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.station.repository.StationRepository;
import com.uav.platform.modules.uav.repository.UavRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.uav.platform.modules.inventory.entity.Equipment;
import org.springframework.data.jpa.domain.Specification;

class MissionDashboardTest {
    @Test
    void missionSummaryCountsStatusesForAllMissionViewer() {
        MissionRepository missions = mock(MissionRepository.class);
        PermissionService permissions = mock(PermissionService.class);
        when(permissions.has(any(), eq("MISSION_VIEW_ALL"))).thenReturn(true);
        when(missions.count()).thenReturn(9L);
        when(missions.count(any(Specification.class))).thenReturn(2L, 1L, 2L, 1L, 3L, 0L);
        IDashboardService service = new IDashboardService(mock(UserRepository.class), mock(StationRepository.class), mock(UavRepository.class),
                mock(EquipmentRepository.class), mock(MediaAssetRepository.class), mock(AuditLogRepository.class), permissions, missions);

        MissionDashboardResponse response = service.missionSummary(auth("admin"));

        assertEquals(9L, response.totalMissions());
        assertEquals(2L, response.pendingMissions());
        assertEquals(3L, response.completedMissions());
    }

    @Test
    void summaryLoadsOnlyActiveEquipmentThroughSpecification() {
        EquipmentRepository equipment = mock(EquipmentRepository.class);
        Equipment active = new Equipment("Battery", com.uav.platform.modules.inventory.common.EquipmentType.BATTERY, null, null);
        active.stockIn(8);
        active.reserve(3);
        when(equipment.findAll(any(Specification.class))).thenReturn(List.of(active));
        IDashboardService service = new IDashboardService(mock(UserRepository.class), mock(StationRepository.class),
                mock(UavRepository.class), equipment, mock(MediaAssetRepository.class), mock(AuditLogRepository.class));

        service.summary(null);

        verify(equipment).findAll(any(Specification.class));
        verify(equipment, never()).findAll();
    }

    private UsernamePasswordAuthenticationToken auth(String username) { return UsernamePasswordAuthenticationToken.authenticated(username, "n/a", List.of()); }
}
