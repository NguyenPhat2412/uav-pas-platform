package com.uav.platform.service.media;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.dao.inventory.IEquipmentDao;
import com.uav.platform.dao.mission.IMissionDao;
import com.uav.platform.dao.station.IStationDao;
import com.uav.platform.dao.uav.IUavDao;
import com.uav.platform.entity.mission.*;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.audit.*;
import com.uav.platform.enums.inventory.*;
import com.uav.platform.enums.media.*;
import com.uav.platform.enums.mission.*;
import com.uav.platform.enums.station.*;
import com.uav.platform.enums.uav.*;
import com.uav.platform.service.impl.media.MediaAccessServiceImpl;
import com.uav.platform.service.impl.mission.lifecycle.MissionOperations;
import com.uav.platform.service.permission.PermissionService;

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
                        com.uav.platform.enums.user.UserStatus.ACTIVE);
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
