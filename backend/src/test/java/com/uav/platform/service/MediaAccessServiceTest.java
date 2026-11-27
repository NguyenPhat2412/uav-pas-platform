package com.uav.platform.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.dao.IEquipmentDao;
import com.uav.platform.dao.IMissionDao;
import com.uav.platform.dao.IStationDao;
import com.uav.platform.dao.IUavDao;
import com.uav.platform.entity.*;
import com.uav.platform.entity.AppUser;
import com.uav.platform.enums.*;
import com.uav.platform.service.impl.MediaAccessServiceImpl;
import com.uav.platform.service.impl.MissionOperations;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

class MediaAccessServiceTest {
    @Test
    void missionMediaAccessRequiresMissionVisibilityAndPermission() {
        PermissionService permissions = mock(PermissionService.class);
        IMissionDao missions = mock(IMissionDao.class);
        AppUser owner =
                new AppUser(
                        "owner",
                        "owner@test.vn",
                        "hash",
                        null,
                        com.uav.platform.enums.UserStatus.ACTIVE);
        Mission mission =
                MissionOperations.draft(
                        owner,
                        MissionType.AREA_INSPECTION,
                        "Inspect",
                        null,
                        LocalDate.now().plusDays(1),
                        LocalDateTime.now().plusDays(1),
                        LocalDateTime.now().plusDays(1).plusHours(1),
                        "Hanoi",
                        null,
                        null,
                        MissionPriority.NORMAL,
                        null);
        mission.setId(10L);
        when(permissions.has(any(), eq("MISSION_MEDIA_VIEW"))).thenReturn(true);
        when(missions.findById(10L)).thenReturn(Optional.of(mission));
        MediaAccessService service =
                new MediaAccessServiceImpl(
                        permissions,
                        missions,
                        mock(IStationDao.class),
                        mock(IUavDao.class),
                        mock(IEquipmentDao.class));
        assertThrows(
                org.springframework.security.access.AccessDeniedException.class,
                () -> service.requireLink("MISSION", "10", "other", false));
    }
}
