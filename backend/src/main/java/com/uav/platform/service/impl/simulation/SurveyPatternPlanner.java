package com.uav.platform.service.impl.simulation;

import java.util.ArrayList;
import java.util.List;

/**
 * Coverage path planning for a survey polygon: parallel sweep lines ("lawnmower" / boustrophedon)
 * laid along the polygon's longest edge, so the aircraft makes as few turns as possible.
 *
 * <p>Coordinates are [latitude, longitude] in decimal degrees. Work is done in a local metric frame
 * (equirectangular projection around the polygon centroid), which is accurate to well under a metre
 * for survey areas of a few kilometres.
 */
public final class SurveyPatternPlanner {
    static final double EARTH_RADIUS_M = 6_371_008.8;

    /**
     * Horizontal field of view assumed for the survey camera (a typical 24 mm-equivalent lens).
     * The ground footprint width is 2 * altitude * tan(HFOV / 2) ≈ 1.5 × altitude.
     */
    static final double CAMERA_HFOV_DEG = 73.7;

    private SurveyPatternPlanner() {}

    /** Line spacing that gives the requested side overlap at this altitude (metres). */
    public static double lineSpacingFor(double altitudeMeters, int sideOverlapPercent) {
        double footprint = 2 * altitudeMeters * Math.tan(Math.toRadians(CAMERA_HFOV_DEG / 2));
        double overlap = Math.min(95, Math.max(0, sideOverlapPercent)) / 100.0;
        return Math.max(5, footprint * (1 - overlap));
    }

    /**
     * Waypoints that sweep the polygon with lines {@code spacingMeters} apart, ordered so that
     * consecutive lines are flown in opposite directions. Concave polygons are handled by flying
     * every inside segment of a sweep line in turn.
     */
    public static List<List<Double>> plan(List<List<Double>> polygon, double spacingMeters) {
        if (polygon == null || polygon.size() < 3)
            throw new IllegalArgumentException("A survey area needs at least three vertices");
        if (!(spacingMeters > 0)) throw new IllegalArgumentException("Line spacing must be positive");

        double[] ref = centroid(polygon);
        double[][] xy = project(polygon, ref);
        double angle = longestEdgeAngle(xy);
        double cos = Math.cos(-angle), sin = Math.sin(-angle);

        // Rotate so the sweep lines run along the x axis.
        double[][] r = new double[xy.length][2];
        double minY = Double.MAX_VALUE, maxY = -Double.MAX_VALUE;
        for (int i = 0; i < xy.length; i++) {
            r[i][0] = xy[i][0] * cos - xy[i][1] * sin;
            r[i][1] = xy[i][0] * sin + xy[i][1] * cos;
            minY = Math.min(minY, r[i][1]);
            maxY = Math.max(maxY, r[i][1]);
        }

        List<double[]> path = new ArrayList<>();
        boolean forward = true;
        // The first line sits half a spacing inside the edge so the footprint covers the boundary.
        for (double y = minY + spacingMeters / 2; y < maxY; y += spacingMeters) {
            List<Double> xs = crossings(r, y);
            if (xs.size() < 2) continue;
            List<double[]> line = new ArrayList<>();
            for (int k = 0; k + 1 < xs.size(); k += 2) {
                line.add(new double[] {xs.get(k), y});
                line.add(new double[] {xs.get(k + 1), y});
            }
            if (!forward) java.util.Collections.reverse(line);
            path.addAll(line);
            forward = !forward;
        }
        if (path.isEmpty()) {
            // The area is narrower than one spacing: fly a single pass through its middle.
            double y = (minY + maxY) / 2;
            List<Double> xs = crossings(r, y);
            if (xs.size() >= 2) {
                path.add(new double[] {xs.get(0), y});
                path.add(new double[] {xs.get(xs.size() - 1), y});
            }
        }

        double back = Math.cos(angle), backSin = Math.sin(angle);
        List<List<Double>> waypoints = new ArrayList<>(path.size());
        for (double[] p : path) {
            double x = p[0] * back - p[1] * backSin;
            double yy = p[0] * backSin + p[1] * back;
            waypoints.add(unproject(x, yy, ref));
        }
        return waypoints;
    }

    /** Total length of a path through the waypoints, in metres. */
    public static double pathLength(List<List<Double>> waypoints) {
        double total = 0;
        for (int i = 1; i < waypoints.size(); i++)
            total += distance(waypoints.get(i - 1), waypoints.get(i));
        return total;
    }

    /** Great-circle distance between two [lat, lng] points, in metres. */
    public static double distance(List<Double> a, List<Double> b) {
        return haversine(a.get(0), a.get(1), b.get(0), b.get(1));
    }

    static double haversine(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1), dLng = Math.toRadians(lng2 - lng1);
        double h =
                Math.sin(dLat / 2) * Math.sin(dLat / 2)
                        + Math.cos(Math.toRadians(lat1))
                                * Math.cos(Math.toRadians(lat2))
                                * Math.sin(dLng / 2)
                                * Math.sin(dLng / 2);
        return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
    }

    private static List<Double> crossings(double[][] r, double y) {
        List<Double> xs = new ArrayList<>();
        for (int i = 0; i < r.length; i++) {
            double[] a = r[i], b = r[(i + 1) % r.length];
            // Half-open test so a vertex exactly on the line is counted once.
            if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y))
                xs.add(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
        }
        xs.sort(Double::compare);
        return xs;
    }

    private static double longestEdgeAngle(double[][] xy) {
        double best = -1, angle = 0;
        for (int i = 0; i < xy.length; i++) {
            double[] a = xy[i], b = xy[(i + 1) % xy.length];
            double len = Math.hypot(b[0] - a[0], b[1] - a[1]);
            if (len > best) {
                best = len;
                angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
            }
        }
        return angle;
    }

    private static double[] centroid(List<List<Double>> polygon) {
        double lat = 0, lng = 0;
        for (List<Double> p : polygon) {
            lat += p.get(0);
            lng += p.get(1);
        }
        return new double[] {lat / polygon.size(), lng / polygon.size()};
    }

    /** Metres east (x) and north (y) of the reference point. */
    private static double[][] project(List<List<Double>> polygon, double[] ref) {
        double cos = Math.cos(Math.toRadians(ref[0]));
        double[][] xy = new double[polygon.size()][2];
        for (int i = 0; i < polygon.size(); i++) {
            xy[i][0] = Math.toRadians(polygon.get(i).get(1) - ref[1]) * EARTH_RADIUS_M * cos;
            xy[i][1] = Math.toRadians(polygon.get(i).get(0) - ref[0]) * EARTH_RADIUS_M;
        }
        return xy;
    }

    private static List<Double> unproject(double x, double y, double[] ref) {
        double lat = ref[0] + Math.toDegrees(y / EARTH_RADIUS_M);
        double lng = ref[1] + Math.toDegrees(x / (EARTH_RADIUS_M * Math.cos(Math.toRadians(ref[0]))));
        return List.of(round(lat), round(lng));
    }

    private static double round(double v) {
        return Math.round(v * 1e7) / 1e7;
    }
}
