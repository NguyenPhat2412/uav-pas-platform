package com.uav.platform.service.impl.simulation;

import com.uav.platform.dto.record.simulation.SimFlightSettings;
import com.uav.platform.dto.request.simulation.SimulationStartRequest;
import com.uav.platform.dto.request.simulation.SurveyPlanRequest;
import com.uav.platform.dto.request.uav.TelemetryReportRequest;
import com.uav.platform.dto.response.mission.FlightPlanResponse;
import com.uav.platform.dto.response.simulation.SimulationStateResponse;
import com.uav.platform.dto.response.simulation.SurveyPlanResponse;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.uav.Uav;
import com.uav.platform.enums.audit.AuditAction;
import com.uav.platform.enums.simulation.SimCommand;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.mission.MissionRepository;
import com.uav.platform.repository.uav.UavRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.impl.mission.FlightPlanOperations;
import com.uav.platform.service.simulation.SimulationService;
import com.uav.platform.service.uav.TelemetryService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Runs simulated flights in memory and pushes their telemetry through {@link TelemetryService}, the
 * same path a ground-station gateway uses, so fleet maps, mission tracking and the SAR cockpit work
 * unchanged. Sessions live only as long as the backend process.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SimulationServiceImpl implements SimulationService {
    static final int MAX_SESSIONS = 10;
    static final String REPORTER = "simulator";
    static final double DEFAULT_ALTITUDE_M = 50;
    static final double DEFAULT_SPEED_MS = 8;
    static final int DEFAULT_LATENCY_MS = 150;
    static final int DEFAULT_JITTER_MS = 50;
    static final int DEFAULT_SIDE_OVERLAP = 65;

    /** Geofence margin beyond the farthest planned point when no radius is given. */
    static final double GEOFENCE_MARGIN_M = 300;

    private final UavRepository uavs;
    private final MissionRepository missions;
    private final TelemetryService telemetry;
    private final AuditLogService audit;

    private final Map<Long, SimulatedFlightOperations> flights = new ConcurrentHashMap<>();
    private final Map<Long, String> labels = new ConcurrentHashMap<>();
    private final Random random = new Random();

    @Override
    // Read-write: the audit entry is written in this transaction.
    @Transactional
    public SimulationStateResponse start(SimulationStartRequest r, String operator) {
        Uav uav =
                uavs.findById(r.uavId())
                        .orElseThrow(() -> SystemException.notFound("UAV not found"));
        SimulatedFlightOperations running = flights.get(uav.getId());
        if (running != null && !running.finished())
            throw SystemException.conflict(
                    "UAV đang có chuyến bay mô phỏng.", "SIM_ALREADY_RUNNING");
        if (running == null && flights.size() >= MAX_SESSIONS)
            throw SystemException.conflict(
                    "Đã đạt tối đa " + MAX_SESSIONS + " chuyến bay mô phỏng.", "SIM_LIMIT_REACHED");

        FlightPlanResponse plan = null;
        if (r.missionId() != null) {
            Mission mission =
                    missions.findById(r.missionId())
                            .orElseThrow(() -> SystemException.notFound("Mission not found"));
            if (mission.getUav() == null || !uav.getId().equals(mission.getUav().getId()))
                throw SystemException.badRequest(
                        "Nhiệm vụ không được gán cho UAV này.", "TELEMETRY_MISSION_UAV_MISMATCH");
            plan = FlightPlanOperations.read(mission.getFlightPlan());
        }

        double altitude =
                r.altitudeMeters() != null
                        ? r.altitudeMeters()
                        : plan != null && plan.altitudeAglMeters() != null
                                ? plan.altitudeAglMeters()
                                : DEFAULT_ALTITUDE_M;
        double speed = r.cruiseSpeedMs() != null ? r.cruiseSpeedMs() : DEFAULT_SPEED_MS;

        List<List<Double>> waypoints = r.waypoints() != null ? r.waypoints() : List.of();
        if (waypoints.isEmpty()
                && plan != null
                && "POLYGON".equals(plan.areaType())
                && plan.vertices().size() >= 3) {
            int overlap = plan.sideOverlap() != null ? plan.sideOverlap() : DEFAULT_SIDE_OVERLAP;
            waypoints =
                    SurveyPatternOperations.plan(
                            plan.vertices(),
                            SurveyPatternOperations.lineSpacingFor(altitude, overlap));
        }
        for (List<Double> p : waypoints)
            if (Math.abs(p.get(0)) > 90 || Math.abs(p.get(1)) > 180)
                throw SystemException.badRequest(
                        "Toạ độ điểm bay không hợp lệ.", "SIM_WAYPOINT_INVALID");

        double[] home = home(r, plan, uav, waypoints);
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

        var settings =
                new SimFlightSettings(
                        altitude,
                        speed,
                        r.packetLossPct() != null ? r.packetLossPct() : 0,
                        r.latencyMs() != null ? r.latencyMs() : DEFAULT_LATENCY_MS,
                        r.jitterMs() != null ? r.jitterMs() : DEFAULT_JITTER_MS,
                        geofence);
        var flight =
                new SimulatedFlightOperations(
                        uav.getId(),
                        r.missionId(),
                        waypoints,
                        home[0],
                        home[1],
                        r.batteryPct() != null ? r.batteryPct() : 100,
                        settings,
                        new Random(random.nextLong()),
                        LocalDateTime.now());
        // Audit first: if it fails the request fails without leaving a flight running behind it.
        audit.record(
                null,
                operator,
                AuditAction.CREATE,
                "UAV",
                uav.getId().toString(),
                "Bắt đầu bay mô phỏng: "
                        + waypoints.size()
                        + " điểm, mất gói "
                        + settings.packetLossPct()
                        + "%");
        flights.put(uav.getId(), flight);
        labels.put(uav.getId(), uav.getSerialNumber() + " · " + uav.getModel());
        return toResponse(flight);
    }

    @Override
    public SimulationStateResponse command(Long uavId, SimCommand command, String operator) {
        SimulatedFlightOperations flight = require(uavId);
        synchronized (flight) {
            try {
                flight.command(command, LocalDateTime.now());
            } catch (IllegalStateException e) {
                throw SystemException.conflict(
                        "Lệnh không áp dụng được ở chế độ " + flight.mode() + ".", e.getMessage());
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
    public void stop(Long uavId, String operator) {
        if (flights.remove(uavId) == null)
            throw SystemException.notFound("Không có chuyến bay mô phỏng.", "SIM_NOT_FOUND");
        labels.remove(uavId);
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

    /** One simulation step a second: advance every flight and deliver the samples whose delay passed. */
    @Scheduled(fixedRate = 1000, initialDelay = 1000)
    public void tick() {
        LocalDateTime now = LocalDateTime.now();
        for (SimulatedFlightOperations flight : flights.values()) {
            List<TelemetryReportRequest> ready;
            synchronized (flight) {
                flight.step(1.0, now);
                ready = flight.due(now);
            }
            for (TelemetryReportRequest sample : ready) {
                try {
                    telemetry.ingest(flight.uavId(), sample, REPORTER);
                } catch (RuntimeException e) {
                    // The UAV or mission changed under the simulation: stop rather than spam
                    // errors.
                    log.warn("Simulation for UAV {} stopped: {}", flight.uavId(), e.getMessage());
                    flights.remove(flight.uavId());
                    labels.remove(flight.uavId());
                    break;
                }
            }
        }
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
        throw SystemException.badRequest(
                "Chọn điểm xuất phát hoặc ít nhất một điểm bay.", "SIM_HOME_REQUIRED");
    }

    private SimulationStateResponse toResponse(SimulatedFlightOperations f) {
        synchronized (f) {
            var link = f.linkStats();
            var s = f.settings();
            return new SimulationStateResponse(
                    f.uavId(),
                    labels.getOrDefault(f.uavId(), "UAV #" + f.uavId()),
                    f.missionId(),
                    f.mode(),
                    f.finished(),
                    f.startedAt(),
                    f.elapsedSeconds(),
                    f.latitude(),
                    f.longitude(),
                    round(f.altitude()),
                    round(f.speed()),
                    round(f.heading()),
                    round(f.battery()),
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
                            round(s.geofenceRadiusMeters())),
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

    private static double round(double v) {
        return Math.round(v * 10) / 10.0;
    }
}
