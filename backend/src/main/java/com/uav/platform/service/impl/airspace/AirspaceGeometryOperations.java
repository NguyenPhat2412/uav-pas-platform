package com.uav.platform.service.impl.airspace;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.dto.record.airspace.SpatialIntersection;
import com.uav.platform.dto.request.airspace.AirspaceCheckRequest;
import com.uav.platform.dto.request.airspace.AirspaceZoneUpsertRequest;
import com.uav.platform.dto.response.airspace.AirspaceCheckResponse;
import com.uav.platform.dto.response.airspace.AirspaceViolationResponse;
import com.uav.platform.entity.airspace.AirspaceZone;
import com.uav.platform.enums.airspace.AirspaceGeometryType;
import com.uav.platform.enums.airspace.AirspaceZoneType;
import com.uav.platform.error.SystemException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Spatial intersection (WGS84 Haversine + local equirectangular tangent-plane geometry) and
 * civil aviation clearance rules for prohibited, restricted, and warning airspace zones.
 */
public final class AirspaceGeometryOperations {
    private static final double EARTH_RADIUS_M = 6_371_008.8;
    private static final double EPSILON = 1e-6;
    private static final ObjectMapper JSON = new ObjectMapper();

    private AirspaceGeometryOperations() {}

    public static AirspaceCheckResponse evaluate(
            AirspaceCheckRequest request, List<AirspaceZone> activeZones) {
        validateCheckRequest(request);
        List<AirspaceViolationResponse> violations = new ArrayList<>();
        if (activeZones != null) {
            for (AirspaceZone zone : activeZones) {
                if (zone == null || !zone.isActive()) continue;
                SpatialIntersection hit = intersectFlightPlanWithZone(request, zone);
                if (hit.intersects()) {
                    violations.add(classifyViolation(zone, request.altitudeAglMeters(), hit));
                }
            }
        }
        boolean blocked = violations.stream().anyMatch(AirspaceViolationResponse::blocking);
        boolean requiresPermit =
                violations.stream().anyMatch(AirspaceViolationResponse::requiresPermit);
        String clearance;
        if (blocked) {
            clearance = "BLOCKED";
        } else if (requiresPermit) {
            clearance = "PERMIT_REQUIRED";
        } else if (!violations.isEmpty()) {
            clearance = "CAUTION";
        } else {
            clearance = "CLEAR";
        }
        return new AirspaceCheckResponse(
                violations.isEmpty(), blocked, requiresPermit, clearance, List.copyOf(violations));
    }

    public static AirspaceViolationResponse classifyViolation(
            AirspaceZone zone, Integer altitudeAglMeters, SpatialIntersection intersection) {
        AirspaceZoneType type = zone.getZoneType();
        Integer maxAlt = zone.getMaxAltitudeAglM();
        double distance = round1(Math.max(0.0, intersection.distanceMeters()));
        return switch (type) {
            case PROHIBITED ->
                    new AirspaceViolationResponse(
                            zone.getId(),
                            zone.getCode(),
                            zone.getName(),
                            type,
                            zone.getAuthority(),
                            maxAlt,
                            distance,
                            true,
                            false,
                            String.format(
                                    Locale.ROOT,
                                    "Vùng cấm bay (%s - %s) do %s quản lý.",
                                    zone.getCode(),
                                    zone.getName(),
                                    zone.getAuthority()));
            case RESTRICTED -> {
                boolean exceedsCeiling =
                        altitudeAglMeters != null && maxAlt != null && altitudeAglMeters > maxAlt;
                String msg =
                        exceedsCeiling
                                ? String.format(
                                        Locale.ROOT,
                                        "Vùng hạn chế bay (%s - %s) yêu cầu giấy phép bay từ %s; độ cao dự kiến %dm vượt trần tham chiếu %dm AGL.",
                                        zone.getCode(),
                                        zone.getName(),
                                        zone.getAuthority(),
                                        altitudeAglMeters,
                                        maxAlt)
                                : String.format(
                                        Locale.ROOT,
                                        "Vùng hạn chế bay (%s - %s) yêu cầu giấy phép bay từ %s.",
                                        zone.getCode(),
                                        zone.getName(),
                                        zone.getAuthority());
                yield new AirspaceViolationResponse(
                        zone.getId(),
                        zone.getCode(),
                        zone.getName(),
                        type,
                        zone.getAuthority(),
                        maxAlt,
                        distance,
                        false,
                        true,
                        msg);
            }
            case WARNING -> {
                boolean exceedsCeiling =
                        altitudeAglMeters != null && maxAlt != null && altitudeAglMeters > maxAlt;
                String msg =
                        exceedsCeiling
                                ? String.format(
                                        Locale.ROOT,
                                        "Độ cao bay dự kiến %dm vượt trần khuyến cáo %dm AGL tại %s (%s); yêu cầu giấy phép bay từ %s.",
                                        altitudeAglMeters,
                                        maxAlt,
                                        zone.getName(),
                                        zone.getCode(),
                                        zone.getAuthority())
                                : String.format(
                                        Locale.ROOT,
                                        "Lưu ý hoạt động bay trong vùng cảnh báo %s (%s), trần tham chiếu %s.",
                                        zone.getName(),
                                        zone.getCode(),
                                        maxAlt == null ? "không giới hạn" : maxAlt + "m AGL");
                yield new AirspaceViolationResponse(
                        zone.getId(),
                        zone.getCode(),
                        zone.getName(),
                        type,
                        zone.getAuthority(),
                        maxAlt,
                        distance,
                        false,
                        exceedsCeiling,
                        msg);
            }
        };
    }

    public static SpatialIntersection intersectFlightPlanWithZone(
            AirspaceCheckRequest request, AirspaceZone zone) {
        SpatialIntersection primary =
                switch (request.areaType()) {
                    case "POINT" -> {
                        double[] pt = resolvePoint(request);
                        yield intersectPointWithZone(pt[0], pt[1], zone);
                    }
                    case "CIRCLE" -> {
                        double[] center = resolveCircleCenter(request);
                        yield intersectCircleWithZone(
                                center[0], center[1], request.radiusMeters(), zone);
                    }
                    case "POLYGON" -> intersectPolygonWithZone(request.vertices(), zone);
                    default ->
                            throw SystemException.badRequest(
                                            "Kiểu vùng bay không hợp lệ.",
                                            "AIRSPACE_AREA_TYPE_INVALID")
                                    .at("areaType");
                };
        if (!"POINT".equals(request.areaType())
                && request.takeoffLatitude() != null
                && request.takeoffLongitude() != null) {
            SpatialIntersection takeoffHit =
                    intersectPointWithZone(
                            request.takeoffLatitude(), request.takeoffLongitude(), zone);
            return new SpatialIntersection(
                    primary.intersects() || takeoffHit.intersects(),
                    Math.min(primary.distanceMeters(), takeoffHit.distanceMeters()));
        }
        return primary;
    }

    public static SpatialIntersection intersectPointWithZone(
            double lat, double lng, AirspaceZone zone) {
        if (zone.getGeometryType() == AirspaceGeometryType.POLYGON) {
            List<List<Double>> ring = readVertices(zone.getPolygonVertices());
            if (ring.size() >= 3) {
                return pointVsPolygon(lat, lng, ring);
            }
        }
        double zLat = zone.getCenterLat().doubleValue();
        double zLng = zone.getCenterLng().doubleValue();
        double zRadius = zone.getRadiusMeters() == null ? 0.0 : zone.getRadiusMeters();
        double dist = haversineMeters(lat, lng, zLat, zLng);
        double clearanceDist = Math.max(0.0, dist - zRadius);
        return new SpatialIntersection(dist <= zRadius + EPSILON, clearanceDist);
    }

    public static SpatialIntersection intersectCircleWithZone(
            double cLat, double cLng, double radiusMeters, AirspaceZone zone) {
        if (zone.getGeometryType() == AirspaceGeometryType.POLYGON) {
            List<List<Double>> ring = readVertices(zone.getPolygonVertices());
            if (ring.size() >= 3) {
                return circleVsPolygon(cLat, cLng, radiusMeters, ring);
            }
        }
        double zLat = zone.getCenterLat().doubleValue();
        double zLng = zone.getCenterLng().doubleValue();
        double zRadius = zone.getRadiusMeters() == null ? 0.0 : zone.getRadiusMeters();
        double dist = haversineMeters(cLat, cLng, zLat, zLng);
        double combined = radiusMeters + zRadius;
        return new SpatialIntersection(dist <= combined + EPSILON, Math.max(0.0, dist - combined));
    }

    public static SpatialIntersection intersectPolygonWithZone(
            List<List<Double>> vertices, AirspaceZone zone) {
        if (zone.getGeometryType() == AirspaceGeometryType.POLYGON) {
            List<List<Double>> zoneRing = readVertices(zone.getPolygonVertices());
            if (zoneRing.size() >= 3) {
                return polygonVsPolygon(vertices, zoneRing);
            }
        }
        double zLat = zone.getCenterLat().doubleValue();
        double zLng = zone.getCenterLng().doubleValue();
        double zRadius = zone.getRadiusMeters() == null ? 0.0 : zone.getRadiusMeters();
        return circleVsPolygon(zLat, zLng, zRadius, vertices);
    }

    public static SpatialIntersection pointVsPolygon(
            double lat, double lng, List<List<Double>> polygon) {
        double[] ref = centroid(polygon);
        double[][] ringXy = projectRing(polygon, ref[0], ref[1]);
        double[] pointXy = projectPoint(lat, lng, ref[0], ref[1]);
        if (pointInPolygon(pointXy, ringXy)) {
            return new SpatialIntersection(true, 0.0);
        }
        double minDist = minDistanceToRingEdges(pointXy, ringXy);
        return new SpatialIntersection(minDist <= EPSILON, Math.max(0.0, minDist));
    }

    public static SpatialIntersection circleVsPolygon(
            double centerLat, double centerLng, double radiusMeters, List<List<Double>> polygon) {
        double[][] ringXy = projectRing(polygon, centerLat, centerLng);
        double[] origin = new double[] {0.0, 0.0};
        if (pointInPolygon(origin, ringXy)) {
            return new SpatialIntersection(true, 0.0);
        }
        double minDist = Double.POSITIVE_INFINITY;
        for (List<Double> vertex : polygon) {
            double vertexDist = haversineMeters(centerLat, centerLng, vertex.get(0), vertex.get(1));
            if (vertexDist <= radiusMeters + EPSILON) {
                return new SpatialIntersection(true, 0.0);
            }
            minDist = Math.min(minDist, vertexDist);
        }
        double minEdgeDist = minDistanceToRingEdges(origin, ringXy);
        minDist = Math.min(minDist, minEdgeDist);
        if (minDist <= radiusMeters + EPSILON) {
            return new SpatialIntersection(true, 0.0);
        }
        return new SpatialIntersection(false, Math.max(0.0, minDist - radiusMeters));
    }

    public static SpatialIntersection polygonVsPolygon(
            List<List<Double>> polyA, List<List<Double>> polyB) {
        double[] cA = centroid(polyA);
        double[] cB = centroid(polyB);
        double refLat = (cA[0] + cB[0]) / 2.0;
        double refLng = (cA[1] + cB[1]) / 2.0;
        double[][] aXy = projectRing(polyA, refLat, refLng);
        double[][] bXy = projectRing(polyB, refLat, refLng);

        for (double[] p : aXy) {
            if (pointInPolygon(p, bXy)) return new SpatialIntersection(true, 0.0);
        }
        for (double[] q : bXy) {
            if (pointInPolygon(q, aXy)) return new SpatialIntersection(true, 0.0);
        }
        for (int i = 0; i < aXy.length; i++) {
            double[] a1 = aXy[i];
            double[] a2 = aXy[(i + 1) % aXy.length];
            for (int j = 0; j < bXy.length; j++) {
                double[] b1 = bXy[j];
                double[] b2 = bXy[(j + 1) % bXy.length];
                if (segmentsIntersect(a1, a2, b1, b2)) {
                    return new SpatialIntersection(true, 0.0);
                }
            }
        }
        double minDist = Double.POSITIVE_INFINITY;
        for (double[] p : aXy) {
            minDist = Math.min(minDist, minDistanceToRingEdges(p, bXy));
        }
        for (double[] q : bXy) {
            minDist = Math.min(minDist, minDistanceToRingEdges(q, aXy));
        }
        return new SpatialIntersection(minDist <= EPSILON, Math.max(0.0, minDist));
    }

    public static double haversineMeters(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double sinLat = Math.sin(dLat / 2.0);
        double sinLng = Math.sin(dLng / 2.0);
        double a =
                sinLat * sinLat
                        + Math.cos(Math.toRadians(lat1))
                                * Math.cos(Math.toRadians(lat2))
                                * sinLng
                                * sinLng;
        return 2.0 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0.0, 1.0 - a)));
    }

    public static void applyUpsert(AirspaceZone target, AirspaceZoneUpsertRequest request) {
        target.setCode(request.code().trim().toUpperCase(Locale.ROOT));
        target.setName(request.name().trim());
        target.setZoneType(request.zoneType());
        target.setGeometryType(request.geometryType());
        target.setAuthority(request.authority().trim());
        target.setActive(request.active() == null || request.active());
        target.setDescription(
                request.description() == null || request.description().isBlank()
                        ? null
                        : request.description().trim());

        if (request.zoneType() == AirspaceZoneType.PROHIBITED
                && request.maxAltitudeAglM() == null) {
            target.setMaxAltitudeAglM(0);
        } else {
            target.setMaxAltitudeAglM(request.maxAltitudeAglM());
        }

        if (request.geometryType() == AirspaceGeometryType.CIRCLE) {
            if (request.centerLat() == null || request.centerLng() == null) {
                throw SystemException.badRequest(
                                "Vùng tròn cần tọa độ tâm (centerLat, centerLng).",
                                "AIRSPACE_CIRCLE_CENTER_REQUIRED")
                        .at("centerLat");
            }
            if (request.radiusMeters() == null || request.radiusMeters() < 10) {
                throw SystemException.badRequest(
                                "Vùng tròn cần bán kính tối thiểu 10 m.",
                                "AIRSPACE_CIRCLE_RADIUS_REQUIRED")
                        .at("radiusMeters");
            }
            validateLatLng(request.centerLat(), request.centerLng(), "centerLat");
            target.setCenterLat(scaleCoord(request.centerLat()));
            target.setCenterLng(scaleCoord(request.centerLng()));
            target.setRadiusMeters(request.radiusMeters());
            target.setPolygonVertices(null);
        } else {
            List<List<Double>> vertices = request.vertices();
            if (vertices == null || vertices.size() < 3) {
                throw SystemException.badRequest(
                                "Vùng đa giác cần ít nhất 3 đỉnh.",
                                "AIRSPACE_POLYGON_VERTICES_REQUIRED")
                        .at("vertices");
            }
            vertices.forEach(v -> validateVertex(v, "vertices"));
            double[] center = centroid(vertices);
            double[][] xy = projectRing(vertices, center[0], center[1]);
            if (Math.abs(shoelaceArea(xy)) < 1.0) {
                throw SystemException.badRequest(
                                "Đa giác vùng không phận có diện tích không hợp lệ.",
                                "AIRSPACE_POLYGON_TOO_SMALL")
                        .at("vertices");
            }
            double cLat = request.centerLat() != null ? request.centerLat() : center[0];
            double cLng = request.centerLng() != null ? request.centerLng() : center[1];
            validateLatLng(cLat, cLng, "centerLat");
            target.setCenterLat(scaleCoord(cLat));
            target.setCenterLng(scaleCoord(cLng));
            target.setRadiusMeters(null);
            target.setPolygonVertices(writeVertices(vertices));
        }
    }

    public static List<List<Double>> readVertices(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            List<List<Double>> parsed = JSON.readValue(json, new TypeReference<>() {});
            return parsed == null ? List.of() : parsed;
        } catch (JsonProcessingException e) {
            return List.of();
        }
    }

    public static String writeVertices(List<List<Double>> vertices) {
        if (vertices == null || vertices.isEmpty()) return null;
        try {
            return JSON.writeValueAsString(vertices);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Unable to serialize polygon vertices", e);
        }
    }

    private static void validateCheckRequest(AirspaceCheckRequest request) {
        if (request == null || request.areaType() == null) {
            throw SystemException.badRequest("Chọn kiểu vùng bay.", "AIRSPACE_AREA_TYPE_INVALID")
                    .at("areaType");
        }
        switch (request.areaType()) {
            case "POINT" -> resolvePoint(request);
            case "CIRCLE" -> {
                resolveCircleCenter(request);
                if (request.radiusMeters() == null || request.radiusMeters() <= 0) {
                    throw SystemException.badRequest(
                                    "Vùng tròn cần bán kính hợp lệ.", "FLIGHT_CIRCLE_INVALID")
                            .at("radiusMeters");
                }
            }
            case "POLYGON" -> {
                if (request.vertices() == null || request.vertices().size() < 3) {
                    throw SystemException.badRequest(
                                    "Vùng bay đa giác cần ít nhất 3 đỉnh.",
                                    "FLIGHT_POLYGON_TOO_SMALL")
                            .at("vertices");
                }
                request.vertices().forEach(v -> validateVertex(v, "vertices"));
            }
            default ->
                    throw SystemException.badRequest(
                                    "Kiểu vùng bay không hợp lệ.", "AIRSPACE_AREA_TYPE_INVALID")
                            .at("areaType");
        }
        if (request.takeoffLatitude() != null || request.takeoffLongitude() != null) {
            if (request.takeoffLatitude() == null || request.takeoffLongitude() == null) {
                throw SystemException.badRequest(
                                "Tọa độ điểm cất cánh không đầy đủ.", "FLIGHT_TAKEOFF_REQUIRED")
                        .at("takeoffLatitude");
            }
            validateLatLng(
                    request.takeoffLatitude(), request.takeoffLongitude(), "takeoffLatitude");
        }
    }

    private static double[] resolvePoint(AirspaceCheckRequest request) {
        if (request.takeoffLatitude() != null && request.takeoffLongitude() != null) {
            validateLatLng(
                    request.takeoffLatitude(), request.takeoffLongitude(), "takeoffLatitude");
            return new double[] {request.takeoffLatitude(), request.takeoffLongitude()};
        }
        if (request.vertices() != null && !request.vertices().isEmpty()) {
            List<Double> first = request.vertices().get(0);
            validateVertex(first, "vertices");
            return new double[] {first.get(0), first.get(1)};
        }
        throw SystemException.badRequest(
                        "Chọn điểm cất cánh trên bản đồ.", "FLIGHT_TAKEOFF_REQUIRED")
                .at("takeoffLatitude");
    }

    private static double[] resolveCircleCenter(AirspaceCheckRequest request) {
        if (request.vertices() != null && !request.vertices().isEmpty()) {
            List<Double> center = request.vertices().get(0);
            validateVertex(center, "vertices");
            return new double[] {center.get(0), center.get(1)};
        }
        if (request.takeoffLatitude() != null && request.takeoffLongitude() != null) {
            validateLatLng(
                    request.takeoffLatitude(), request.takeoffLongitude(), "takeoffLatitude");
            return new double[] {request.takeoffLatitude(), request.takeoffLongitude()};
        }
        throw SystemException.badRequest("Vùng tròn cần tâm tọa độ.", "FLIGHT_CIRCLE_INVALID")
                .at("vertices");
    }

    private static void validateVertex(List<Double> vertex, String field) {
        if (vertex == null
                || vertex.size() != 2
                || vertex.get(0) == null
                || vertex.get(1) == null) {
            throw SystemException.badRequest(
                            "Tọa độ đỉnh không hợp lệ.", "FLIGHT_COORDINATE_INVALID")
                    .at(field);
        }
        validateLatLng(vertex.get(0), vertex.get(1), field);
    }

    private static void validateLatLng(double lat, double lng, String field) {
        if (!Double.isFinite(lat)
                || !Double.isFinite(lng)
                || Math.abs(lat) > 90.0
                || Math.abs(lng) > 180.0) {
            throw SystemException.badRequest(
                            "Tọa độ địa lý không hợp lệ.", "FLIGHT_COORDINATE_INVALID")
                    .at(field);
        }
    }

    private static BigDecimal scaleCoord(double value) {
        return BigDecimal.valueOf(value).setScale(7, RoundingMode.HALF_UP);
    }

    private static double[] centroid(List<List<Double>> vertices) {
        double sumLat = 0.0;
        double sumLng = 0.0;
        for (List<Double> p : vertices) {
            sumLat += p.get(0);
            sumLng += p.get(1);
        }
        return new double[] {sumLat / vertices.size(), sumLng / vertices.size()};
    }

    private static double[] projectPoint(double lat, double lng, double refLat, double refLng) {
        double cos = Math.cos(Math.toRadians(refLat));
        double x = Math.toRadians(lng - refLng) * EARTH_RADIUS_M * cos;
        double y = Math.toRadians(lat - refLat) * EARTH_RADIUS_M;
        return new double[] {x, y};
    }

    private static double[][] projectRing(
            List<List<Double>> vertices, double refLat, double refLng) {
        double[][] xy = new double[vertices.size()][2];
        for (int i = 0; i < vertices.size(); i++) {
            xy[i] = projectPoint(vertices.get(i).get(0), vertices.get(i).get(1), refLat, refLng);
        }
        return xy;
    }

    private static boolean pointInPolygon(double[] p, double[][] ring) {
        for (int i = 0; i < ring.length; i++) {
            if (pointToSegmentDistance(p, ring[i], ring[(i + 1) % ring.length]) <= EPSILON) {
                return true;
            }
        }
        boolean inside = false;
        for (int i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            double xi = ring[i][0], yi = ring[i][1];
            double xj = ring[j][0], yj = ring[j][1];
            boolean straddles = (yi > p[1]) != (yj > p[1]);
            if (straddles && (p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    }

    private static double minDistanceToRingEdges(double[] p, double[][] ring) {
        double min = Double.POSITIVE_INFINITY;
        for (int i = 0; i < ring.length; i++) {
            double d = pointToSegmentDistance(p, ring[i], ring[(i + 1) % ring.length]);
            if (d < min) min = d;
        }
        return min;
    }

    static double pointToSegmentDistance(double[] p, double[] a, double[] b) {
        double dx = b[0] - a[0];
        double dy = b[1] - a[1];
        double lenSq = dx * dx + dy * dy;
        if (lenSq <= 1e-12) {
            return Math.hypot(p[0] - a[0], p[1] - a[1]);
        }
        double t = Math.max(0.0, Math.min(1.0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq));
        double projX = a[0] + t * dx;
        double projY = a[1] + t * dy;
        return Math.hypot(p[0] - projX, p[1] - projY);
    }

    static boolean segmentsIntersect(double[] a, double[] b, double[] c, double[] d) {
        double o1 = cross(a, b, c);
        double o2 = cross(a, b, d);
        double o3 = cross(c, d, a);
        double o4 = cross(c, d, b);

        if (((o1 > EPSILON && o2 < -EPSILON) || (o1 < -EPSILON && o2 > EPSILON))
                && ((o3 > EPSILON && o4 < -EPSILON) || (o3 < -EPSILON && o4 > EPSILON))) {
            return true;
        }
        if (Math.abs(o1) <= EPSILON && onSegment(a, b, c)) return true;
        if (Math.abs(o2) <= EPSILON && onSegment(a, b, d)) return true;
        if (Math.abs(o3) <= EPSILON && onSegment(c, d, a)) return true;
        return Math.abs(o4) <= EPSILON && onSegment(c, d, b);
    }

    private static double cross(double[] o, double[] a, double[] b) {
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    }

    private static boolean onSegment(double[] a, double[] b, double[] p) {
        return p[0] >= Math.min(a[0], b[0]) - EPSILON
                && p[0] <= Math.max(a[0], b[0]) + EPSILON
                && p[1] >= Math.min(a[1], b[1]) - EPSILON
                && p[1] <= Math.max(a[1], b[1]) + EPSILON;
    }

    private static double shoelaceArea(double[][] xy) {
        double sum = 0.0;
        for (int i = 0; i < xy.length; i++) {
            double[] a = xy[i];
            double[] b = xy[(i + 1) % xy.length];
            sum += a[0] * b[1] - b[0] * a[1];
        }
        return sum / 2.0;
    }

    private static double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
