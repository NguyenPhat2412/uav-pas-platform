package com.uav.platform.integration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.dao.IAuditLogDao;
import com.uav.platform.dao.IEquipmentDao;
import com.uav.platform.dao.IMediaAssetDao;
import com.uav.platform.dao.IMissionDao;
import com.uav.platform.dao.IStationDao;
import com.uav.platform.dao.IUavDao;
import com.uav.platform.dao.IUserDao;
import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.dto.response.MissionDashboardResponse;
import com.uav.platform.entity.Equipment;
import com.uav.platform.enums.*;
import com.uav.platform.service.PermissionService;
import com.uav.platform.service.impl.DashboardServiceImpl;
import com.uav.platform.service.impl.EquipmentOperations;

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
                new Equipment("Battery", com.uav.platform.enums.EquipmentType.BATTERY, null, null);
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
