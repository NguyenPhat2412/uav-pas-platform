package com.uav.platform.service.impl.simulation;

import com.uav.platform.dto.record.simulation.SimFlightSettings;
import com.uav.platform.dto.request.airspace.AirspaceCheckRequest;
import com.uav.platform.dto.request.simulation.SimulationStartRequest;
import com.uav.platform.dto.request.simulation.SurveyPlanRequest;
import com.uav.platform.dto.request.uav.TelemetryReportRequest;
import com.uav.platform.dto.response.airspace.AirspaceCheckResponse;
import com.uav.platform.dto.response.airspace.AirspaceViolationResponse;
import com.uav.platform.dto.response.mission.FlightPlanResponse;
import com.uav.platform.dto.response.simulation.SimulationRunLogResponse;
import com.uav.platform.dto.response.simulation.SimulationStateResponse;
import com.uav.platform.dto.response.simulation.SurveyPlanResponse;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.simulation.SimulationRunLog;
import com.uav.platform.entity.uav.Uav;
import com.uav.platform.enums.audit.AuditAction;
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
import com.uav.platform.service.impl.mission.FlightPlanOperations;
import com.uav.platform.service.simulation.SimulationService;
import com.uav.platform.service.uav.TelemetryService;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Runs simulated flights in memory and pushes their telemetry through {@link TelemetryService}, the
 * same path a ground-station gateway uses, so fleet maps, mission tracking and the SAR cockpit work
 * unchanged. Completed and aborted rehearsals are persisted to {@code simulation_run_logs}.
 */
@Slf4j
@Service
public class SimulationServiceImpl implements SimulationService {
    static final int MAX_SESSIONS = 10;
    static final String REPORTER = "simulator";
    static final double DEFAULT_ALTITUDE_M = 50;
    static final double DEFAULT_SPEED_MS = 8;
    static final int DEFAULT_LATENCY_MS = 150;
    static final int DEFAULT_JITTER_MS = 50;
    static final int DEFAULT_SIDE_OVERLAP = 65;
    static final double METERS_PER_DEG_LAT = 111_320.0;

    /** Geofence margin beyond the farthest planned point when no radius is given. */
    static final double GEOFENCE_MARGIN_M = 300;

    private final UavRepository uavs;
    private final MissionRepository missions;
    private final TelemetryService telemetry;
    private final AuditLogService audit;
    private final AirspaceService airspace;
    private final SimulationRunLogRepository runLogs;

    private final Map<Long, SimulatedFlightOperations> flights = new ConcurrentHashMap<>();
    private final Map<Long, String> labels = new ConcurrentHashMap<>();
    private final Set<Long> finalizedRuns = ConcurrentHashMap.newKeySet();
    private final Random random = new Random();

    @Autowired
    public SimulationServiceImpl(
            UavRepository uavs,
            MissionRepository missions,
            TelemetryService telemetry,
            AuditLogService audit,
            AirspaceService airspace,
            SimulationRunLogRepository runLogs) {
        this.uavs = uavs;
        this.missions = missions;
        this.telemetry = telemetry;
        this.audit = audit;
        this.airspace = airspace;
        this.runLogs = runLogs;
    }

    public SimulationServiceImpl(
            UavRepository uavs,
            MissionRepository missions,
            TelemetryService telemetry,
            AuditLogService audit) {
        this(uavs, missions, telemetry, audit, null, null);
    }

    @Override
    // Read-write: audit entry and simulation_run_logs row are written in this transaction.
    @Transactional
    public SimulationStateResponse start(SimulationStartRequest r, String operator) {
        return startInternal(r, null, operator);
    }

    @Override
    @Transactional
    public SimulationStateResponse rehearseMission(
            Long missionId,
            Double windSpeedMs,
            Double windDirectionDeg,
            Double timeScale,
            String operator) {
        Mission mission =
                missions.findById(missionId)
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "Không tìm thấy nhiệm vụ được chọn.",
                                                "MISSION_NOT_FOUND"));

        Uav selectedUav = null;
        Long telemetryMissionId = null;

        if (mission.getUav() != null) {
            SimulatedFlightOperations active = flights.get(mission.getUav().getId());
            if (active == null || active.finished()) {
                selectedUav = mission.getUav();
                telemetryMissionId = mission.getId();
            }
        }

        if (selectedUav == null) {
            List<Uav> fleet = uavs.findAll();
            selectedUav =
                    fleet.stream()
                            .filter(u -> u.getStatus() == UavStatus.AVAILABLE)
                            .filter(u -> !hasRunningSession(u.getId()))
                            .findFirst()
                            .orElseGet(
                                    () ->
                                            fleet.stream()
                                                    .filter(u -> !hasRunningSession(u.getId()))
                                                    .findFirst()
                                                    .orElseThrow(
                                                            () ->
                                                                    SystemException.conflict(
                                                                            "Hiện không có thiết bị bay khả dụng để bắt đầu diễn tập.",
                                                                            "SIM_NO_UAV_AVAILABLE")));
        }

        SimulationStartRequest req =
                new SimulationStartRequest(
                        selectedUav.getId(),
                        telemetryMissionId,
                        null,
                        null,
                        null,
                        null,
                        null,
                        0.0,
                        DEFAULT_LATENCY_MS,
                        DEFAULT_JITTER_MS,
                        100,
                        null,
                        windSpeedMs != null ? windSpeedMs : 3.5,
                        windDirectionDeg != null ? windDirectionDeg : 120.0,
                        timeScale != null ? timeScale : 2.0);

        return startInternal(req, mission, operator);
    }

    private SimulationStateResponse startInternal(
            SimulationStartRequest r, Mission rehearsalContextMission, String operator) {
        Uav uav =
                uavs.findById(r.uavId())
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "Không tìm thấy thiết bị bay UAV.",
                                                "UAV_NOT_FOUND"));
        SimulatedFlightOperations running = flights.get(uav.getId());
        if (running != null && !running.finished())
            throw SystemException.conflict(
                    "UAV đang có chuyến bay mô phỏng.", "SIM_ALREADY_RUNNING");

        long activeCount = flights.values().stream().filter(f -> !f.finished()).count();
        if (running == null && activeCount >= MAX_SESSIONS)
            throw SystemException.conflict(
                    "Đã đạt tối đa " + MAX_SESSIONS + " chuyến bay mô phỏng.", "SIM_LIMIT_REACHED");

        Mission mission = rehearsalContextMission;
        if (r.missionId() != null) {
            Mission assignedMission =
                    missions.findById(r.missionId())
                            .orElseThrow(
                                    () ->
                                            SystemException.notFound(
                                                    "Không tìm thấy nhiệm vụ bay.",
                                                    "MISSION_NOT_FOUND"));
            if (assignedMission.getUav() == null
                    || !uav.getId().equals(assignedMission.getUav().getId()))
                throw SystemException.badRequest(
                        "Nhiệm vụ không được gán cho UAV này.", "TELEMETRY_MISSION_UAV_MISMATCH");
            mission = assignedMission;
        }

        FlightPlanResponse plan =
                mission != null ? FlightPlanOperations.read(mission.getFlightPlan()) : null;

        double altitude =
                r.altitudeMeters() != null
                        ? r.altitudeMeters()
                        : plan != null && plan.altitudeAglMeters() != null
                                ? plan.altitudeAglMeters()
                                : DEFAULT_ALTITUDE_M;
        double speed = r.cruiseSpeedMs() != null ? r.cruiseSpeedMs() : DEFAULT_SPEED_MS;

        List<List<Double>> waypoints = r.waypoints() != null ? r.waypoints() : List.of();
        if (waypoints.isEmpty() && (plan != null || mission != null)) {
            waypoints = buildMissionWaypoints(plan, mission, altitude);
        }
        for (List<Double> p : waypoints)
            if (Math.abs(p.get(0)) > 90 || Math.abs(p.get(1)) > 180)
                throw SystemException.badRequest(
                        "Toạ độ điểm bay không hợp lệ.", "SIM_WAYPOINT_INVALID");

        double[] home = home(r, plan, mission, uav, waypoints);
        double farthest = 0;
        for (List<Double> p : waypoints)
            farthest =
                    Math.max(
                            farthest,
                            SurveyPatternOperations.haversine(
                                    home[0], home[1], p.get(0), p.get(1)));
        double geofence =
                r.geofenceRadiusMeters() != null
                        ? r.geofenceRadiusMeters()
                        : Math.max(500, farthest + GEOFENCE_MARGIN_M);

        double windSpeed = r.windSpeedMs() != null ? r.windSpeedMs() : 0.0;
        double windDir = r.windDirectionDeg() != null ? r.windDirectionDeg() : 0.0;
        double timeScale = r.timeScale() != null ? r.timeScale() : 1.0;

        var settings =
                new SimFlightSettings(
                        altitude,
                        speed,
                        r.packetLossPct() != null ? r.packetLossPct() : 0,
                        r.latencyMs() != null ? r.latencyMs() : DEFAULT_LATENCY_MS,
                        r.jitterMs() != null ? r.jitterMs() : DEFAULT_JITTER_MS,
                        geofence,
                        windSpeed,
                        windDir,
                        timeScale);

        int startBattery = r.batteryPct() != null ? r.batteryPct() : 100;
        LocalDateTime startedAt = LocalDateTime.now();
        var flight =
                new SimulatedFlightOperations(
                        uav.getId(),
                        r.missionId(),
                        waypoints,
                        home[0],
                        home[1],
                        startBattery,
                        settings,
                        new Random(random.nextLong()),
                        startedAt);

        String uavLabel = uav.getSerialNumber() + " · " + uav.getModel();
        if (mission != null) {
            flight.setMissionCode(mission.getCode());
        }

        // Audit first: if it fails the request fails without leaving a flight running behind it.
        audit.record(
                null,
                operator,
                AuditAction.CREATE,
                "UAV",
                uav.getId().toString(),
                "Bắt đầu bay mô phỏng"
                        + (mission != null && mission.getCode() != null
                                ? " (" + mission.getCode() + ")"
                                : "")
                        + ": "
                        + waypoints.size()
                        + " điểm, gió "
                        + round(windSpeed)
                        + " m/s, tốc độ thời gian "
                        + round(timeScale)
                        + "x");

        if (runLogs != null) {
            SimulationRunLog logEntry = new SimulationRunLog();
            logEntry.setUavId(uav.getId());
            logEntry.setUavCode(uavLabel);
            logEntry.setMissionId(mission != null ? mission.getId() : r.missionId());
            logEntry.setMissionCode(mission != null ? mission.getCode() : null);
            logEntry.setStartedBy(operator != null ? operator : "system");
            logEntry.setStatus(SimRunStatus.RUNNING);
            logEntry.setAltitudeM(altitude);
            logEntry.setCruiseSpeedMs(speed);
            logEntry.setWindSpeedMs(windSpeed);
            logEntry.setWindDirectionDeg(windDir);
            logEntry.setTimeScale(timeScale);
            logEntry.setPacketLossPct(settings.packetLossPct());
            logEntry.setLatencyMs(settings.latencyMs());
            logEntry.setStartBatteryPct(startBattery);
            logEntry.setWaypointCount(waypoints.size());
            logEntry.setWaypointsReached(0);
            logEntry.setDistanceFlownM(0);
            logEntry.setElapsedSeconds(0);
            logEntry.setSamplesSent(0);
            logEntry.setSamplesDelivered(0);
            logEntry.setSamplesLost(0);
            logEntry.setAirspaceBreaches(0);
            logEntry.setGpsDegraded(false);
            logEntry.setOutcomeSummary("Đang thực hiện bay diễn tập mô phỏng...");
            logEntry.setStartedAt(startedAt);
            SimulationRunLog saved = runLogs.save(logEntry);
            flight.setRunLogId(saved.getId());
        }

        flights.put(uav.getId(), flight);
        labels.put(uav.getId(), uavLabel);
        return toResponse(flight);
    }

    @Override
    @Transactional
    public SimulationStateResponse command(Long uavId, SimCommand command, String operator) {
        SimulatedFlightOperations flight = require(uavId);
        synchronized (flight) {
            try {
                flight.command(command, LocalDateTime.now());
            } catch (IllegalStateException e) {
                throw SystemException.conflict(
                        "Lệnh không áp dụng được khi thiết bị đang "
                                + SimulatedFlightOperations.modeLabelVi(flight.mode())
                                + ".",
                        e.getMessage());
            }
        }
        audit.record(
                null,
                operator,
                AuditAction.STATUS_CHANGE,
                "UAV",
                uavId.toString(),
                "Lệnh mô phỏng: " + command);
        return toResponse(flight);
    }

    @Override
    @Transactional
    public void stop(Long uavId, String operator) {
        SimulatedFlightOperations removed = flights.remove(uavId);
        if (removed == null)
            throw SystemException.notFound("Không có chuyến bay mô phỏng.", "SIM_NOT_FOUND");
        labels.remove(uavId);
        finalizeRunLog(removed, true, LocalDateTime.now());
        audit.record(
                null,
                operator,
                AuditAction.DELETE,
                "UAV",
                uavId.toString(),
                "Kết thúc bay mô phỏng");
    }

    @Override
    public SimulationStateResponse state(Long uavId) {
        return toResponse(require(uavId));
    }

    @Override
    public List<SimulationStateResponse> list() {
        List<SimulationStateResponse> all = new ArrayList<>();
        for (SimulatedFlightOperations f : flights.values()) all.add(toResponse(f));
        all.sort(Comparator.comparing(SimulationStateResponse::uavId));
        return all;
    }

    @Override
    @Transactional(readOnly = true)
    public List<SimulationRunLogResponse> runs(Long uavId, Long missionId) {
        if (runLogs == null) return List.of();
        List<SimulationRunLog> rows;
        if (missionId != null) {
            rows = runLogs.findTop25ByMissionIdOrderByStartedAtDesc(missionId);
        } else if (uavId != null) {
            rows = runLogs.findTop25ByUavIdOrderByStartedAtDesc(uavId);
        } else {
            rows = runLogs.findTop25ByOrderByStartedAtDesc();
        }
        return rows.stream().map(this::toRunLogResponse).toList();
    }

    @Override
    public SurveyPlanResponse surveyPlan(SurveyPlanRequest r) {
        double altitude = r.altitudeMeters() != null ? r.altitudeMeters() : DEFAULT_ALTITUDE_M;
        double spacing =
                SurveyPatternOperations.lineSpacingFor(
                        altitude,
                        r.sideOverlapPercent() != null
                                ? r.sideOverlapPercent()
                                : DEFAULT_SIDE_OVERLAP);
        List<List<Double>> waypoints;
        try {
            waypoints = SurveyPatternOperations.plan(r.vertices(), spacing);
        } catch (IllegalArgumentException e) {
            throw SystemException.badRequest(
                    "Vùng khảo sát không hợp lệ.", "SIM_SURVEY_AREA_INVALID");
        }
        double length = SurveyPatternOperations.pathLength(waypoints);
        double speed = r.cruiseSpeedMs() != null ? r.cruiseSpeedMs() : DEFAULT_SPEED_MS;
        return new SurveyPlanResponse(
                waypoints, round(spacing), round(length), round(length / speed / 60));
    }

    /** One simulation step a second: advance every flight, enforce civil airspace, and deliver due samples. */
    @Scheduled(fixedRate = 1000, initialDelay = 1000)
    public void tick() {
        LocalDateTime now = LocalDateTime.now();
        for (SimulatedFlightOperations flight : flights.values()) {
            List<TelemetryReportRequest> ready;
            double checkLat;
            double checkLng;
            int checkAlt;
            boolean airborneForAirspace;
            synchronized (flight) {
                flight.step(flight.settings().timeScale(), now);
                ready = flight.due(now);
                checkLat = flight.latitude();
                checkLng = flight.longitude();
                checkAlt = (int) Math.round(flight.altitude());
                airborneForAirspace =
                        flight.mode() != SimFlightMode.LANDING
                                && flight.mode() != SimFlightMode.LANDED;
            }

            if (airspace != null && airborneForAirspace) {
                evaluateAirspaceSafety(flight, checkLat, checkLng, checkAlt, now);
            }

            boolean abortedOnIngestError = false;
            for (TelemetryReportRequest sample : ready) {
                try {
                    telemetry.ingest(flight.uavId(), sample, REPORTER);
                } catch (RuntimeException e) {
                    // The UAV or mission changed under the simulation: stop rather than spam
                    // errors.
                    log.warn("Simulation for UAV {} stopped: {}", flight.uavId(), e.getMessage());
                    flights.remove(flight.uavId());
                    labels.remove(flight.uavId());
                    finalizeRunLog(flight, true, now);
                    abortedOnIngestError = true;
                    break;
                }
            }

            if (!abortedOnIngestError && flight.finished()) {
                finalizeRunLog(flight, false, now);
            }
        }
    }

    private void evaluateAirspaceSafety(
            SimulatedFlightOperations flight,
            double lat,
            double lng,
            int altitudeAglM,
            LocalDateTime now) {
        try {
            AirspaceCheckResponse check =
                    airspace.check(
                            new AirspaceCheckRequest(
                                    "POINT",
                                    null,
                                    null,
                                    lat,
                                    lng,
                                    Math.max(0, altitudeAglM),
                                    now,
                                    now.plusMinutes(5)));
            if (check == null || check.violations() == null || check.violations().isEmpty()) {
                return;
            }
            synchronized (flight) {
                for (AirspaceViolationResponse v : check.violations()) {
                    boolean ceilingExceeded =
                            v.requiresPermit()
                                    && v.maxAltitudeAglM() != null
                                    && flight.altitude() > v.maxAltitudeAglM();
                    boolean triggerRth = v.blocking() || ceilingExceeded;
                    flight.notifyAirspaceViolation(
                            v.zoneId() != null ? v.zoneId() : -1L,
                            v.code(),
                            v.name(),
                            triggerRth,
                            now);
                }
            }
        } catch (RuntimeException e) {
            log.debug(
                    "Airspace check skipped for simulated UAV {}: {}",
                    flight.uavId(),
                    e.getMessage());
        }
    }

    private void finalizeRunLog(
            SimulatedFlightOperations flight, boolean abortedByOperator, LocalDateTime endedAt) {
        if (runLogs == null) return;
        Long runLogId;
        synchronized (flight) {
            runLogId = flight.runLogId();
        }
        if (runLogId == null || !finalizedRuns.add(runLogId)) return;
        try {
            runLogs.findById(runLogId)
                    .ifPresent(
                            entry -> {
                                synchronized (flight) {
                                    var link = flight.linkStats();
                                    entry.setStatus(flight.terminalRunStatus(abortedByOperator));
                                    entry.setEndBatteryPct(round(flight.battery()));
                                    entry.setWaypointsReached(
                                            Math.min(
                                                    flight.nextWaypoint(),
                                                    flight.waypoints().size()));
                                    entry.setDistanceFlownM(round(flight.distanceFlown()));
                                    entry.setElapsedSeconds(round(flight.elapsedSeconds()));
                                    entry.setSamplesSent(link.sent());
                                    entry.setSamplesDelivered(link.delivered());
                                    entry.setSamplesLost(link.lost());
                                    entry.setAirspaceBreaches(flight.airspaceBreaches());
                                    entry.setGpsDegraded(flight.gpsDegraded());
                                    entry.setOutcomeSummary(
                                            flight.outcomeSummary(abortedByOperator));
                                    entry.setEndedAt(endedAt);
                                }
                                runLogs.save(entry);
                            });
        } catch (RuntimeException e) {
            log.warn("Could not finalize simulation run log {}: {}", runLogId, e.getMessage());
        }
    }

    private boolean hasRunningSession(Long uavId) {
        SimulatedFlightOperations f = flights.get(uavId);
        return f != null && !f.finished();
    }

    private static List<List<Double>> buildMissionWaypoints(
            FlightPlanResponse plan, Mission mission, double altitude) {
        if (plan != null
                && "POLYGON".equals(plan.areaType())
                && plan.vertices() != null
                && plan.vertices().size() >= 3) {
            int overlap = plan.sideOverlap() != null ? plan.sideOverlap() : DEFAULT_SIDE_OVERLAP;
            return SurveyPatternOperations.plan(
                    plan.vertices(), SurveyPatternOperations.lineSpacingFor(altitude, overlap));
        }

        double[] target = resolveTargetCenter(plan, mission);
        if (target == null) return List.of();

        if (plan != null && "CIRCLE".equals(plan.areaType())) {
            double radiusM =
                    plan.radiusMeters() != null && plan.radiusMeters() > 0
                            ? Math.min(plan.radiusMeters(), 800.0)
                            : 120.0;
            List<List<Double>> orbit = new ArrayList<>(13);
            double cosLat = Math.max(0.1, Math.cos(Math.toRadians(target[0])));
            for (int i = 0; i < 12; i++) {
                double angle = (2.0 * Math.PI * i) / 12.0;
                double dLat = (radiusM * Math.cos(angle)) / METERS_PER_DEG_LAT;
                double dLng = (radiusM * Math.sin(angle)) / (METERS_PER_DEG_LAT * cosLat);
                orbit.add(List.of(roundCoord(target[0] + dLat), roundCoord(target[1] + dLng)));
            }
            orbit.add(List.of(roundCoord(target[0]), roundCoord(target[1])));
            return orbit;
        }

        // POINT or mission coordinates without polygon: 4-quadrant inspection diamond + center pass
        double stepM = 60.0;
        double dLat = stepM / METERS_PER_DEG_LAT;
        double dLng =
                stepM / (METERS_PER_DEG_LAT * Math.max(0.1, Math.cos(Math.toRadians(target[0]))));
        return List.of(
                List.of(roundCoord(target[0] + dLat), roundCoord(target[1])),
                List.of(roundCoord(target[0]), roundCoord(target[1] + dLng)),
                List.of(roundCoord(target[0] - dLat), roundCoord(target[1])),
                List.of(roundCoord(target[0]), roundCoord(target[1] - dLng)),
                List.of(roundCoord(target[0]), roundCoord(target[1])));
    }

    private static double[] resolveTargetCenter(FlightPlanResponse plan, Mission mission) {
        if (plan != null && plan.centerLatitude() != null && plan.centerLongitude() != null) {
            return new double[] {plan.centerLatitude(), plan.centerLongitude()};
        }
        if (plan != null && plan.vertices() != null && !plan.vertices().isEmpty()) {
            List<Double> v = plan.vertices().get(0);
            if (v != null && v.size() >= 2 && v.get(0) != null && v.get(1) != null) {
                return new double[] {v.get(0), v.get(1)};
            }
        }
        if (mission != null && mission.getLatitude() != null && mission.getLongitude() != null) {
            return new double[] {
                mission.getLatitude().doubleValue(), mission.getLongitude().doubleValue()
            };
        }
        if (plan != null && plan.takeoffLatitude() != null && plan.takeoffLongitude() != null) {
            return new double[] {plan.takeoffLatitude(), plan.takeoffLongitude()};
        }
        return null;
    }

    private SimulatedFlightOperations require(Long uavId) {
        SimulatedFlightOperations flight = flights.get(uavId);
        if (flight == null)
            throw SystemException.notFound("Không có chuyến bay mô phỏng.", "SIM_NOT_FOUND");
        return flight;
    }

    private static double[] home(
            SimulationStartRequest r,
            FlightPlanResponse plan,
            Mission mission,
            Uav uav,
            List<List<Double>> waypoints) {
        if (r.homeLatitude() != null && r.homeLongitude() != null)
            return new double[] {r.homeLatitude(), r.homeLongitude()};
        if (plan != null && plan.takeoffLatitude() != null && plan.takeoffLongitude() != null)
            return new double[] {plan.takeoffLatitude(), plan.takeoffLongitude()};
        if (uav.getStation() != null
                && uav.getStation().getLatitude() != null
                && uav.getStation().getLongitude() != null)
            return new double[] {uav.getStation().getLatitude(), uav.getStation().getLongitude()};
        if (!waypoints.isEmpty())
            return new double[] {waypoints.get(0).get(0), waypoints.get(0).get(1)};
        if (mission != null && mission.getLatitude() != null && mission.getLongitude() != null)
            return new double[] {
                mission.getLatitude().doubleValue(), mission.getLongitude().doubleValue()
            };
        throw SystemException.badRequest(
                "Chọn điểm xuất phát hoặc ít nhất một điểm bay.", "SIM_HOME_REQUIRED");
    }

    private SimulationStateResponse toResponse(SimulatedFlightOperations f) {
        synchronized (f) {
            var link = f.linkStats();
            var s = f.settings();
            return new SimulationStateResponse(
                    f.runLogId(),
                    f.uavId(),
                    labels.getOrDefault(f.uavId(), "UAV #" + f.uavId()),
                    f.missionId(),
                    f.missionCode(),
                    f.mode(),
                    f.finished(),
                    f.startedAt(),
                    round(f.elapsedSeconds()),
                    f.latitude(),
                    f.longitude(),
                    round(f.altitude()),
                    round(f.speed()),
                    round(f.heading()),
                    round(f.battery()),
                    f.rtkStatus(),
                    f.satelliteCount(),
                    f.airspaceBreaches(),
                    f.gpsDegraded(),
                    f.nextWaypoint(),
                    f.waypoints().size(),
                    round(f.distanceFlown()),
                    round(f.distanceToHome()),
                    List.of(f.homeLat(), f.homeLng()),
                    f.waypoints(),
                    f.track(),
                    new SimulationStateResponse.Settings(
                            s.altitudeMeters(),
                            s.cruiseSpeedMs(),
                            s.packetLossPct(),
                            s.latencyMs(),
                            s.jitterMs(),
                            round(s.geofenceRadiusMeters()),
                            round(s.windSpeedMs()),
                            round(s.windDirectionDeg()),
                            round(s.timeScale())),
                    new SimulationStateResponse.Link(
                            link.sent(),
                            link.delivered(),
                            link.lost(),
                            link.sent() == 0 ? 0 : round(100.0 * link.lost() / link.sent()),
                            round(link.averageLatencyMs()),
                            link.maxLatencyMs()),
                    f.events().stream()
                            .map(
                                    e ->
                                            new SimulationStateResponse.Event(
                                                    e.at(), e.level(), e.message()))
                            .toList());
        }
    }

    private SimulationRunLogResponse toRunLogResponse(SimulationRunLog logEntry) {
        return new SimulationRunLogResponse(
                logEntry.getId(),
                logEntry.getUavId(),
                logEntry.getUavCode(),
                logEntry.getMissionId(),
                logEntry.getMissionCode(),
                logEntry.getStartedBy(),
                logEntry.getStatus(),
                logEntry.getAltitudeM(),
                logEntry.getCruiseSpeedMs(),
                logEntry.getWindSpeedMs(),
                logEntry.getWindDirectionDeg(),
                logEntry.getTimeScale(),
                logEntry.getPacketLossPct(),
                logEntry.getLatencyMs(),
                logEntry.getStartBatteryPct(),
                logEntry.getEndBatteryPct(),
                logEntry.getWaypointCount(),
                logEntry.getWaypointsReached(),
                logEntry.getDistanceFlownM(),
                logEntry.getElapsedSeconds(),
                logEntry.getSamplesSent(),
                logEntry.getSamplesDelivered(),
                logEntry.getSamplesLost(),
                logEntry.getAirspaceBreaches(),
                logEntry.isGpsDegraded(),
                logEntry.getOutcomeSummary(),
                logEntry.getStartedAt(),
                logEntry.getEndedAt());
    }

    private static double round(double v) {
        return Math.round(v * 10) / 10.0;
    }

    private static double roundCoord(double v) {
        return Math.round(v * 10_000_000d) / 10_000_000d;
    }
}
