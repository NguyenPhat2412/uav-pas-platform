package com.uav.platform.modules.mission.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.billing.service.QuotaService;
import com.uav.platform.modules.inventory.repository.EquipmentRepository;
import com.uav.platform.modules.inventory.service.InventoryService;
import com.uav.platform.modules.mission.dto.request.MissionCreateRequest;
import com.uav.platform.modules.mission.dto.request.MissionForceFailRequest;
import com.uav.platform.modules.mission.entity.*;
import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.mission.mapper.MissionMapper;
import com.uav.platform.modules.mission.repository.*;
import com.uav.platform.modules.mission.service.impl.MissionBillingServiceImpl;
import com.uav.platform.modules.mission.service.impl.MissionInputOperations;
import com.uav.platform.modules.mission.service.impl.MissionLifecycleServiceImpl;
import com.uav.platform.modules.mission.service.impl.MissionOperations;
import com.uav.platform.modules.permission.service.PermissionService;
import com.uav.platform.modules.station.repository.StationRepository;
import com.uav.platform.modules.uav.entity.Uav;
import com.uav.platform.modules.uav.enums.UavStatus;
import com.uav.platform.modules.uav.repository.UavRepository;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserStatus;
import com.uav.platform.modules.user.repository.UserRepository;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/** Force-fail by a commander, start window, cancel reason and schedule/quota validation. */
class MissionClosureAndScheduleTest {
    private final MissionEventRepository events = mock(MissionEventRepository.class);
    private final AuditLogService audit = mock(AuditLogService.class);

    @Test
    void commanderForceFailsStuckMissionWithoutOperatorAndReleasesUav() {
        Mission mission = inProgressWithUav();
        MissionService service = service(mission, "commander");

        var response =
                service.forceFail(
                        1L,
                        new MissionForceFailRequest("Operator unreachable, UAV landed", null),
                        auth("commander"));

        assertEquals(MissionStatus.FAILED, mission.getStatus());
        assertEquals(MissionStatus.FAILED, response.status());
        assertEquals("Operator unreachable, UAV landed", mission.getFailureReason());
        assertEquals(UavStatus.AVAILABLE, mission.getUav().getStatus());
        var note = ArgumentCaptor.forClass(MissionEvent.class);
        verify(events).save(note.capture());
        assertEquals(MissionEventType.FAILED, note.getValue().getEventType());
        assertTrue(note.getValue().getDescription().startsWith("[Buộc kết thúc]"));
        verify(audit)
                .record(
                        any(),
                        eq("commander"),
                        any(),
                        eq("MISSION"),
                        eq("1"),
                        argThat(d -> d.startsWith("FORCE_FAILED from IN_PROGRESS")));
    }

    @Test
    void forceFailNeedsReasonAndAnOpenFlight() {
        Mission mission = inProgressWithUav();
        MissionService service = service(mission, "commander");
        SystemException missing =
                assertThrows(
                        SystemException.class,
                        () ->
                                service.forceFail(
                                        1L,
                                        new MissionForceFailRequest(" ", null),
                                        auth("commander")));
        assertEquals("MISSION_FORCE_FAIL_REASON_REQUIRED", missing.getCode());
        assertEquals(MissionStatus.IN_PROGRESS, mission.getStatus());

        service.forceFail(1L, new MissionForceFailRequest("Lost link", null), auth("commander"));
        assertThrows(
                IllegalStateException.class,
                () ->
                        service.forceFail(
                                1L, new MissionForceFailRequest("again", null), auth("commander")));
    }

    @Test
    void normalFailStillRequiresTheAssignedOperator() {
        Mission mission = inProgressWithUav();
        MissionService service = service(mission, "commander");
        assertThrows(
                org.springframework.security.access.AccessDeniedException.class,
                () ->
                        service.fail(
                                1L,
                                new com.uav.platform.modules.mission.dto.request
                                        .MissionFailureRequest("x", null),
                                auth("commander")));
    }

    @Test
    void cancelRecordsOptionalReasonInTimeline() {
        Mission mission = missionAt(MissionStatus.PENDING_CONFIRMATION, LocalDateTime.now());
        MissionService service = service(mission, "customer");
        service.cancel(1L, "Đổi lịch bay", auth("customer"));
        var event = ArgumentCaptor.forClass(MissionEvent.class);
        verify(events).save(event.capture());
        assertEquals(MissionEventType.CANCELLED, event.getValue().getEventType());
        assertEquals("Đổi lịch bay", event.getValue().getDescription());

        Mission other = missionAt(MissionStatus.PENDING_CONFIRMATION, LocalDateTime.now());
        SystemException tooLong =
                assertThrows(
                        SystemException.class,
                        () ->
                                service(other, "customer")
                                        .cancel(1L, "x".repeat(501), auth("customer")));
        assertEquals("MISSION_CANCEL_REASON_TOO_LONG", tooLong.getCode());
        assertEquals(MissionStatus.PENDING_CONFIRMATION, other.getStatus());
    }

    @Test
    void startOpensTwoHoursBeforeScheduledStart() {
        var lifecycle = lifecycle(mock(QuotaService.class));
        LocalDateTime now = LocalDateTime.of(2030, 1, 1, 8, 0);
        Mission tooEarly = missionAt(MissionStatus.DRAFT, now.plusHours(3));
        SystemException early =
                assertThrows(
                        SystemException.class, () -> lifecycle.requireStartWindowAt(tooEarly, now));
        assertEquals("MISSION_START_TOO_EARLY", early.getCode());
        assertEquals(HttpStatus.CONFLICT, early.getStatus());
        assertDoesNotThrow(
                () ->
                        lifecycle.requireStartWindowAt(
                                missionAt(MissionStatus.DRAFT, now.plusHours(2)), now));
        assertDoesNotThrow(
                () ->
                        lifecycle.requireStartWindowAt(
                                missionAt(MissionStatus.DRAFT, now.minusHours(1)), now));
    }

    @Test
    void scheduleRejectsPastStartAndMissionsLongerThan24Hours() {
        LocalDateTime now = LocalDateTime.of(2030, 1, 1, 8, 0);
        SystemException past =
                assertThrows(
                        SystemException.class,
                        () ->
                                MissionInputOperations.checkSchedule(
                                        now.minusMinutes(6), now.plusHours(1), now));
        assertEquals("MISSION_START_IN_PAST", past.getCode());
        assertEquals("startTime", past.getField());
        assertDoesNotThrow(
                () ->
                        MissionInputOperations.checkSchedule(
                                now.minusMinutes(4), now.plusHours(1), now),
                "small grace for a form filled in just now");
        SystemException longMission =
                assertThrows(
                        SystemException.class,
                        () ->
                                MissionInputOperations.checkSchedule(
                                        now.plusHours(1), now.plusHours(25).plusMinutes(1), now));
        assertEquals("MISSION_DURATION_TOO_LONG", longMission.getCode());
        assertDoesNotThrow(
                () ->
                        MissionInputOperations.checkSchedule(
                                now.plusHours(1), now.plusHours(25), now));
    }

    @Test
    void billingNoLongerCapsHoursSilently() {
        var billing = new MissionBillingServiceImpl(null, null);
        LocalDateTime start = LocalDateTime.of(2030, 1, 1, 0, 0);
        assertEquals(24.0, billing.calculateDurationHours(start, start.plusHours(24)));
        assertEquals(30.0, billing.calculateDurationHours(start, start.plusHours(30)));
    }

    @Test
    void createPropagatesUnexpectedQuotaErrorsInsteadOfSwallowingThem() {
        QuotaService quotas = mock(QuotaService.class);
        doThrow(SystemException.notFound("User not found: 5"))
                .when(quotas)
                .checkCanSchedule(eq(5L), anyDouble(), isNull());
        MissionRepository missions = mock(MissionRepository.class);
        var lifecycle = lifecycle(quotas, missions);
        SystemException error =
                assertThrows(
                        SystemException.class, () -> lifecycle.create(createRequest(), "customer"));
        assertEquals(HttpStatus.NOT_FOUND, error.getStatus());
        verify(missions, never()).save(any());
    }

    @Test
    void createChecksPlannedHoursOfTheNewMissionAgainstQuota() {
        QuotaService quotas = mock(QuotaService.class);
        doThrow(SystemException.conflict("over", "QUOTA_FLIGHT_HOURS_EXCEEDED"))
                .when(quotas)
                .checkCanSchedule(5L, 3.0, null);
        MissionRepository missions = mock(MissionRepository.class);
        SystemException error =
                assertThrows(
                        SystemException.class,
                        () -> lifecycle(quotas, missions).create(createRequest(), "customer"));
        assertEquals("QUOTA_FLIGHT_HOURS_EXCEEDED", error.getCode());
        verify(missions, never()).save(any());
    }

    private MissionCreateRequest createRequest() {
        LocalDateTime start = LocalDateTime.now().plusDays(2).withNano(0);
        return new MissionCreateRequest(
                MissionType.AREA_INSPECTION,
                "Inspect",
                null,
                start.toLocalDate(),
                start,
                start.plusHours(3),
                "Hanoi",
                null,
                null,
                null,
                MissionPriority.NORMAL,
                null);
    }

    private TestLifecycle lifecycle(QuotaService quotas) {
        return lifecycle(quotas, mock(MissionRepository.class));
    }

    private TestLifecycle lifecycle(QuotaService quotas, MissionRepository missions) {
        MissionAccessService access = mock(MissionAccessService.class);
        AppUser customer = user("customer");
        customer.setId(5L);
        when(access.user("customer")).thenReturn(customer);
        return new TestLifecycle(
                missions,
                quotas,
                access,
                new MissionBillingServiceImpl(null, null),
                org.mapstruct.factory.Mappers.getMapper(MissionMapper.class));
    }

    /** Exposes the package-private start-window rule with an explicit clock. */
    static final class TestLifecycle extends MissionLifecycleServiceImpl {
        TestLifecycle(
                MissionRepository missions,
                QuotaService quotas,
                MissionAccessService access,
                MissionBillingService billing,
                MissionMapper mapper) {
            super(
                    missions,
                    mock(ServiceOfferingRepository.class),
                    mock(AuditLogService.class),
                    mock(MissionEventRepository.class),
                    quotas,
                    mock(MissionMediaRepository.class),
                    access,
                    mock(MissionEventService.class),
                    mock(MissionResourceService.class),
                    billing,
                    mapper);
        }

        void requireStartWindowAt(Mission mission, LocalDateTime now) {
            requireStartWindow(mission, now);
        }
    }

    private MissionService service(Mission mission, String actor) {
        MissionRepository missions = mock(MissionRepository.class);
        when(missions.findById(1L)).thenReturn(Optional.of(mission));
        when(missions.findByIdForUpdate(1L)).thenReturn(Optional.of(mission));
        UserRepository users = mock(UserRepository.class);
        when(users.findByUsername(actor)).thenReturn(Optional.of(user(actor)));
        PermissionService permissions = mock(PermissionService.class);
        when(permissions.has(any(), eq("MISSION_VIEW_ALL"))).thenReturn(true);
        return com.uav.platform.support.MissionServiceFixture.create(
                missions,
                mock(ServiceOfferingRepository.class),
                users,
                permissions,
                audit,
                events,
                mock(StationRepository.class),
                mock(UavRepository.class),
                mock(EquipmentRepository.class),
                mock(InventoryService.class),
                mock(MissionEquipmentReservationRepository.class));
    }

    private Mission inProgressWithUav() {
        Mission mission = missionAt(MissionStatus.IN_PROGRESS, LocalDateTime.now());
        Uav uav = new Uav("Model", "UAV-FORCE", "Maker");
        uav.setStatus(UavStatus.IN_USE);
        MissionOperations.assignUav(mission, uav);
        MissionOperations.assignOperator(mission, user("operator"));
        return mission;
    }

    private static AppUser user(String name) {
        return new AppUser(name, name + "@close.vn", "hash", null, UserStatus.ACTIVE);
    }

    private static UsernamePasswordAuthenticationToken auth(String username) {
        return UsernamePasswordAuthenticationToken.authenticated(username, "n/a", List.of());
    }

    private static Mission missionAt(MissionStatus target, LocalDateTime start) {
        Mission m =
                MissionOperations.draft(
                        user("customer"),
                        MissionType.AREA_INSPECTION,
                        "Inspect",
                        null,
                        LocalDate.from(start),
                        start,
                        start.plusHours(2),
                        "Hanoi",
                        null,
                        null,
                        MissionPriority.NORMAL,
                        null);
        m.setId(1L);
        m.setCode("MSN-2030-000001");
        for (MissionStatus status :
                List.of(
                        MissionStatus.PENDING_CONFIRMATION,
                        MissionStatus.CONFIRMED,
                        MissionStatus.RESOURCE_RESERVED,
                        MissionStatus.READY,
                        MissionStatus.IN_PROGRESS)) {
            if (m.getStatus() == target) break;
            MissionOperations.transitionTo(m, status);
        }
        return m;
    }
}
