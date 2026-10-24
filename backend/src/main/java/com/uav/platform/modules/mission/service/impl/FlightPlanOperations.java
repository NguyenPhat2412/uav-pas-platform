package com.uav.platform.modules.mission.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.mission.dto.request.FlightPlanRequest;
import com.uav.platform.modules.mission.dto.response.FlightPlanResponse;

import java.util.List;
import java.util.Set;

/**
 * Validates a flight plan, derives its geometry and converts it to and from the JSON stored on the mission.
 * Distances use a local equirectangular projection around the area, accurate to well under 1% for survey-sized
 * areas (a few kilometres across).
 */
public final class FlightPlanOperations {
    static final Set<Integer> ALTITUDES = Set.of(30, 50, 80, 100, 120);
    static final Set<Double> GSD = Set.of(1.5, 3.0, 5.0);
    private static final double EARTH_RADIUS_M = 6_371_008.8;
    private static final ObjectMapper JSON = new ObjectMapper();

    private FlightPlanOperations() {}

    public static FlightPlanResponse resolve(FlightPlanRequest plan) {
        if (!ALTITUDES.contains(plan.altitudeAglMeters())) throw SystemException.badRequest("FLIGHT_ALTITUDE_INVALID");
        if (!GSD.contains(plan.targetGsdCm())) throw SystemException.badRequest("FLIGHT_GSD_INVALID");
        List<List<Double>> vertices = plan.vertices() == null ? List.of() : plan.vertices();
        vertices.forEach(FlightPlanOperations::checkCoordinate);
        double[] center;
        Double area = null, perimeter = null;
        Integer radius = null;
        switch (plan.areaType()) {
            case "POLYGON" -> {
                if (vertices.size() < 3) throw SystemException.badRequest("FLIGHT_POLYGON_TOO_SMALL");
                center = centroid(vertices);
                double[][] xy = project(vertices, center);
                area = Math.abs(shoelace(xy));
                perimeter = ringLength(xy);
                if (area < 1) throw SystemException.badRequest("FLIGHT_POLYGON_TOO_SMALL");
            }
            case "CIRCLE" -> {
                if (vertices.size() != 1 || plan.radiusMeters() == null) throw SystemException.badRequest("FLIGHT_CIRCLE_INVALID");
                radius = plan.radiusMeters();
                center = new double[]{vertices.get(0).get(0), vertices.get(0).get(1)};
                area = Math.PI * radius * radius;
                perimeter = 2 * Math.PI * radius;
            }
            default -> {
                if (plan.takeoffLatitude() == null || plan.takeoffLongitude() == null) throw SystemException.badRequest("FLIGHT_TAKEOFF_REQUIRED");
                center = new double[]{plan.takeoffLatitude(), plan.takeoffLongitude()};
                vertices = List.of();
            }
        }
        return new FlightPlanResponse(plan.areaType(), vertices, radius, plan.takeoffLatitude(), plan.takeoffLongitude(),
                round(center[0], 7), round(center[1], 7), area == null ? null : round(area, 1), perimeter == null ? null : round(perimeter, 1),
                plan.altitudeAglMeters(), plan.targetGsdCm(), plan.forwardOverlap(), plan.sideOverlap(), List.copyOf(plan.sensors()),
                plan.obstacles() == null || plan.obstacles().isBlank() ? null : plan.obstacles().trim(), plan.permitSupport());
    }

    public static String write(FlightPlanResponse plan) {
        try {
            return plan == null ? null : JSON.writeValueAsString(plan);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Flight plan could not be serialised", e);
        }
    }

    /** Unreadable legacy values are reported as no plan rather than failing the whole mission response. */
    public static FlightPlanResponse read(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return JSON.readValue(json, FlightPlanResponse.class);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    private static void checkCoordinate(List<Double> point) {
        if (point.size() != 2 || Math.abs(point.get(0)) > 90 || Math.abs(point.get(1)) > 180)
            throw SystemException.badRequest("FLIGHT_COORDINATE_INVALID");
    }

    private static double[] centroid(List<List<Double>> vertices) {
        double lat = 0, lng = 0;
        for (List<Double> p : vertices) {
            lat += p.get(0);
            lng += p.get(1);
        }
        return new double[]{lat / vertices.size(), lng / vertices.size()};
    }

    /** Metres east (x) and north (y) of the reference point. */
    static double[][] project(List<List<Double>> vertices, double[] ref) {
        double cos = Math.cos(Math.toRadians(ref[0]));
        double[][] xy = new double[vertices.size()][2];
        for (int i = 0; i < vertices.size(); i++) {
            xy[i][0] = Math.toRadians(vertices.get(i).get(1) - ref[1]) * EARTH_RADIUS_M * cos;
            xy[i][1] = Math.toRadians(vertices.get(i).get(0) - ref[0]) * EARTH_RADIUS_M;
        }
        return xy;
    }

    static double shoelace(double[][] xy) {
        double sum = 0;
        for (int i = 0; i < xy.length; i++) {
            double[] a = xy[i], b = xy[(i + 1) % xy.length];
            sum += a[0] * b[1] - b[0] * a[1];
        }
        return sum / 2;
    }

    static double ringLength(double[][] xy) {
        double sum = 0;
        for (int i = 0; i < xy.length; i++) {
            double[] a = xy[i], b = xy[(i + 1) % xy.length];
            sum += Math.hypot(b[0] - a[0], b[1] - a[1]);
        }
        return sum;
    }

    private static double round(double value, int places) {
        double f = Math.pow(10, places);
        return Math.round(value * f) / f;
    }
}
