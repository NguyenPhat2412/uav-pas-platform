package com.uav.platform.modules.reporting.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.mission.service.impl.MissionOperations;
import com.uav.platform.modules.permission.service.PermissionService;
import com.uav.platform.modules.reporting.service.impl.ReportServiceImpl;
import com.uav.platform.modules.sar.repository.*;
import com.uav.platform.modules.station.repository.StationRepository;
import com.uav.platform.modules.uav.repository.UavRepository;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserStatus;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.time.*;
import java.util.*;

class ReportTruthTest {
    @Test
    void anonymousAccessFailsClosed() {
        var service =
                new ReportServiceImpl(
                        mock(MissionRepository.class),
                        mock(UavRepository.class),
                        mock(StationRepository.class),
                        mock(SarMissionRepository.class),
                        mock(AiDetectionRepository.class));
        assertThrows(SystemException.class, () -> service.getOperationsSummary(null));
    }

    @Test
    void plannedDurationIncludesVisibleDraftCancelledCompletedAndCsvNamesFacts() {
        var missions = mock(MissionRepository.class);
        var perms = mock(PermissionService.class);
        var detections = mock(AiDetectionRepository.class);
        var service =
                new ReportServiceImpl(
                        missions,
                        mock(UavRepository.class),
                        mock(StationRepository.class),
                        mock(SarMissionRepository.class),
                        detections,
                        perms);
        var owner = new AppUser("owner", "a@example.test", "hash", null, UserStatus.ACTIVE);
        owner.setId(1L);
        var stranger = new AppUser("stranger", "b@example.test", "hash", null, UserStatus.ACTIVE);
        stranger.setId(2L);
        var start = LocalDateTime.of(2026, 10, 17, 10, 0);
        var a =
                MissionOperations.draft(
                        owner,
                        MissionType.OTHER,
                        "Draft",
                        null,
                        start.toLocalDate(),
                        start,
                        start.plusHours(1),
                        "Site",
                        null,
                        null,
                        MissionPriority.NORMAL,
                        null);
        a.setId(1L);
        var b =
                MissionOperations.draft(
                        owner,
                        MissionType.OTHER,
                        "Cancelled",
                        null,
                        start.toLocalDate(),
                        start,
                        start.plusHours(2),
                        "Site",
                        null,
                        null,
                        MissionPriority.NORMAL,
                        null);
        b.setId(2L);
        org.springframework.test.util.ReflectionTestUtils.setField(
                b, "status", MissionStatus.CANCELLED);
        var c =
                MissionOperations.draft(
                        owner,
                        MissionType.OTHER,
                        "Completed",
                        null,
                        start.toLocalDate(),
                        start,
                        start.plusHours(3),
                        "Site",
                        null,
                        null,
                        MissionPriority.NORMAL,
                        null);
        c.setId(3L);
        org.springframework.test.util.ReflectionTestUtils.setField(
                c, "status", MissionStatus.COMPLETED);
        var other =
                MissionOperations.draft(
                        stranger,
                        MissionType.OTHER,
                        "Hidden",
                        null,
                        start.toLocalDate(),
                        start,
                        start.plusHours(9),
                        "Site",
                        null,
                        null,
                        MissionPriority.NORMAL,
                        null);
        other.setId(4L);
        when(missions.findAll()).thenReturn(List.of(a, b, c, other));
        var auth = UsernamePasswordAuthenticationToken.authenticated("owner", "", List.of());
        var visible = mock(com.uav.platform.modules.sar.entity.AiDetection.class);
        when(visible.getMission()).thenReturn(a);
        when(visible.getVerified()).thenReturn(true);
        when(visible.getLabel()).thenReturn("person");
        var hidden = mock(com.uav.platform.modules.sar.entity.AiDetection.class);
        when(hidden.getMission()).thenReturn(other);
        var unverified = mock(com.uav.platform.modules.sar.entity.AiDetection.class);
        when(unverified.getMission()).thenReturn(c);
        when(unverified.getVerified()).thenReturn(false);
        when(detections.findAll()).thenReturn(List.of(visible, hidden, unverified));
        var result = service.getOperationsSummary(auth);
        assertEquals(1, result.victimsRescuedCount());
        assertEquals(3, result.totalMissions());
        assertEquals(1, result.completedMissions());
        assertEquals(6.0, result.totalFlightHours());
        var csv = service.exportOperationsCsv(auth);
        assertTrue(csv.contains("Giờ dự kiến theo lịch"));
        assertTrue(csv.contains("Phát hiện người đã xác minh"));
        assertFalse(csv.contains("cứu hộ thành công"));
    }
}
