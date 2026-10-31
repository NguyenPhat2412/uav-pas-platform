package com.uav.platform.service.uav;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.dto.request.uav.TelemetryReportRequest;
import com.uav.platform.dto.response.uav.TelemetryResponse;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.uav.Uav;
import com.uav.platform.entity.uav.UavTelemetry;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.mission.MissionStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.mission.MissionRepository;
import com.uav.platform.repository.uav.UavRepository;
import com.uav.platform.repository.uav.UavTelemetryRepository;
import com.uav.platform.service.impl.uav.TelemetryServiceImpl;
import com.uav.platform.service.mission.MissionAccessService;
import com.uav.platform.service.permission.PermissionService;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@ExtendWith(MockitoExtension.class)
class TelemetryServiceTest {
    @Mock UavTelemetryRepository telemetry;
    @Mock UavRepository uavs;
    @Mock MissionRepository missions;
    @Mock MissionAccessService missionAccess;
    @Mock PermissionService permissions;
    @InjectMocks TelemetryServiceImpl service;

    private static TelemetryReportRequest sample(LocalDateTime at, Long missionId) {
        return new TelemetryReportRequest(
                at, 21.0285, 105.8542, 80.0, 12.5, 270.0, 76, "FIXED", 18, missionId);
    }

    @Test
    void ingestStoresSampleAndReportsFresh() {
        when(uavs.existsById(1L)).thenReturn(true);
        when(telemetry.save(any())).thenAnswer(i -> i.getArgument(0));
        TelemetryResponse r =
                service.ingest(1L, sample(LocalDateTime.now().minusSeconds(5), null), "gcs-01");
        assertEquals(21.0285, r.latitude(), 1e-7);
        assertEquals("FIXED", r.rtkStatus());
        assertFalse(r.stale());
        verify(telemetry)
                .save(
                        argThat(
                                t ->
                                        "gcs-01".equals(t.getReportedBy())
                                                && t.getReceivedAt() != null));
    }

    @Test
    void ingestRejectsFutureTimestampAndForeignMission() {
        when(uavs.existsById(1L)).thenReturn(true);
        assertThrows(
                SystemException.class,
                () -> service.ingest(1L, sample(LocalDateTime.now().plusMinutes(10), null), "gcs"));
        Uav other = new Uav("M", "SN-2", "A");
        other.setId(2L);
        Mission mission = mock(Mission.class);
        when(mission.getUav()).thenReturn(other);
        when(missions.findById(9L)).thenReturn(Optional.of(mission));
        assertThrows(
                SystemException.class,
                () -> service.ingest(1L, sample(LocalDateTime.now(), 9L), "gcs"));
        verify(telemetry, never()).save(any());
    }

    @Test
    void oldSampleIsStale() {
        UavTelemetry t = new UavTelemetry();
        t.setUavId(3L);
        t.setRecordedAt(LocalDateTime.now().minusMinutes(5));
        t.setLatitude(new BigDecimal("10.0000000"));
        t.setLongitude(new BigDecimal("106.0000000"));
        when(telemetry.latestPerUav()).thenReturn(List.of(t));
        TelemetryResponse r = service.latestForFleet().get(0);
        assertTrue(r.stale());
        assertTrue(r.ageSeconds() >= 300);
    }

    private static UavTelemetry stored(Long uavId, Long missionId) {
        UavTelemetry t = new UavTelemetry();
        t.setUavId(uavId);
        t.setMissionId(missionId);
        t.setRecordedAt(LocalDateTime.now().minusSeconds(3));
        t.setLatitude(new BigDecimal("21.0000000"));
        t.setLongitude(new BigDecimal("105.0000000"));
        return t;
    }

    private Mission mission(MissionStatus status, String operator) {
        Uav uav = new Uav("M", "SN-7", "A");
        uav.setId(7L);
        Mission mission = mock(Mission.class);
        lenient().when(mission.getId()).thenReturn(40L);
        lenient().when(mission.getUav()).thenReturn(uav);
        lenient().when(mission.getStatus()).thenReturn(status);
        AppUser pilot = mock(AppUser.class);
        lenient().when(pilot.getUsername()).thenReturn(operator);
        lenient().when(mission.getOperator()).thenReturn(pilot);
        return mission;
    }

    private static Authentication auth(String name) {
        return UsernamePasswordAuthenticationToken.authenticated(name, "n/a", List.of());
    }

    @Test
    void missionTelemetryOnlyReturnsSamplesTaggedWithThatMission() {
        Authentication customer = auth("customer");
        Mission live = mission(MissionStatus.IN_PROGRESS, "pilot");
        when(missionAccess.accessible(40L, customer)).thenReturn(live);
        when(telemetry.findFirstByUavIdAndMissionIdOrderByRecordedAtDesc(7L, 40L))
                .thenReturn(Optional.of(stored(7L, 40L)));

        TelemetryResponse r = service.latestForMission(40L, customer).orElseThrow();

        assertEquals(40L, r.missionId());
        // Never the UAV-wide latest sample, which may belong to another customer's flight.
        verify(telemetry, never()).findFirstByUavIdOrderByRecordedAtDesc(any());
    }

    @Test
    void missionWithoutOwnSamplesShowsNothingEvenIfTheUavReportedForAnotherMission() {
        Authentication customer = auth("customer");
        Mission live = mission(MissionStatus.IN_PROGRESS, "pilot");
        when(missionAccess.accessible(40L, customer)).thenReturn(live);
        when(telemetry.findFirstByUavIdAndMissionIdOrderByRecordedAtDesc(7L, 40L))
                .thenReturn(Optional.empty());

        assertTrue(service.latestForMission(40L, customer).isEmpty());
    }

    @Test
    void customerSeesPositionOnlyWhileInProgressButStaffCanReviewAfterwards() {
        Mission finished = mission(MissionStatus.COMPLETED, "pilot");
        Authentication customer = auth("customer");
        when(missionAccess.accessible(40L, customer)).thenReturn(finished);
        assertTrue(service.latestForMission(40L, customer).isEmpty());
        verifyNoInteractions(telemetry);

        Authentication pilot = auth("pilot");
        when(missionAccess.accessible(40L, pilot)).thenReturn(finished);
        when(telemetry.findFirstByUavIdAndMissionIdOrderByRecordedAtDesc(7L, 40L))
                .thenReturn(Optional.of(stored(7L, 40L)));
        assertTrue(service.latestForMission(40L, pilot).isPresent(), "assigned operator");

        Authentication commander = auth("commander");
        when(missionAccess.accessible(40L, commander)).thenReturn(finished);
        when(permissions.has(commander, "MISSION_VIEW_ALL")).thenReturn(true);
        assertTrue(service.latestForMission(40L, commander).isPresent(), "MISSION_VIEW_ALL");
    }

    @Test
    void untaggedSampleIsAttachedToTheFlightInProgress() {
        when(uavs.existsById(1L)).thenReturn(true);
        Mission flying = mock(Mission.class);
        when(flying.getId()).thenReturn(40L);
        when(missions.findFirstByUavIdAndStatusOrderByIdDesc(1L, MissionStatus.IN_PROGRESS))
                .thenReturn(Optional.of(flying));
        when(telemetry.save(any())).thenAnswer(i -> i.getArgument(0));
        TelemetryResponse r = service.ingest(1L, sample(LocalDateTime.now(), null), "gcs-01");
        assertEquals(40L, r.missionId());
    }
}
