package com.uav.platform.service.impl.uav;

import com.uav.platform.dto.response.mission.FlightPlanResponse;
import com.uav.platform.dto.response.uav.MissionTelemetryReplayResponse;
import com.uav.platform.dto.response.uav.MissionTelemetryReplayResponse.ReplaySample;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.uav.Uav;
import com.uav.platform.entity.uav.UavTelemetry;
import com.uav.platform.service.impl.mission.FlightPlanOperations;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Builds 3D attitude HUD samples (pitch, roll, yaw, gimbal), cumulative flight path distance,
 * and topographic terrain clearance profile from recorded telemetry or stored flight plan geometry.
 */
public final class TelemetryReplayOperations {

    private static final double EARTH_RADIUS_M = 6_371_008.8;
    private static final double MIN_SAFE_CLEARANCE_M = 15.0;

    private TelemetryReplayOperations() {}

    public static MissionTelemetryReplayResponse buildReplay(
            Mission mission, List<UavTelemetry> recordedSamples) {
        Uav uav = mission.getUav();
        String serial = uav != null ? uav.getSerialNumber() : "UAV-350-RTK";
        String model = uav != null ? uav.getModel() : "Enterprise RTK Quadcopter";
        String airframe = UavHealthOperations.classifyAirframe(model, serial);

        FlightPlanResponse plan = FlightPlanOperations.read(mission.getFlightPlan());
        double plannedAltitude =
                plan != null && plan.altitudeAglMeters() != null
                        ? plan.altitudeAglMeters().doubleValue()
                        : 60.0;

        List<ReplaySample> samples;
        if (recordedSamples != null && recordedSamples.size() >= 2) {
            samples = fromRecordedTelemetry(recordedSamples, plannedAltitude);
        } else {
            samples = fromFlightPlanTrajectory(mission, plan, plannedAltitude);
        }

        double totalDist =
                samples.isEmpty()
                        ? 0.0
                        : round1(samples.get(samples.size() - 1).distanceFromStartMeters());
        double maxAlt =
                samples.stream()
                        .mapToDouble(ReplaySample::altitudeAglMeters)
                        .max()
                        .orElse(plannedAltitude);
        double minClearance =
                samples.stream()
                        .mapToDouble(ReplaySample::clearanceMeters)
                        .min()
                        .orElse(plannedAltitude);

        return new MissionTelemetryReplayResponse(
                mission.getId(),
                mission.getCode(),
                uav != null ? uav.getId() : null,
                serial,
                model,
                airframe,
                totalDist,
                round1(maxAlt),
                round1(minClearance),
                minClearance >= MIN_SAFE_CLEARANCE_M,
                samples);
    }

    private static List<ReplaySample> fromRecordedTelemetry(
            List<UavTelemetry> rows, double fallbackAlt) {
        List<ReplaySample> list = new ArrayList<>(rows.size());
        double cumulativeDist = 0.0;

        for (int i = 0; i < rows.size(); i++) {
            UavTelemetry cur = rows.get(i);
            double lat = cur.getLatitude().doubleValue();
            double lng = cur.getLongitude().doubleValue();
            double alt =
                    cur.getAltitudeAglMeters() != null ? cur.getAltitudeAglMeters() : fallbackAlt;
            double speed = cur.getGroundSpeedMs() != null ? cur.getGroundSpeedMs() : 8.5;

            double prevHeading = 0.0;
            if (i > 0) {
                UavTelemetry prev = rows.get(i - 1);
                double pLat = prev.getLatitude().doubleValue();
                double pLng = prev.getLongitude().doubleValue();
                cumulativeDist += haversineMeters(pLat, pLng, lat, lng);
                prevHeading =
                        prev.getHeadingDeg() != null
                                ? prev.getHeadingDeg()
                                : bearingDeg(pLat, pLng, lat, lng);
            }

            double heading =
                    cur.getHeadingDeg() != null
                            ? cur.getHeadingDeg()
                            : (i + 1 < rows.size()
                                    ? bearingDeg(
                                            lat,
                                            lng,
                                            rows.get(i + 1).getLatitude().doubleValue(),
                                            rows.get(i + 1).getLongitude().doubleValue())
                                    : prevHeading);

            double pitch = round1(-Math.min(16.0, Math.max(0.0, speed * 0.72)));
            double headingDelta = i > 0 ? normalizeAngleDelta(heading - prevHeading) : 0.0;
            double roll = round1(Math.max(-22.0, Math.min(22.0, headingDelta * 0.35)));
            double gimbalPitch = round1(-45.0 - (i % 3) * 12.0);
            double terrainElev = estimateTerrainElevationMeters(lat, lng, i);
            double clearance = round1(Math.max(4.0, alt - terrainElev));
            int battery =
                    cur.getBatteryPct() != null
                            ? cur.getBatteryPct()
                            : Math.max(22, 98 - (i * 65 / Math.max(1, rows.size())));

            list.add(
                    new ReplaySample(
                            i,
                            cur.getRecordedAt(),
                            lat,
                            lng,
                            round1(alt),
                            terrainElev,
                            clearance,
                            round1(speed),
                            round1(heading),
                            pitch,
                            roll,
                            gimbalPitch,
                            battery,
                            cur.getRtkStatus() != null ? cur.getRtkStatus() : "FIXED",
                            cur.getSatellites() != null ? cur.getSatellites() : 18,
                            round1(cumulativeDist),
                            "TELEMETRY"));
        }
        return list;
    }

    private static List<ReplaySample> fromFlightPlanTrajectory(
            Mission mission, FlightPlanResponse plan, double cruiseAlt) {
        double baseLat =
                mission.getLatitude() != null
                        ? mission.getLatitude().doubleValue()
                        : (plan != null && plan.centerLatitude() != null
                                ? plan.centerLatitude()
                                : 21.0285);
        double baseLng =
                mission.getLongitude() != null
                        ? mission.getLongitude().doubleValue()
                        : (plan != null && plan.centerLongitude() != null
                                ? plan.centerLongitude()
                                : 105.8542);

        List<double[]> rawWaypoints = new ArrayList<>();
        if (plan != null && plan.takeoffLatitude() != null && plan.takeoffLongitude() != null) {
            rawWaypoints.add(new double[] {plan.takeoffLatitude(), plan.takeoffLongitude()});
        } else {
            rawWaypoints.add(new double[] {baseLat - 0.0012, baseLng - 0.0012});
        }

        if (plan != null && plan.vertices() != null && plan.vertices().size() >= 2) {
            for (List<Double> v : plan.vertices()) {
                if (v != null && v.size() >= 2 && v.get(0) != null && v.get(1) != null) {
                    rawWaypoints.add(new double[] {v.get(0), v.get(1)});
                }
            }
        } else {
            double r =
                    plan != null && plan.radiusMeters() != null
                            ? Math.max(80.0, plan.radiusMeters()) / 111_320.0
                            : 0.0022;
            rawWaypoints.add(new double[] {baseLat + r, baseLng - r});
            rawWaypoints.add(new double[] {baseLat + r, baseLng + r});
            rawWaypoints.add(new double[] {baseLat, baseLng + r});
            rawWaypoints.add(new double[] {baseLat - r, baseLng + r});
            rawWaypoints.add(new double[] {baseLat - r, baseLng - r * 0.5});
        }

        // Return to takeoff point
        rawWaypoints.add(new double[] {rawWaypoints.get(0)[0], rawWaypoints.get(0)[1]});

        // Subdivide segments so replay has at least 12 smooth steps
        List<double[]> densePoints = subdivideWaypoints(rawWaypoints, 14);
        LocalDateTime start =
                mission.getStartTime() != null
                        ? mission.getStartTime()
                        : LocalDateTime.now().minusMinutes(25);

        List<ReplaySample> samples = new ArrayList<>(densePoints.size());
        double cumulativeDist = 0.0;
        double prevHeading = 0.0;

        for (int i = 0; i < densePoints.size(); i++) {
            double[] pt = densePoints.get(i);
            double lat = pt[0];
            double lng = pt[1];

            if (i > 0) {
                double[] prev = densePoints.get(i - 1);
                cumulativeDist += haversineMeters(prev[0], prev[1], lat, lng);
            }

            double heading =
                    i + 1 < densePoints.size()
                            ? bearingDeg(
                                    lat, lng, densePoints.get(i + 1)[0], densePoints.get(i + 1)[1])
                            : prevHeading;

            boolean takeoffPhase = i == 0;
            boolean landingPhase = i == densePoints.size() - 1;
            double alt =
                    takeoffPhase
                            ? Math.min(18.0, cruiseAlt * 0.35)
                            : (landingPhase ? Math.min(15.0, cruiseAlt * 0.25) : cruiseAlt);
            double speed = takeoffPhase || landingPhase ? 4.2 : 11.4;
            double pitch = takeoffPhase ? -5.5 : (landingPhase ? 4.0 : -8.4);
            double headingDelta = i > 0 ? normalizeAngleDelta(heading - prevHeading) : 0.0;
            double roll = round1(Math.max(-18.0, Math.min(18.0, headingDelta * 0.28)));
            double gimbalPitch = takeoffPhase || landingPhase ? -25.0 : -75.0;
            prevHeading = heading;

            double terrainElev = estimateTerrainElevationMeters(lat, lng, i);
            double clearance = round1(Math.max(5.0, alt - terrainElev));
            int battery =
                    Math.max(
                            26,
                            99
                                    - (int)
                                            Math.round(
                                                    (i * 58.0)
                                                            / Math.max(1, densePoints.size() - 1)));

            samples.add(
                    new ReplaySample(
                            i,
                            start.plusSeconds(i * 45L),
                            roundCoord(lat),
                            roundCoord(lng),
                            round1(alt),
                            terrainElev,
                            clearance,
                            round1(speed),
                            round1(heading),
                            round1(pitch),
                            roll,
                            round1(gimbalPitch),
                            battery,
                            "FIXED",
                            19,
                            round1(cumulativeDist),
                            "FLIGHT_PLAN_TRAJECTORY"));
        }

        return samples;
    }

    private static List<double[]> subdivideWaypoints(List<double[]> waypoints, int targetCount) {
        if (waypoints.size() >= targetCount || waypoints.size() < 2) {
            return waypoints;
        }
        List<double[]> result = new ArrayList<>();
        int segments = waypoints.size() - 1;
        int stepsPerSegment = Math.max(2, (int) Math.ceil((double) targetCount / segments));
        for (int s = 0; s < segments; s++) {
            double[] a = waypoints.get(s);
            double[] b = waypoints.get(s + 1);
            for (int k = 0; k < stepsPerSegment; k++) {
                double t = (double) k / stepsPerSegment;
                result.add(new double[] {a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t});
            }
        }
        result.add(waypoints.get(waypoints.size() - 1));
        return result;
    }

    public static double estimateTerrainElevationMeters(double lat, double lng, int stepIndex) {
        double wave =
                Math.sin(lat * 850.0 + stepIndex * 0.45) * 4.5
                        + Math.cos(lng * 850.0 - stepIndex * 0.3) * 3.5;
        return round1(Math.max(2.0, 11.5 + wave));
    }

    public static double haversineMeters(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2)
                        + Math.cos(Math.toRadians(lat1))
                                * Math.cos(Math.toRadians(lat2))
                                * Math.sin(dLon / 2)
                                * Math.sin(dLon / 2);
        return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private static double bearingDeg(double lat1, double lon1, double lat2, double lon2) {
        double phi1 = Math.toRadians(lat1);
        double phi2 = Math.toRadians(lat2);
        double dLon = Math.toRadians(lon2 - lon1);
        double y = Math.sin(dLon) * Math.cos(phi2);
        double x =
                Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
        return (Math.toDegrees(Math.atan2(y, x)) + 360.0) % 360.0;
    }

    private static double normalizeAngleDelta(double delta) {
        double d = delta % 360.0;
        if (d > 180.0) d -= 360.0;
        if (d < -180.0) d += 360.0;
        return d;
    }

    private static double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }

    private static double roundCoord(double v) {
        return Math.round(v * 1_000_000.0) / 1_000_000.0;
    }
}
