package com.uav.platform.service.impl.simulation;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

import java.util.List;

class SurveyPatternOperationsTest {
    // About 400 m east-west by 220 m north-south near Hoa Lac.
    static final List<List<Double>> RECTANGLE =
            List.of(
                    List.of(21.0100, 105.5200), List.of(21.0100, 105.5239),
                    List.of(21.0120, 105.5239), List.of(21.0120, 105.5200));

    @Test
    void lineSpacingFollowsAltitudeAndSideOverlap() {
        // Footprint at 50 m is about 75 m; 65 % overlap leaves about 26 m between lines.
        assertEquals(26.3, SurveyPatternOperations.lineSpacingFor(50, 65), 0.5);
        assertTrue(
                SurveyPatternOperations.lineSpacingFor(100, 65)
                        > SurveyPatternOperations.lineSpacingFor(50, 65));
        assertTrue(
                SurveyPatternOperations.lineSpacingFor(50, 80)
                        < SurveyPatternOperations.lineSpacingFor(50, 65));
    }

    @Test
    void sweepsTheRectangleAlongItsLongSideWithAlternatingDirections() {
        List<List<Double>> path = SurveyPatternOperations.plan(RECTANGLE, 30);
        // 222 m wide / 30 m spacing: 7 lines, two points each.
        assertEquals(14, path.size());
        for (int i = 0; i < path.size(); i += 2)
            assertEquals(
                    path.get(i).get(0),
                    path.get(i + 1).get(0),
                    2e-6,
                    "a sweep line keeps its latitude");
        double firstDirection = path.get(1).get(1) - path.get(0).get(1);
        double secondDirection = path.get(3).get(1) - path.get(2).get(1);
        assertTrue(
                firstDirection * secondDirection < 0,
                "consecutive lines are flown in opposite directions");
        for (List<Double> p : path) {
            assertTrue(p.get(0) >= 21.0100 - 1e-6 && p.get(0) <= 21.0120 + 1e-6);
            assertTrue(p.get(1) >= 105.5200 - 1e-6 && p.get(1) <= 105.5239 + 1e-6);
        }
    }

    @Test
    void concavePolygonFliesEachInsideSegmentOfASweepLine() {
        // A U shape: lines across the notch cross the boundary four times.
        List<List<Double>> u =
                List.of(
                        List.of(21.0100, 105.5200),
                        List.of(21.0100, 105.5240),
                        List.of(21.0130, 105.5240),
                        List.of(21.0130, 105.5228),
                        List.of(21.0110, 105.5228),
                        List.of(21.0110, 105.5212),
                        List.of(21.0130, 105.5212),
                        List.of(21.0130, 105.5200));
        List<List<Double>> path = SurveyPatternOperations.plan(u, 25);
        assertTrue(path.size() > 12);
        // No waypoint lies inside the notch.
        for (List<Double> p : path)
            assertFalse(
                    p.get(0) > 21.0111 && p.get(1) > 105.5213 && p.get(1) < 105.5227,
                    "waypoint " + p + " is inside the notch");
    }

    @Test
    void narrowAreaGetsOneCentrePass() {
        List<List<Double>> strip =
                List.of(
                        List.of(21.0100, 105.5200),
                        List.of(21.0100, 105.5240),
                        List.of(21.01005, 105.5240),
                        List.of(21.01005, 105.5200));
        assertEquals(2, SurveyPatternOperations.plan(strip, 30).size());
    }

    @Test
    void rejectsDegenerateInput() {
        assertThrows(
                IllegalArgumentException.class,
                () -> SurveyPatternOperations.plan(List.of(List.of(21.0, 105.0)), 30));
        assertThrows(
                IllegalArgumentException.class, () -> SurveyPatternOperations.plan(RECTANGLE, 0));
    }

    @Test
    void pathLengthAddsHaversineLegs() {
        double oneDegreeLatitude =
                SurveyPatternOperations.pathLength(
                        List.of(List.of(21.0, 105.0), List.of(22.0, 105.0)));
        assertEquals(111_195, oneDegreeLatitude, 50);
    }
}
