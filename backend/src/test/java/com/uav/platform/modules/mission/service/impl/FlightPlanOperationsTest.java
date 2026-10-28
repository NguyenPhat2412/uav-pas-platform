package com.uav.platform.modules.mission.service.impl;

import static org.junit.jupiter.api.Assertions.*;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.mission.dto.request.FlightPlanRequest;
import com.uav.platform.modules.mission.dto.response.FlightPlanResponse;

import org.junit.jupiter.api.Test;

import java.util.List;

class FlightPlanOperationsTest {
    // 100 m north/east steps at 21° N: 1 m ≈ 8.993e-6° latitude, ≈ 9.633e-6° longitude.
    private static final double DLAT = 100 / 111_195.0,
            DLNG = 100 / (111_195.0 * Math.cos(Math.toRadians(21)));

    private FlightPlanRequest plan(
            String type, List<List<Double>> vertices, Integer radius, int altitude, double gsd) {
        return new FlightPlanRequest(
                type,
                vertices,
                radius,
                21.0,
                105.8,
                altitude,
                gsd,
                80,
                70,
                List.of("RGB_4K"),
                " ",
                true);
    }

    @Test
    void squarePolygonGetsAreaPerimeterAndCentre() {
        FlightPlanResponse r =
                FlightPlanOperations.resolve(
                        plan(
                                "POLYGON",
                                List.of(
                                        List.of(21.0, 105.8),
                                        List.of(21.0 + DLAT, 105.8),
                                        List.of(21.0 + DLAT, 105.8 + DLNG),
                                        List.of(21.0, 105.8 + DLNG)),
                                null,
                                80,
                                3.0));
        assertEquals(10_000, r.areaSquareMeters(), 50);
        assertEquals(400, r.perimeterMeters(), 2);
        assertEquals(21.0 + DLAT / 2, r.centerLatitude(), 1e-6);
        assertNull(r.obstacles());
    }

    @Test
    void circleUsesItsRadius() {
        FlightPlanResponse r =
                FlightPlanOperations.resolve(
                        plan("CIRCLE", List.of(List.of(21.02, 105.81)), 500, 100, 5.0));
        assertEquals(Math.PI * 250_000, r.areaSquareMeters(), 1);
        assertEquals(21.02, r.centerLatitude());
    }

    @Test
    void rejectsUnsupportedAltitudeAndDegeneratePolygons() {
        assertEquals(
                "FLIGHT_ALTITUDE_INVALID",
                assertThrows(
                                SystemException.class,
                                () ->
                                        FlightPlanOperations.resolve(
                                                plan("POINT", List.of(), null, 75, 3.0)))
                        .getCode());
        assertEquals(
                "FLIGHT_POLYGON_TOO_SMALL",
                assertThrows(
                                SystemException.class,
                                () ->
                                        FlightPlanOperations.resolve(
                                                plan(
                                                        "POLYGON",
                                                        List.of(
                                                                List.of(21.0, 105.8),
                                                                List.of(21.001, 105.8)),
                                                        null,
                                                        80,
                                                        3.0)))
                        .getCode());
    }

    @Test
    void roundTripsThroughJsonAndToleratesLegacyText() {
        FlightPlanResponse r =
                FlightPlanOperations.resolve(plan("POINT", List.of(), null, 50, 1.5));
        assertEquals(r, FlightPlanOperations.read(FlightPlanOperations.write(r)));
        assertNull(FlightPlanOperations.read("not json"));
    }
}
