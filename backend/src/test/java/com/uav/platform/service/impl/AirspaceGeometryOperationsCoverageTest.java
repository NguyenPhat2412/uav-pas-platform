package com.uav.platform.service.impl;

import static org.junit.jupiter.api.Assertions.*;

import com.uav.platform.dto.record.SpatialIntersection;
import com.uav.platform.dto.request.AirspaceCheckRequest;
import com.uav.platform.dto.request.AirspaceZoneUpsertRequest;
import com.uav.platform.dto.response.AirspaceCheckResponse;
import com.uav.platform.entity.AirspaceZone;
import com.uav.platform.enums.AirspaceGeometryType;
import com.uav.platform.enums.AirspaceZoneType;
import com.uav.platform.error.SystemException;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

class AirspaceGeometryOperationsCoverageTest {

    private List<List<Double>> square(double lat, double lng, double d) {
        return List.of(
                List.of(lat - d, lng - d),
                List.of(lat - d, lng + d),
                List.of(lat + d, lng + d),
                List.of(lat + d, lng - d));
    }

    @Test
    void evaluateAndValidateCheckRequestCoverAllErrorAndResolutionBranches() {
        // Null request / null areaType / unknown areaType
        assertThrows(
                SystemException.class, () -> AirspaceGeometryOperations.evaluate(null, List.of()));
        assertThrows(
                SystemException.class,
                () ->
                        AirspaceGeometryOperations.evaluate(
                                new AirspaceCheckRequest(null, null, null, null, null, 50),
                                List.of()));
        assertThrows(
                SystemException.class,
                () ->
                        AirspaceGeometryOperations.evaluate(
                                new AirspaceCheckRequest("LINE", null, null, 21.0, 105.8, 50),
                                List.of()));

        // Direct intersectFlightPlanWithZone unknown areaType
        AirspaceZone dummy = new AirspaceZone();
        assertThrows(
                SystemException.class,
                () ->
                        AirspaceGeometryOperations.intersectFlightPlanWithZone(
                                new AirspaceCheckRequest("HEX", null, null, 21.0, 105.8, 50),
                                dummy));

        // POINT with vertices fallback & missing both
        AirspaceCheckResponse ptFromVertex =
                AirspaceGeometryOperations.evaluate(
                        new AirspaceCheckRequest(
                                "POINT", List.of(List.of(21.0, 105.8)), null, null, null, 50),
                        List.of());
        assertEquals("CLEAR", ptFromVertex.clearance());
        assertThrows(
                SystemException.class,
                () ->
                        AirspaceGeometryOperations.evaluate(
                                new AirspaceCheckRequest("POINT", List.of(), null, null, null, 50),
                                List.of()));

        // CIRCLE with takeoff fallback, missing radius, missing center
        AirspaceCheckResponse circleFromTakeoff =
                AirspaceGeometryOperations.evaluate(
                        new AirspaceCheckRequest("CIRCLE", null, 100, 21.0, 105.8, 50), List.of());
        assertEquals("CLEAR", circleFromTakeoff.clearance());
        assertThrows(
                SystemException.class,
                () ->
                        AirspaceGeometryOperations.evaluate(
                                new AirspaceCheckRequest("CIRCLE", null, 0, 21.0, 105.8, 50),
                                List.of()));
        assertThrows(
                SystemException.class,
                () ->
                        AirspaceGeometryOperations.evaluate(
                                new AirspaceCheckRequest("CIRCLE", null, 100, null, null, 50),
                                List.of()));

        // POLYGON < 3 vertices, invalid vertex, out-of-range lat/lng, partial takeoff
        assertThrows(
                SystemException.class,
                () ->
                        AirspaceGeometryOperations.evaluate(
                                new AirspaceCheckRequest(
                                        "POLYGON",
                                        List.of(List.of(21.0, 105.8)),
                                        null,
                                        null,
                                        null,
                                        50),
                                List.of()));
        assertThrows(
                SystemException.class,
                () ->
                        AirspaceGeometryOperations.evaluate(
                                new AirspaceCheckRequest(
                                        "POLYGON",
                                        Arrays.asList(
                                                List.of(21.0, 105.8),
                                                List.of(21.1),
                                                List.of(21.2, 105.9)),
                                        null,
                                        null,
                                        null,
                                        50),
                                List.of()));
        assertThrows(
                SystemException.class,
                () ->
                        AirspaceGeometryOperations.evaluate(
                                new AirspaceCheckRequest("POINT", null, null, 95.0, 105.8, 50),
                                List.of()));
        assertThrows(
                SystemException.class,
                () ->
                        AirspaceGeometryOperations.evaluate(
                                new AirspaceCheckRequest(
                                        "CIRCLE",
                                        List.of(List.of(21.0, 105.8)),
                                        100,
                                        21.0,
                                        null,
                                        50),
                                List.of()));
    }

    @Test
    void applyUpsertAndVertexSerializationCoverCircleAndPolygonValidation() {
        AirspaceZone target = new AirspaceZone();

        // Circle missing center & small radius
        assertThrows(
                SystemException.class,
                () ->
                        AirspaceGeometryOperations.applyUpsert(
                                target,
                                new AirspaceZoneUpsertRequest(
                                        "Z1",
                                        "Zone",
                                        AirspaceZoneType.PROHIBITED,
                                        AirspaceGeometryType.CIRCLE,
                                        null,
                                        null,
                                        100,
                                        null,
                                        null,
                                        "CAAV",
                                        true,
                                        " ")));
        assertThrows(
                SystemException.class,
                () ->
                        AirspaceGeometryOperations.applyUpsert(
                                target,
                                new AirspaceZoneUpsertRequest(
                                        "Z1",
                                        "Zone",
                                        AirspaceZoneType.PROHIBITED,
                                        AirspaceGeometryType.CIRCLE,
                                        21.0,
                                        105.8,
                                        5,
                                        null,
                                        null,
                                        "CAAV",
                                        true,
                                        null)));

        // Valid PROHIBITED circle with null maxAlt defaults to 0 and blank description -> null
        AirspaceGeometryOperations.applyUpsert(
                target,
                new AirspaceZoneUpsertRequest(
                        "nfz-1",
                        "No Fly",
                        AirspaceZoneType.PROHIBITED,
                        AirspaceGeometryType.CIRCLE,
                        21.0,
                        105.8,
                        500,
                        null,
                        null,
                        "CAAV",
                        null,
                        "   "));
        assertEquals(0, target.getMaxAltitudeAglM());
        assertNull(target.getDescription());
        assertEquals("NFZ-1", target.getCode());

        // Polygon < 3 vertices -> error
        assertThrows(
                SystemException.class,
                () ->
                        AirspaceGeometryOperations.applyUpsert(
                                target,
                                new AirspaceZoneUpsertRequest(
                                        "P1",
                                        "Poly",
                                        AirspaceZoneType.RESTRICTED,
                                        AirspaceGeometryType.POLYGON,
                                        null,
                                        null,
                                        null,
                                        List.of(List.of(21.0, 105.8), List.of(21.1, 105.9)),
                                        120,
                                        "CAAV",
                                        true,
                                        "desc")));

        // Collinear polygon (zero area) -> AIRSPACE_POLYGON_TOO_SMALL
        assertThrows(
                SystemException.class,
                () ->
                        AirspaceGeometryOperations.applyUpsert(
                                target,
                                new AirspaceZoneUpsertRequest(
                                        "P1",
                                        "Line",
                                        AirspaceZoneType.RESTRICTED,
                                        AirspaceGeometryType.POLYGON,
                                        null,
                                        null,
                                        null,
                                        List.of(
                                                List.of(21.0, 105.8),
                                                List.of(21.0, 105.8),
                                                List.of(21.0, 105.8)),
                                        120,
                                        "CAAV",
                                        true,
                                        "desc")));

        // Valid polygon computes centroid and serializes vertices
        AirspaceGeometryOperations.applyUpsert(
                target,
                new AirspaceZoneUpsertRequest(
                        "P2",
                        "Valid Poly",
                        AirspaceZoneType.WARNING,
                        AirspaceGeometryType.POLYGON,
                        null,
                        null,
                        null,
                        square(21.0, 105.8, 0.01),
                        null,
                        "CAAV",
                        true,
                        "warning zone"));
        assertNotNull(target.getPolygonVertices());
        assertNull(target.getRadiusMeters());

        // readVertices malformed JSON & writeVertices empty/null
        assertTrue(AirspaceGeometryOperations.readVertices("{bad-json").isEmpty());
        assertTrue(AirspaceGeometryOperations.readVertices("  ").isEmpty());
        assertNull(AirspaceGeometryOperations.writeVertices(null));
        assertNull(AirspaceGeometryOperations.writeVertices(List.of()));
    }

    @Test
    void spatialGeometryAndEffectiveWindowsCoverVertexEdgeCollinearAndZeroLengthSegments() {
        // circleVsPolygon: vertex hit (outside polygon, near vertex)
        List<List<Double>> poly = square(21.0, 105.8, 0.01);
        SpatialIntersection vertexHit =
                AirspaceGeometryOperations.circleVsPolygon(21.0105, 105.8105, 200.0, poly);
        assertTrue(vertexHit.intersects());

        // circleVsPolygon: edge hit (outside polygon, close to midpoint of edge, far from vertices)
        SpatialIntersection edgeHit =
                AirspaceGeometryOperations.circleVsPolygon(21.0105, 105.8, 200.0, poly);
        assertTrue(edgeHit.intersects());

        // pointToSegmentDistance degenerate zero-length segment
        double deg =
                AirspaceGeometryOperations.pointToSegmentDistance(
                        new double[] {3.0, 4.0}, new double[] {0.0, 0.0}, new double[] {0.0, 0.0});
        assertEquals(5.0, deg, 1e-6);

        // segmentsIntersect collinear overlapping & touching endpoints (covers onSegment)
        assertTrue(
                AirspaceGeometryOperations.segmentsIntersect(
                        new double[] {0.0, 0.0},
                        new double[] {4.0, 0.0},
                        new double[] {2.0, 0.0},
                        new double[] {6.0, 0.0}));
        assertFalse(
                AirspaceGeometryOperations.segmentsIntersect(
                        new double[] {0.0, 0.0},
                        new double[] {1.0, 0.0},
                        new double[] {3.0, 0.0},
                        new double[] {4.0, 0.0}));

        // isEffectiveDuringWindow branches
        assertFalse(AirspaceGeometryOperations.isEffectiveDuringWindow(null, null, null));
        AirspaceZone z = new AirspaceZone();
        LocalDateTime now = LocalDateTime.now();
        z.setEffectiveFrom(now.plusDays(2));
        z.setEffectiveUntil(now.plusDays(5));

        // plannedStart == null && plannedEnd != null, before effectiveFrom -> false
        assertFalse(AirspaceGeometryOperations.isEffectiveDuringWindow(z, null, now.plusDays(1)));
        // plannedStart == null && plannedEnd != null, inside window -> true
        assertTrue(AirspaceGeometryOperations.isEffectiveDuringWindow(z, null, now.plusDays(3)));
        // both null -> uses now, which is before effectiveFrom -> false
        assertFalse(AirspaceGeometryOperations.isEffectiveDuringWindow(z, null, null));
        // after effectiveUntil -> false
        assertFalse(
                AirspaceGeometryOperations.isEffectiveDuringWindow(
                        z, now.plusDays(6), now.plusDays(7)));

        // Evaluate warning zone without maxAlt -> CAUTION
        z.setId(9L);
        z.setCode("W-1");
        z.setName("Warn");
        z.setZoneType(AirspaceZoneType.WARNING);
        z.setGeometryType(AirspaceGeometryType.CIRCLE);
        z.setCenterLat(new BigDecimal("21.0"));
        z.setCenterLng(new BigDecimal("105.8"));
        z.setRadiusMeters(500);
        z.setAuthority("CAAV");
        z.setActive(true);
        z.setEffectiveFrom(null);
        z.setEffectiveUntil(null);
        z.setMaxAltitudeAglM(null);
        AirspaceCheckResponse caution =
                AirspaceGeometryOperations.evaluate(
                        new AirspaceCheckRequest("POINT", null, null, 21.0, 105.8, 80), List.of(z));
        assertEquals("CAUTION", caution.clearance());
    }
}
