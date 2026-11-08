package com.uav.platform.service.impl.simulation;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.uav.platform.dto.request.simulation.SimulationStartRequest;
import com.uav.platform.dto.request.simulation.SurveyPlanRequest;
import com.uav.platform.dto.request.uav.TelemetryReportRequest;
import com.uav.platform.dto.response.airspace.AirspaceCheckResponse;
import com.uav.platform.dto.response.airspace.AirspaceViolationResponse;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.simulation.SimulationRunLog;
import com.uav.platform.entity.uav.Uav;
import com.uav.platform.enums.airspace.AirspaceZoneType;
import com.uav.platform.enums.simulation.SimCommand;
import com.uav.platform.enums.simulation.SimFlightMode;
import com.uav.platform.enums.simulation.SimRunStatus;
import com.uav.platform.enums.uav.UavStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.mission.MissionRepository;
import com.uav.platform.repository.simulation.SimulationRunLogRepository;
import com.uav.platform.repository.uav.UavRepository;
import com.uav.platform.service.airspace.AirspaceService;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.uav.TelemetryService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

class SimulationServiceImplTest {
    UavRepository uavs = mock(UavRepository.class);
    MissionRepository missions = mock(MissionRepository.class);
    TelemetryService telemetry = mock(TelemetryService.class);
    AuditLogService audit = mock(AuditLogService.class);
    SimulationServiceImpl service = new SimulationServiceImpl(uavs, missions, telemetry, audit);
    Uav uav = new Uav();

    static final String POLYGON_PLAN =
            "{\"areaType\":\"POLYGON\",\"vertices\":[[21.01,105.52],[21.01,105.5239],[21.012,105.5239],[21.012,105.52]],"
                    + "\"takeoffLatitude\":21.0095,\"takeoffLongitude\":105.5195,\"altitudeAglMeters\":50,"
                    + "\"sideOverlap\":65,\"sensors\":[],\"permitSupport\":false}";

    @BeforeEach
    void setUp() {
        uav.setId(3L);
        uav.setModel("Quad X");
        uav.setSerialNumber("SIM-03");
        when(uavs.findById(3L)).thenReturn(Optional.of(uav));
    }

    static SimulationStartRequest request(Long missionId, List<List<Double>> waypoints) {
        return new SimulationStartRequest(
                3L, missionId, waypoints, null, null, null, 10.0, 0.0, 0, 0, null, null);
    }

    @Test
    void sweepsTheMissionPolygonFromItsTakeoffPointAndFeedsTelemetryEverySecond() {
        Mission mission = new Mission();
        mission.setId(9L);
        mission.setUav(uav);
        mission.setFlightPlan(POLYGON_PLAN);
        when(missions.findById(9L)).thenReturn(Optional.of(mission));

        var started = service.start(request(9L, null), "operator");
        assertEquals(List.of(21.0095, 105.5195), started.home());
        assertTrue(
                started.waypointCount() >= 10,
                "a sweep of the polygon, got " + started.waypointCount());
        assertEquals(
                50,
                started.settings().altitudeMeters(),
                1e-9,
                "altitude comes from the flight plan");

        service.tick();
        service.tick();
        var samples = ArgumentCaptor.forClass(TelemetryReportRequest.class);
        verify(telemetry, times(2)).ingest(eq(3L), samples.capture(), eq("simulator"));
        assertEquals(9L, samples.getValue().missionId());
        assertEquals(6, samples.getValue().altitudeAglMeters(), 1e-9, "climbing at 3 m/s");
        verify(audit).record(any(), eq("operator"), any(), eq("UAV"), eq("3"), any());
    }

    @Test
    void refusesAMissionFlownByAnotherUavAndASecondFlightForTheSameUav() {
        Uav other = new Uav();
        other.setId(4L);
        Mission mission = new Mission();
        mission.setUav(other);
        when(missions.findById(9L)).thenReturn(Optional.of(mission));
        assertThrows(SystemException.class, () -> service.start(request(9L, null), "operator"));

        service.start(request(null, List.of(List.of(21.011, 105.521))), "operator");
        assertThrows(
                SystemException.class,
                () -> service.start(request(null, List.of(List.of(21.011, 105.521))), "operator"));
    }

    @Test
    void commandsFollowTheFlightAndStopDiscardsIt() {
        // Home 1.1 km south of the only waypoint, so the flight is still on its way after take-off.
        service.start(
                new SimulationStartRequest(
                        3L,
                        null,
                        List.of(List.of(21.02, 105.52)),
                        21.01,
                        105.52,
                        null,
                        10.0,
                        0.0,
                        0,
                        0,
                        null,
                        null),
                "operator");
        assertThrows(
                SystemException.class,
                () -> service.command(3L, SimCommand.PAUSE, "operator"),
                "still taking off");
        for (int i = 0; i < 20; i++) service.tick();
        assertEquals(SimFlightMode.MISSION, service.state(3L).mode());
        assertEquals(SimFlightMode.HOLD, service.command(3L, SimCommand.PAUSE, "operator").mode());
        assertEquals(1, service.list().size());
        service.stop(3L, "operator");
        assertTrue(service.list().isEmpty());
        assertThrows(SystemException.class, () -> service.state(3L));
    }

    @Test
    void ingestFailureEndsTheSimulationInsteadOfRepeatingTheError() {
        when(telemetry.ingest(eq(3L), any(), any()))
                .thenThrow(SystemException.notFound("UAV not found"));
        service.start(request(null, List.of(List.of(21.011, 105.521))), "operator");
        service.tick();
        assertTrue(service.list().isEmpty());
    }

    @Test
    void startRunsInAWritableTransactionBecauseItWritesTheAuditLog() throws Exception {
        Transactional tx =
                SimulationServiceImpl.class
                        .getMethod("start", SimulationStartRequest.class, String.class)
                        .getAnnotation(Transactional.class);
        assertNotNull(tx);
        assertFalse(tx.readOnly(), "a read-only transaction rejects the audit INSERT (HTTP 500)");
    }

    @Test
    void surveyPlanReportsSpacingLengthAndTime() {
        var plan =
                service.surveyPlan(
                        new SurveyPlanRequest(
                                List.of(
                                        List.of(21.01, 105.52),
                                        List.of(21.01, 105.5239),
                                        List.of(21.012, 105.5239),
                                        List.of(21.012, 105.52)),
                                50.0,
                                65,
                                8.0));
        assertEquals(26.3, plan.lineSpacingMeters(), 0.5);
        assertTrue(plan.lengthMeters() > 2000);
        assertEquals(plan.lengthMeters() / 8 / 60, plan.estimatedMinutes(), 0.1);
    }

    @Test
    void rehearseMissionSelectsAvailableUavAndPersistsRunLogLifecycle() {
        AirspaceService airspace = mock(AirspaceService.class);
        SimulationRunLogRepository runLogs = mock(SimulationRunLogRepository.class);
        SimulationRunLog savedRow = new SimulationRunLog();
        savedRow.setId(77L);
        when(runLogs.save(any()))
                .thenAnswer(
                        inv -> {
                            SimulationRunLog arg = inv.getArgument(0);
                            if (arg.getId() == null) arg.setId(77L);
                            return arg;
                        });
        when(runLogs.findById(77L)).thenReturn(Optional.of(savedRow));

        uav.setStatus(UavStatus.AVAILABLE);
        when(uavs.findAll()).thenReturn(List.of(uav));

        Mission unassigned = new Mission();
        unassigned.setId(42L);
        unassigned.setCode("MS-2026-0042");
        unassigned.setLatitude(BigDecimal.valueOf(21.0285));
        unassigned.setLongitude(BigDecimal.valueOf(105.8542));
        when(missions.findById(42L)).thenReturn(Optional.of(unassigned));

        SimulationServiceImpl fullService =
                new SimulationServiceImpl(uavs, missions, telemetry, audit, airspace, runLogs);

        var started = fullService.rehearseMission(42L, 5.0, 90.0, 2.0, "operator");
        assertEquals(77L, started.runLogId());
        assertEquals("MS-2026-0042", started.missionCode());
        assertEquals(5, started.waypointCount(), "4-quadrant inspection diamond + center pass");
        assertEquals(5.0, started.settings().windSpeedMs(), 1e-9);
        assertEquals(2.0, started.settings().timeScale(), 1e-9);

        fullService.stop(3L, "operator");
        assertEquals(SimRunStatus.ABORTED, savedRow.getStatus());
        assertNotNull(savedRow.getEndedAt());
    }

    @Test
    void tickEnforcesCivilAirspaceAndTriggersAutomaticRthOnProhibitedZone() {
        AirspaceService airspace = mock(AirspaceService.class);
        when(airspace.check(any()))
                .thenReturn(
                        new AirspaceCheckResponse(
                                false,
                                true,
                                false,
                                "BLOCKED",
                                List.of(
                                        new AirspaceViolationResponse(
                                                12L,
                                                "VVNB-PROHIBITED",
                                                "Vùng cấm bay Nội Bài",
                                                AirspaceZoneType.PROHIBITED,
                                                "Cục HKVN",
                                                0,
                                                0.0,
                                                true,
                                                false,
                                                "Vùng cấm bay"))));

        SimulationServiceImpl fullService =
                new SimulationServiceImpl(uavs, missions, telemetry, audit, airspace, null);
        fullService.start(
                new SimulationStartRequest(
                        3L,
                        null,
                        List.of(List.of(21.02, 105.52)),
                        21.01,
                        105.52,
                        30.0,
                        10.0,
                        0.0,
                        0,
                        0,
                        100,
                        5000.0,
                        0.0,
                        0.0,
                        2.0),
                "operator");

        fullService.tick();
        var live = fullService.state(3L);
        assertEquals(1, live.airspaceBreaches());
        assertEquals(SimFlightMode.RETURN_TO_HOME, live.mode());
    }
}
