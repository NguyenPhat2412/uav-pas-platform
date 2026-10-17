package com.uav.platform.modules.media.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.modules.audit.enums.*;
import com.uav.platform.modules.inventory.enums.*;
import com.uav.platform.modules.inventory.repository.EquipmentRepository;
import com.uav.platform.modules.media.enums.*;
import com.uav.platform.modules.media.service.impl.MediaAccessServiceImpl;
import com.uav.platform.modules.mission.entity.*;
import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.permission.service.PermissionService;
import com.uav.platform.modules.station.enums.*;
import com.uav.platform.modules.station.repository.StationRepository;
import com.uav.platform.modules.uav.enums.*;
import com.uav.platform.modules.uav.repository.UavRepository;
import com.uav.platform.modules.user.entity.AppUser;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

class MediaAccessServiceTest {
    @Test
    void missionMediaAccessRequiresMissionVisibilityAndPermission() {
        PermissionService permissions = mock(PermissionService.class);
        MissionRepository missions = mock(MissionRepository.class);
        AppUser owner =
                new AppUser(
                        "owner",
                        "owner@test.vn",
                        "hash",
                        null,
                        com.uav.platform.modules.user.enums.UserStatus.ACTIVE);
        Mission mission =
                Mission.draft(
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
                        mock(StationRepository.class),
                        mock(UavRepository.class),
                        mock(EquipmentRepository.class));
        assertThrows(
                org.springframework.security.access.AccessDeniedException.class,
                () -> service.requireLink("MISSION", "10", "other", false));
    }
}
