package com.uav.platform.service.impl.simulation;

import com.uav.platform.dto.request.uav.TelemetryReportRequest;
import com.uav.platform.enums.simulation.SimCommand;
import com.uav.platform.enums.simulation.SimEventLevel;
import com.uav.platform.enums.simulation.SimFlightMode;

import java.time.LocalDateTime;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Random;

/**
 * One simulated UAV: a point-mass flight model with a flight-mode state machine, a battery model,
 * the usual fail-safes (low battery return, critical battery landing, geofence breach return) and a
 * lossy, delayed telemetry link.
 *
 * <p>It plays the part a PX4 SITL vehicle and its ground-station bridge would play: every step it
 * produces the same {@link TelemetryReportRequest} a real gateway posts to the platform, so the rest of
 * the system cannot tell the difference. Not thread-safe; the owning service serialises access.
 */
public final class SimulatedFlight {
    static final double CLIMB_RATE_MS = 3.0;
    static final double DESCENT_RATE_MS = 1.5;
    static final double BATTERY_WARN_PCT = 30;
    static final double BATTERY_RETURN_PCT = 20;
    static final double BATTERY_LAND_PCT = 10;
    static final int MAX_TRACK_POINTS = 900;
    static final int MAX_EVENTS = 60;

    /** Flight and link parameters chosen when the simulation starts. */
    public record Settings(
            double altitudeMeters,
            double cruiseSpeedMs,
            double packetLossPct,
            int latencyMs,
            int jitterMs,
            double geofenceRadiusMeters) {}

    public record Event(LocalDateTime at, SimEventLevel level, String message) {}

    /** Link counters: what the vehicle sent and what reached the platform, with delivery latency. */
    public record LinkStats(long sent, long delivered, long lost, double averageLatencyMs, long maxLatencyMs) {}

    private record Pending(TelemetryReportRequest report, LocalDateTime deliverAt, long latencyMs) {}

    private final long uavId;
    private final Long missionId;
    private final List<List<Double>> waypoints;
    private final double homeLat, homeLng;
    private final Settings settings;
    private final Random random;
    private final LocalDateTime startedAt;

    private double lat, lng, altitude, speed, heading, battery;
    private SimFlightMode mode = SimFlightMode.TAKEOFF;
    private SimFlightMode resumeMode = SimFlightMode.MISSION;
    private int nextWaypoint;
    private double distanceFlown, elapsedSeconds;
    private boolean batteryWarned, geofenceTripped;

    private final Deque<Pending> outbox = new ArrayDeque<>();
    private final Deque<List<Double>> track = new ArrayDeque<>();
    private final Deque<Event> events = new ArrayDeque<>();
    private long sent, delivered, lost, latencyTotal, latencyMax;

    public SimulatedFlight(
            long uavId,
            Long missionId,
            List<List<Double>> waypoints,
            double homeLat,
            double homeLng,
            double batteryPct,
            Settings settings,
            Random random,
            LocalDateTime now) {
        this.uavId = uavId;
        this.missionId = missionId;
        this.waypoints = List.copyOf(waypoints);
        this.homeLat = homeLat;
        this.homeLng = homeLng;
        this.settings = settings;
        this.random = random;
        this.startedAt = now;
        this.lat = homeLat;
        this.lng = homeLng;
        this.battery = batteryPct;
        track.add(List.of(lat, lng));
        log(now, SimEventLevel.INFO, "Cất cánh tới độ cao " + Math.round(settings.altitudeMeters()) + " m");
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
            Pending p = outbox.pollFirst();
            delivered++;
            latencyTotal += p.latencyMs();
            latencyMax = Math.max(latencyMax, p.latencyMs());
            ready.add(p.report());
        }
        return ready;
    }

    /** Applies an operator command; throws {@link IllegalStateException} when the phase does not allow it. */
    public void command(SimCommand command, LocalDateTime now) {
        switch (command) {
            case PAUSE -> {
                if (mode != SimFlightMode.MISSION && mode != SimFlightMode.RETURN_TO_HOME)
                    throw new IllegalStateException("SIM_COMMAND_NOT_ALLOWED");
                resumeMode = mode;
                mode = SimFlightMode.HOLD;
                log(now, SimEventLevel.INFO, "Dừng tại chỗ (HOLD) theo lệnh điều hành");
            }
            case RESUME -> {
                if (mode != SimFlightMode.HOLD) throw new IllegalStateException("SIM_COMMAND_NOT_ALLOWED");
                mode = nextWaypoint < waypoints.size() || resumeMode == SimFlightMode.RETURN_TO_HOME
                        ? resumeMode
                        : SimFlightMode.RETURN_TO_HOME;
                log(now, SimEventLevel.INFO, "Tiếp tục bay");
            }
            case RETURN_TO_HOME -> {
                if (mode == SimFlightMode.LANDING || mode == SimFlightMode.LANDED
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
                log(now, SimEventLevel.INFO, "Đã qua điểm " + nextWaypoint + "/" + waypoints.size());
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

    /** Moves toward the target at cruise speed; true once it is reached within this step. */
    private boolean moveToward(double targetLat, double targetLng, double dt) {
        double distance = SurveyPatternPlanner.haversine(lat, lng, targetLat, targetLng);
        double step = settings.cruiseSpeedMs() * dt;
        if (distance > 0.01) heading = bearing(lat, lng, targetLat, targetLng);
        if (distance <= step) {
            distanceFlown += distance;
            lat = targetLat;
            lng = targetLng;
            speed = distance / dt;
            addTrack();
            return true;
        }
        double rad = Math.toRadians(heading);
        lat += Math.toDegrees(step * Math.cos(rad) / SurveyPatternPlanner.EARTH_RADIUS_M);
        lng += Math.toDegrees(step * Math.sin(rad)
                / (SurveyPatternPlanner.EARTH_RADIUS_M * Math.cos(Math.toRadians(lat))));
        distanceFlown += step;
        speed = settings.cruiseSpeedMs();
        addTrack();
        return false;
    }

    /** Hover costs about 3 %/min; forward flight and climbing add to it (a 15–20 min multirotor). */
    private void drainBattery(double dt) {
        double rate = 0.05 + 0.006 * speed + (mode == SimFlightMode.TAKEOFF ? 0.03 : 0);
        battery = Math.max(0, battery - rate * dt);
    }

    private void checkFailsafes(LocalDateTime now) {
        boolean airborne = mode != SimFlightMode.LANDING && mode != SimFlightMode.LANDED;
        if (!batteryWarned && battery <= BATTERY_WARN_PCT) {
            batteryWarned = true;
            log(now, SimEventLevel.WARNING, "Pin còn " + Math.round(battery) + "%: chuẩn bị thu hồi");
        }
        if (airborne && battery <= BATTERY_LAND_PCT) {
            mode = SimFlightMode.LANDING;
            log(now, SimEventLevel.CRITICAL, "Pin nguy hiểm (" + Math.round(battery) + "%): tự hạ cánh tại chỗ");
            return;
        }
        if (airborne && mode != SimFlightMode.RETURN_TO_HOME && battery <= BATTERY_RETURN_PCT) {
            mode = SimFlightMode.RETURN_TO_HOME;
            log(now, SimEventLevel.CRITICAL, "Pin còn " + Math.round(battery) + "%: tự quay về (RTH)");
            return;
        }
        double fromHome = SurveyPatternPlanner.haversine(lat, lng, homeLat, homeLng);
        if (airborne && !geofenceTripped && fromHome > settings.geofenceRadiusMeters()) {
            geofenceTripped = true;
            mode = SimFlightMode.RETURN_TO_HOME;
            log(now, SimEventLevel.CRITICAL,
                    "Vượt rào địa lý " + Math.round(settings.geofenceRadiusMeters()) + " m: tự quay về (RTH)");
        }
    }

    private void emit(LocalDateTime now) {
        sent++;
        if (random.nextDouble() * 100 < settings.packetLossPct()) {
            lost++;
            return;
        }
        int jitter = settings.jitterMs() > 0 ? random.nextInt(2 * settings.jitterMs() + 1) - settings.jitterMs() : 0;
        long latency = Math.max(0, settings.latencyMs() + jitter);
        boolean fixed = random.nextDouble() > 0.1;
        TelemetryReportRequest report =
                new TelemetryReportRequest(
                        now,
                        round(lat, 7),
                        round(lng, 7),
                        round(altitude, 1),
                        round(speed, 1),
                        round(heading % 360, 1),
                        (int) Math.round(battery),
                        fixed ? "FIXED" : "FLOAT",
                        14 + random.nextInt(6),
                        missionId);
        outbox.addLast(new Pending(report, now.plusNanos(latency * 1_000_000), latency));
    }

    private void addTrack() {
        track.addLast(List.of(round(lat, 7), round(lng, 7)));
        while (track.size() > MAX_TRACK_POINTS) track.pollFirst();
    }

    private void log(LocalDateTime at, SimEventLevel level, String message) {
        events.addFirst(new Event(at, level, message));
        while (events.size() > MAX_EVENTS) events.pollLast();
    }

    static double bearing(double lat1, double lng1, double lat2, double lng2) {
        double p1 = Math.toRadians(lat1), p2 = Math.toRadians(lat2), dl = Math.toRadians(lng2 - lng1);
        double y = Math.sin(dl) * Math.cos(p2);
        double x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
        return (Math.toDegrees(Math.atan2(y, x)) + 360) % 360;
    }

    private static double round(double v, int digits) {
        double f = Math.pow(10, digits);
        return Math.round(v * f) / f;
    }

    public long uavId() { return uavId; }
    public Long missionId() { return missionId; }
    public List<List<Double>> waypoints() { return waypoints; }
    public double homeLat() { return homeLat; }
    public double homeLng() { return homeLng; }
    public Settings settings() { return settings; }
    public LocalDateTime startedAt() { return startedAt; }
    public double latitude() { return lat; }
    public double longitude() { return lng; }
    public double altitude() { return altitude; }
    public double speed() { return speed; }
    public double heading() { return heading; }
    public double battery() { return battery; }
    public SimFlightMode mode() { return mode; }
    public int nextWaypoint() { return nextWaypoint; }
    public double distanceFlown() { return distanceFlown; }
    public double elapsedSeconds() { return elapsedSeconds; }
    public double distanceToHome() { return SurveyPatternPlanner.haversine(lat, lng, homeLat, homeLng); }
    public List<List<Double>> track() { return List.copyOf(track); }
    public List<Event> events() { return List.copyOf(events); }
    public boolean finished() { return mode == SimFlightMode.LANDED && outbox.isEmpty(); }

    public LinkStats linkStats() {
        return new LinkStats(sent, delivered, lost,
                delivered == 0 ? 0 : (double) latencyTotal / delivered, latencyMax);
    }
}
