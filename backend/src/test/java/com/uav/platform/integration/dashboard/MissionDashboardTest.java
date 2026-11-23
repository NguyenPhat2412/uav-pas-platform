package com.uav.platform.integration.dashboard;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.dao.audit.IAuditLogDao;
import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.dao.inventory.IEquipmentDao;
import com.uav.platform.dao.media.IMediaAssetDao;
import com.uav.platform.dao.mission.IMissionDao;
import com.uav.platform.dao.station.IStationDao;
import com.uav.platform.dao.uav.IUavDao;
import com.uav.platform.dao.user.IUserDao;
import com.uav.platform.dto.response.dashboard.MissionDashboardResponse;
import com.uav.platform.entity.inventory.Equipment;
import com.uav.platform.enums.audit.*;
import com.uav.platform.enums.inventory.*;
import com.uav.platform.enums.media.*;
import com.uav.platform.enums.mission.*;
import com.uav.platform.enums.station.*;
import com.uav.platform.enums.uav.*;
import com.uav.platform.service.impl.dashboard.DashboardServiceImpl;
import com.uav.platform.service.impl.inventory.EquipmentOperations;
import com.uav.platform.service.permission.PermissionService;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.util.List;

class MissionDashboardTest {
    @Test
    void missionSummaryCountsStatusesForAllMissionViewer() {
        IMissionDao missions = mock(IMissionDao.class);
        PermissionService permissions = mock(PermissionService.class);
        when(permissions.has(any(), eq("MISSION_VIEW_ALL"))).thenReturn(true);
        when(missions.count()).thenReturn(9L);
        when(missions.count(any(HibernateSpecification.class))).thenReturn(2L, 1L, 2L, 1L, 3L, 0L);
        DashboardServiceImpl service =
                new DashboardServiceImpl(
                        mock(IUserDao.class),
                        mock(IStationDao.class),
                        mock(IUavDao.class),
                        mock(IEquipmentDao.class),
                        mock(IMediaAssetDao.class),
                        mock(IAuditLogDao.class),
                        permissions,
                        missions);

        MissionDashboardResponse response = service.missionSummary(auth("admin"));

        assertEquals(9L, response.totalMissions());
        assertEquals(2L, response.pendingMissions());
        assertEquals(3L, response.completedMissions());
    }

    @Test
    void summaryLoadsOnlyActiveEquipmentThroughSpecification() {
        IEquipmentDao equipment = mock(IEquipmentDao.class);
        Equipment active =
                new Equipment(
                        "Battery",
                        com.uav.platform.enums.inventory.EquipmentType.BATTERY,
                        null,
                        null);
        EquipmentOperations.stockIn(active, 8);
        EquipmentOperations.reserve(active, 3);
        when(equipment.findAll(any(HibernateSpecification.class))).thenReturn(List.of(active));
        DashboardServiceImpl service =
                new DashboardServiceImpl(
                        mock(IUserDao.class),
                        mock(IStationDao.class),
                        mock(IUavDao.class),
                        equipment,
                        mock(IMediaAssetDao.class),
                        mock(IAuditLogDao.class));

        service.summary(null);

        verify(equipment).findAll(any(HibernateSpecification.class));
        verify(equipment, never()).findAll();
    }

    @Test
    void summaryNeverQueriesAnAreaWithoutItsDashboardPermission() {
        IUserDao users = mock(IUserDao.class);
        IUavDao uavs = mock(IUavDao.class);
        IEquipmentDao equipment = mock(IEquipmentDao.class);
        PermissionService permissions = mock(PermissionService.class);
        // DASHBOARD_UAV only (BA 14.3): UAV figures load, user and inventory figures are not
        // requested.
        when(permissions.has(any(), eq("DASHBOARD_UAV"))).thenReturn(true);
        when(uavs.count()).thenReturn(4L);
        DashboardServiceImpl service =
                new DashboardServiceImpl(
                        users,
                        mock(IStationDao.class),
                        uavs,
                        equipment,
                        mock(IMediaAssetDao.class),
                        mock(IAuditLogDao.class),
                        permissions,
                        mock(IMissionDao.class));

        var summary = service.summary(auth("operator"));

        assertEquals(4L, summary.totalUavs());
        assertEquals(0L, summary.totalUsers());
        verify(users, never()).count();
        verify(equipment, never()).findAll(any(HibernateSpecification.class));
    }

    private UsernamePasswordAuthenticationToken auth(String username) {
        return UsernamePasswordAuthenticationToken.authenticated(username, "n/a", List.of());
    }
}
