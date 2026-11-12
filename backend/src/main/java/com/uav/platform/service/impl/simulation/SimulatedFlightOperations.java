package com.uav.platform.service.impl.simulation;

import com.uav.platform.dto.record.simulation.SimFlightEvent;
import com.uav.platform.dto.record.simulation.SimFlightSettings;
import com.uav.platform.dto.record.simulation.SimLinkStats;
import com.uav.platform.dto.record.simulation.SimPendingSample;
import com.uav.platform.dto.request.uav.TelemetryReportRequest;
import com.uav.platform.enums.simulation.SimCommand;
import com.uav.platform.enums.simulation.SimEventLevel;
import com.uav.platform.enums.simulation.SimFlightMode;
import com.uav.platform.enums.simulation.SimRunStatus;

import java.time.LocalDateTime;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;

/**
 * One simulated UAV: a point-mass flight model with wind resistance, flight-mode state machine,
 * battery discharge model, civil airspace / geofence fail-safes, fault injection, and a lossy,
 * delayed telemetry link.
 */
public final class SimulatedFlightOperations {
    static final double CLIMB_RATE_MS = 3.0;
    static final double DESCENT_RATE_MS = 1.5;
    static final double BATTERY_WARN_PCT = 30;
    static final double BATTERY_RETURN_PCT = 20;
    static final double BATTERY_LAND_PCT = 10;
    static final int MAX_TRACK_POINTS = 900;
    static final int MAX_EVENTS = 60;

    private final long uavId;
    private final Long missionId;
    private final List<List<Double>> waypoints;
    private final double homeLat, homeLng;
    private final double startBatteryPct;
    private final SimFlightSettings settings;
    private final Random random;
    private final LocalDateTime startedAt;

    private Long runLogId;
    private String missionCode;
    private double lat, lng, altitude, speed, heading, battery;
    private SimFlightMode mode = SimFlightMode.TAKEOFF;
    private SimFlightMode resumeMode = SimFlightMode.MISSION;
    private int nextWaypoint;
    private double distanceFlown, elapsedSeconds;
    private boolean batteryWarned, geofenceTripped;
    private boolean failsafeRthTriggered, emergencyLandTriggered;
    private boolean gpsDegraded;
    private int airspaceBreaches;
    private String lastRtkStatus = "FIXED";
    private int lastSatelliteCount = 18;
    private final Set<Long> breachedZoneIds = new HashSet<>();

    private final Deque<SimPendingSample> outbox = new ArrayDeque<>();
    private final Deque<List<Double>> track = new ArrayDeque<>();
    private final Deque<SimFlightEvent> events = new ArrayDeque<>();
    private long sent, delivered, lost, latencyTotal, latencyMax;

    public SimulatedFlightOperations(
            long uavId,
            Long missionId,
            List<List<Double>> waypoints,
            double homeLat,
            double homeLng,
            double batteryPct,
            SimFlightSettings settings,
            Random random,
            LocalDateTime now) {
        this.uavId = uavId;
        this.missionId = missionId;
        this.waypoints = List.copyOf(waypoints);
        this.homeLat = homeLat;
        this.homeLng = homeLng;
        this.startBatteryPct = batteryPct;
        this.settings = settings;
        this.random = random;
        this.startedAt = now;
        this.lat = homeLat;
        this.lng = homeLng;
        this.battery = batteryPct;
        track.add(List.of(lat, lng));
        String windNote =
                settings.windSpeedMs() > 0
                        ? " · gió "
                                + Math.round(settings.windSpeedMs() * 10) / 10.0
                                + " m/s ("
                                + Math.round(settings.windDirectionDeg())
                                + "°)"
                        : "";
        log(
                now,
                SimEventLevel.INFO,
                "Cất cánh tới độ cao " + Math.round(settings.altitudeMeters()) + " m" + windNote);
    }

    /** Advances the model by {@code dt} seconds and queues the telemetry sample of this instant. */
    public void step(double dt, LocalDateTime now) {
        if (mode == SimFlightMode.LANDED) return;
        elapsedSeconds += dt;
        switch (mode) {
            case TAKEOFF -> climbTo(settings.altitudeMeters(), dt, now);
            case MISSION -> flyMission(dt, now);
            case HOLD -> speed = 0;
            case RETURN_TO_HOME -> flyHome(dt, now);
            case LANDING -> descend(dt, now);
            default -> {}
        }
        drainBattery(dt);
        checkFailsafes(now);
        emit(now);
    }

    /** Samples whose simulated link delay has elapsed, in send order; they count as delivered. */
    public List<TelemetryReportRequest> due(LocalDateTime now) {
        List<TelemetryReportRequest> ready = new ArrayList<>();
        while (!outbox.isEmpty() && !outbox.peekFirst().deliverAt().isAfter(now)) {
            SimPendingSample p = outbox.pollFirst();
            delivered++;
            latencyTotal += p.latencyMs();
            latencyMax = Math.max(latencyMax, p.latencyMs());
            ready.add(p.report());
        }
        return ready;
    }

    /** Applies an operator command or fault injection trigger. */
    public void command(SimCommand command, LocalDateTime now) {
        switch (command) {
            case PAUSE -> {
                if (mode != SimFlightMode.MISSION && mode != SimFlightMode.RETURN_TO_HOME)
                    throw new IllegalStateException("SIM_COMMAND_NOT_ALLOWED");
                resumeMode = mode;
                mode = SimFlightMode.HOLD;
                log(now, SimEventLevel.INFO, "Tạm dừng giữ vị trí theo lệnh điều hành");
            }
            case RESUME -> {
                if (mode != SimFlightMode.HOLD)
                    throw new IllegalStateException("SIM_COMMAND_NOT_ALLOWED");
                mode =
                        nextWaypoint < waypoints.size()
                                        || resumeMode == SimFlightMode.RETURN_TO_HOME
                                ? resumeMode
                                : SimFlightMode.RETURN_TO_HOME;
                log(now, SimEventLevel.INFO, "Tiếp tục bay");
            }
            case RETURN_TO_HOME -> {
                if (mode == SimFlightMode.LANDING
                        || mode == SimFlightMode.LANDED
                        || mode == SimFlightMode.RETURN_TO_HOME)
                    throw new IllegalStateException("SIM_COMMAND_NOT_ALLOWED");
                mode = SimFlightMode.RETURN_TO_HOME;
                log(now, SimEventLevel.WARNING, "Quay về điểm xuất phát (RTH) theo lệnh điều hành");
            }
            case LAND -> {
                if (mode == SimFlightMode.LANDING || mode == SimFlightMode.LANDED)
                    throw new IllegalStateException("SIM_COMMAND_NOT_ALLOWED");
                mode = SimFlightMode.LANDING;
                log(now, SimEventLevel.WARNING, "Hạ cánh tại chỗ theo lệnh điều hành");
            }
            case SIMULATE_GPS_DEGRADE -> {
                if (mode == SimFlightMode.LANDED)
                    throw new IllegalStateException("SIM_COMMAND_NOT_ALLOWED");
                gpsDegraded = !gpsDegraded;
                if (gpsDegraded) {
                    lastRtkStatus = "SINGLE";
                    lastSatelliteCount = 6;
                    log(
                            now,
                            SimEventLevel.WARNING,
                            "Thử nghiệm suy giảm tín hiệu định vị: mất khóa chính xác cao (RTK)");
                } else {
                    lastRtkStatus = "FIXED";
                    lastSatelliteCount = 18;
                    log(
                            now,
                            SimEventLevel.INFO,
                            "Đã khôi phục tín hiệu định vị chính xác cao (RTK)");
                }
            }
            case SIMULATE_BATTERY_DROP -> {
                if (mode == SimFlightMode.LANDED)
                    throw new IllegalStateException("SIM_COMMAND_NOT_ALLOWED");
                battery = Math.max(5.0, battery - 15.0);
                log(
                        now,
                        SimEventLevel.WARNING,
                        "Thử nghiệm giảm nhanh 15% pin: dung lượng còn "
                                + Math.round(battery)
                                + "%");
                checkFailsafes(now);
            }
        }
    }

    /** Records an airspace / NOTAM violation and triggers automatic RTH if blocking while airborne. */
    public void notifyAirspaceViolation(
            long zoneId, String code, String name, boolean blocking, LocalDateTime now) {
        if (!breachedZoneIds.add(zoneId)) return;
        airspaceBreaches++;
        boolean airborne = mode != SimFlightMode.LANDING && mode != SimFlightMode.LANDED;
        if (blocking && airborne) {
            failsafeRthTriggered = true;
            if (mode != SimFlightMode.RETURN_TO_HOME) {
                mode = SimFlightMode.RETURN_TO_HOME;
            }
            log(
                    now,
                    SimEventLevel.CRITICAL,
                    "Xâm phạm vùng cấm/NOTAM " + code + " (" + name + "): tự động quay về (RTH)");
        } else {
            log(
                    now,
                    SimEventLevel.WARNING,
                    "Đi vào vùng lưu ý không phận " + code + " (" + name + ")");
        }
    }

    private void climbTo(double target, double dt, LocalDateTime now) {
        speed = 0;
        altitude = Math.min(target, altitude + CLIMB_RATE_MS * dt);
        if (altitude >= target) {
            if (waypoints.isEmpty()) {
                mode = SimFlightMode.HOLD;
                log(now, SimEventLevel.INFO, "Đã đạt độ cao, chờ lệnh (không có lộ trình)");
            } else {
                mode = SimFlightMode.MISSION;
                log(now, SimEventLevel.INFO, "Bắt đầu lộ trình " + waypoints.size() + " điểm");
            }
        }
    }

    private void flyMission(double dt, LocalDateTime now) {
        List<Double> target = waypoints.get(nextWaypoint);
        if (moveToward(target.get(0), target.get(1), dt)) {
            nextWaypoint++;
            if (nextWaypoint >= waypoints.size()) {
                mode = SimFlightMode.RETURN_TO_HOME;
                log(now, SimEventLevel.INFO, "Hoàn tất lộ trình, quay về điểm xuất phát");
            } else if (nextWaypoint % 5 == 0 || nextWaypoint == 1) {
                log(
                        now,
                        SimEventLevel.INFO,
                        "Đã qua điểm " + nextWaypoint + "/" + waypoints.size());
            }
        }
    }

    private void flyHome(double dt, LocalDateTime now) {
        if (moveToward(homeLat, homeLng, dt)) {
            mode = SimFlightMode.LANDING;
            log(now, SimEventLevel.INFO, "Đã về điểm xuất phát, bắt đầu hạ cánh");
        }
    }

    private void descend(double dt, LocalDateTime now) {
        speed = 0;
        altitude = Math.max(0, altitude - DESCENT_RATE_MS * dt);
        if (altitude <= 0) {
            mode = SimFlightMode.LANDED;
            log(now, SimEventLevel.INFO, "Đã hạ cánh. Pin còn " + Math.round(battery) + "%");
        }
    }

    /** Moves toward the target accounting for wind headwind/tailwind component when configured. */
    private boolean moveToward(double targetLat, double targetLng, double dt) {
        double distance = SurveyPatternOperations.haversine(lat, lng, targetLat, targetLng);
        if (distance > 0.01) heading = bearing(lat, lng, targetLat, targetLng);
        double effectiveSpeed = effectiveGroundSpeed(heading);
        double step = effectiveSpeed * dt;
        if (distance <= step) {
            distanceFlown += distance;
            lat = targetLat;
            lng = targetLng;
            speed = distance / dt;
            addTrack();
            return true;
        }
        double rad = Math.toRadians(heading);
        lat += Math.toDegrees(step * Math.cos(rad) / SurveyPatternOperations.EARTH_RADIUS_M);
        lng +=
                Math.toDegrees(
                        step
                                * Math.sin(rad)
                                / (SurveyPatternOperations.EARTH_RADIUS_M
                                        * Math.cos(Math.toRadians(lat))));
        distanceFlown += step;
        speed = effectiveSpeed;
        addTrack();
        return false;
    }

    private double effectiveGroundSpeed(double trackBearingDeg) {
        if (settings.windSpeedMs() <= 0) return settings.cruiseSpeedMs();
        // Wind direction is meteorological (blowing FROM windDirectionDeg -> TOWARD +180 deg).
        double windToDeg = (settings.windDirectionDeg() + 180.0) % 360.0;
        double alongTrackWind =
                0.45
                        * settings.windSpeedMs()
                        * Math.cos(Math.toRadians(windToDeg - trackBearingDeg));
        double minForward = Math.max(1.5, settings.cruiseSpeedMs() * 0.35);
        return Math.max(minForward, Math.min(28.0, settings.cruiseSpeedMs() + alongTrackWind));
    }

    /** Hover costs ~3 %/min; forward flight, climbing, and fighting wind add realistic current draw. */
    private void drainBattery(double dt) {
        double windLoad = settings.windSpeedMs() > 0 ? 0.004 * settings.windSpeedMs() : 0;
        double rate = 0.05 + 0.006 * speed + windLoad + (mode == SimFlightMode.TAKEOFF ? 0.03 : 0);
        battery = Math.max(0, battery - rate * dt);
    }

    private void checkFailsafes(LocalDateTime now) {
        boolean airborne = mode != SimFlightMode.LANDING && mode != SimFlightMode.LANDED;
        if (!batteryWarned && battery <= BATTERY_WARN_PCT) {
            batteryWarned = true;
            log(
                    now,
                    SimEventLevel.WARNING,
                    "Pin còn " + Math.round(battery) + "%: chuẩn bị thu hồi");
        }
        if (airborne && battery <= BATTERY_LAND_PCT) {
            emergencyLandTriggered = true;
            mode = SimFlightMode.LANDING;
            log(
                    now,
                    SimEventLevel.CRITICAL,
                    "Pin nguy hiểm (" + Math.round(battery) + "%): tự hạ cánh tại chỗ");
            return;
        }
        if (airborne && mode != SimFlightMode.RETURN_TO_HOME && battery <= BATTERY_RETURN_PCT) {
            failsafeRthTriggered = true;
            mode = SimFlightMode.RETURN_TO_HOME;
            log(
                    now,
                    SimEventLevel.CRITICAL,
                    "Pin còn " + Math.round(battery) + "%: tự quay về (RTH)");
            return;
        }
        double fromHome = SurveyPatternOperations.haversine(lat, lng, homeLat, homeLng);
        if (airborne && !geofenceTripped && fromHome > settings.geofenceRadiusMeters()) {
            geofenceTripped = true;
            failsafeRthTriggered = true;
            mode = SimFlightMode.RETURN_TO_HOME;
            log(
                    now,
                    SimEventLevel.CRITICAL,
                    "Vượt rào địa lý "
                            + Math.round(settings.geofenceRadiusMeters())
                            + " m: tự quay về (RTH)");
        }
    }

    private void emit(LocalDateTime now) {
        sent++;
        if (random.nextDouble() * 100 < settings.packetLossPct()) {
            lost++;
            return;
        }
        int jitter =
                settings.jitterMs() > 0
                        ? random.nextInt(2 * settings.jitterMs() + 1) - settings.jitterMs()
                        : 0;
        long latency = Math.max(0, settings.latencyMs() + jitter);
        if (gpsDegraded) {
            lastRtkStatus = "SINGLE";
            lastSatelliteCount = 6 + random.nextInt(3);
        } else {
            boolean fixed = random.nextDouble() > 0.1;
            lastRtkStatus = fixed ? "FIXED" : "FLOAT";
            lastSatelliteCount = 14 + random.nextInt(6);
        }
        TelemetryReportRequest report =
                new TelemetryReportRequest(
                        now,
                        round(lat, 7),
                        round(lng, 7),
                        round(altitude, 1),
                        round(speed, 1),
                        round(heading % 360, 1),
                        (int) Math.round(battery),
                        lastRtkStatus,
                        lastSatelliteCount,
                        missionId);
        outbox.addLast(new SimPendingSample(report, now.plusNanos(latency * 1_000_000), latency));
    }

    private void addTrack() {
        track.addLast(List.of(round(lat, 7), round(lng, 7)));
        while (track.size() > MAX_TRACK_POINTS) track.pollFirst();
    }

    private void log(LocalDateTime at, SimEventLevel level, String message) {
        events.addFirst(new SimFlightEvent(at, level, message));
        while (events.size() > MAX_EVENTS) events.pollLast();
    }

    static double bearing(double lat1, double lng1, double lat2, double lng2) {
        double p1 = Math.toRadians(lat1),
                p2 = Math.toRadians(lat2),
                dl = Math.toRadians(lng2 - lng1);
        double y = Math.sin(dl) * Math.cos(p2);
        double x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
        return (Math.toDegrees(Math.atan2(y, x)) + 360) % 360;
    }

    private static double round(double v, int digits) {
        double f = Math.pow(10, digits);
        return Math.round(v * f) / f;
    }

    public Long runLogId() {
        return runLogId;
    }

    public void setRunLogId(Long runLogId) {
        this.runLogId = runLogId;
    }

    public String missionCode() {
        return missionCode;
    }

    public void setMissionCode(String missionCode) {
        this.missionCode = missionCode;
    }

    public long uavId() {
        return uavId;
    }

    public Long missionId() {
        return missionId;
    }

    public List<List<Double>> waypoints() {
        return waypoints;
    }

    public double homeLat() {
        return homeLat;
    }

    public double homeLng() {
        return homeLng;
    }

    public double startBatteryPct() {
        return startBatteryPct;
    }

    public SimFlightSettings settings() {
        return settings;
    }

    public LocalDateTime startedAt() {
        return startedAt;
    }

    public double latitude() {
        return lat;
    }

    public double longitude() {
        return lng;
    }

    public double altitude() {
        return altitude;
    }

    public double speed() {
        return speed;
    }

    public double heading() {
        return heading;
    }

    public double battery() {
        return battery;
    }

    public String rtkStatus() {
        return lastRtkStatus;
    }

    public int satelliteCount() {
        return lastSatelliteCount;
    }

    public int airspaceBreaches() {
        return airspaceBreaches;
    }

    public boolean gpsDegraded() {
        return gpsDegraded;
    }

    public SimFlightMode mode() {
        return mode;
    }

    public int nextWaypoint() {
        return nextWaypoint;
    }

    public double distanceFlown() {
        return distanceFlown;
    }

    public double elapsedSeconds() {
        return elapsedSeconds;
    }

    public double distanceToHome() {
        return SurveyPatternOperations.haversine(lat, lng, homeLat, homeLng);
    }

    public List<List<Double>> track() {
        return List.copyOf(track);
    }

    public List<SimFlightEvent> events() {
        return List.copyOf(events);
    }

    public boolean finished() {
        return mode == SimFlightMode.LANDED && outbox.isEmpty();
    }

    public SimRunStatus terminalRunStatus(boolean abortedByOperator) {
        if (abortedByOperator && mode != SimFlightMode.LANDED) return SimRunStatus.ABORTED;
        if (emergencyLandTriggered) return SimRunStatus.EMERGENCY_LANDED;
        if (failsafeRthTriggered) return SimRunStatus.FAILSAFE_RTH;
        return SimRunStatus.COMPLETED;
    }

    public static String modeLabelVi(SimFlightMode currentMode) {
        if (currentMode == null) return "bay mô phỏng";
        return switch (currentMode) {
            case TAKEOFF -> "cất cánh";
            case MISSION -> "bay theo lộ trình";
            case HOLD -> "tạm dừng giữ vị trí";
            case RETURN_TO_HOME -> "quay về điểm xuất phát";
            case LANDING -> "hạ cánh";
            case LANDED -> "đã hạ cánh";
        };
    }

    public String outcomeSummary(boolean abortedByOperator) {
        if (abortedByOperator && mode != SimFlightMode.LANDED) {
            return "Dừng diễn tập theo lệnh điều hành khi đang "
                    + modeLabelVi(mode)
                    + " (đã bay "
                    + Math.round(distanceFlown)
                    + " m, pin còn "
                    + Math.round(battery)
                    + "%).";
        }
        if (emergencyLandTriggered) {
            return "Hạ cánh khẩn cấp tự động do dung lượng pin xuống ngưỡng nguy hiểm ("
                    + Math.round(battery)
                    + "%).";
        }
        if (failsafeRthTriggered) {
            return "Kích hoạt tự động quay về (RTH) an toàn ("
                    + (airspaceBreaches > 0
                            ? airspaceBreaches + " cảnh báo không phận/NOTAM"
                            : "vượt ngưỡng pin/rào địa lý")
                    + "), pin còn "
                    + Math.round(battery)
                    + "%.";
        }
        return "Hoàn tất diễn tập "
                + Math.min(nextWaypoint, waypoints.size())
                + "/"
                + waypoints.size()
                + " điểm ("
                + Math.round(distanceFlown)
                + " m), hạ cánh an toàn với "
                + Math.round(battery)
                + "% pin.";
    }

    public SimLinkStats linkStats() {
        return new SimLinkStats(
                sent,
                delivered,
                lost,
                delivered == 0 ? 0 : (double) latencyTotal / delivered,
                latencyMax);
    }
}
