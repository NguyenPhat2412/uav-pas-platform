package com.uav.platform.service.impl.uav;

import static org.junit.jupiter.api.Assertions.*;

import com.uav.platform.dto.response.uav.MissionTelemetryReplayResponse;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.uav.Uav;
import com.uav.platform.entity.uav.UavTelemetry;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

class TelemetryReplayOperationsCoverageTest {

    private UavTelemetry telemetrySample(
            double lat,
            double lng,
            Double alt,
            Double speed,
            Double heading,
            Integer battery,
            String rtk,
            Integer sats,
            LocalDateTime at) {
        UavTelemetry t = new UavTelemetry();
        t.setLatitude(BigDecimal.valueOf(lat));
        t.setLongitude(BigDecimal.valueOf(lng));
        t.setAltitudeAglMeters(alt);
        t.setGroundSpeedMs(speed);
        t.setHeadingDeg(heading);
        t.setBatteryPct(battery);
        t.setRtkStatus(rtk);
        t.setSatellites(sats);
        t.setRecordedAt(at);
        return t;
    }

    @Test
    void buildReplayFromRecordedTelemetryCoversAllFieldsAndFallbacks() {
        Uav uav = new Uav();
        uav.setId(7L);
        uav.setSerialNumber("DJI-M350-001");
        uav.setModel("Matrice 350 RTK");

        Mission mission = new Mission();
        mission.setId(10L);
        mission.setCode("MIS-10");
        mission.setUav(uav);
        mission.setFlightPlan("{\"altitudeAglMeters\": 80}");

        LocalDateTime t0 = LocalDateTime.of(2026, 5, 1, 9, 0);
        // 4 samples exercising explicit values, null fallbacks, and heading wraparound >180 & <-180
        List<UavTelemetry> rows =
                List.of(
                        telemetrySample(21.0285, 105.8542, 75.0, 12.0, 350.0, 95, "FIXED", 21, t0),
                        telemetrySample(
                                21.0295,
                                105.8552,
                                null,
                                null,
                                10.0,
                                null,
                                null,
                                null,
                                t0.plusSeconds(10)),
                        telemetrySample(
                                21.0305,
                                105.8540,
                                82.0,
                                9.0,
                                200.0,
                                88,
                                "FLOAT",
                                14,
                                t0.plusSeconds(20)),
                        telemetrySample(
                                21.0310,
                                105.8535,
                                70.0,
                                6.0,
                                null,
                                85,
                                "FIXED",
                                19,
                                t0.plusSeconds(30)));

        MissionTelemetryReplayResponse resp = TelemetryReplayOperations.buildReplay(mission, rows);
        assertEquals(10L, resp.missionId());
        assertEquals(7L, resp.uavId());
        assertEquals(4, resp.samples().size());
        assertEquals("TELEMETRY", resp.samples().get(0).source());
        assertTrue(resp.totalDistanceMeters() > 0);
        assertEquals(82.0, resp.maxAltitudeMeters());
        assertTrue(resp.terrainClearanceSafe());

        // Check fallback fields on row 1
        var s1 = resp.samples().get(1);
        assertEquals(80.0, s1.altitudeAglMeters());
        assertEquals(8.5, s1.groundSpeedMs());
        assertEquals("FIXED", s1.rtkStatus());
        assertEquals(18, s1.satellites());
    }

    @Test
    void buildReplayWithTwoRecordedSamplesUsesFullMinClearanceStreamAndDerivedBearings() {
        Mission mission = new Mission();
        mission.setId(11L);
        mission.setCode("MIS-11");
        LocalDateTime t0 = LocalDateTime.of(2026, 5, 1, 9, 0);

        List<UavTelemetry> rows =
                List.of(
                        telemetrySample(21.0000, 105.8000, 10.0, 5.0, null, 90, "FIXED", 16, t0),
                        telemetrySample(
                                21.0010,
                                105.8010,
                                10.0,
                                5.0,
                                null,
                                89,
                                "FIXED",
                                16,
                                t0.plusSeconds(15)));

        MissionTelemetryReplayResponse resp = TelemetryReplayOperations.buildReplay(mission, rows);
        assertNull(resp.uavId());
        assertEquals("UAV-350-GNSS", resp.uavSerialNumber());
        assertEquals(2, resp.samples().size());
        assertFalse(resp.terrainClearanceSafe());
    }

    @Test
    void buildReplayFromFlightPlanWithVerticesTakeoffAndManyPoints() {
        Mission mission = new Mission();
        mission.setId(12L);
        mission.setCode("MIS-12");
        mission.setStartTime(LocalDateTime.of(2026, 5, 1, 10, 0));
        mission.setLatitude(new BigDecimal("21.05"));
        mission.setLongitude(new BigDecimal("105.82"));

        // 14+ vertices including a malformed vertex to test filtering and subdivideWaypoints early
        // return
        StringBuilder verts = new StringBuilder("[");
        for (int i = 0; i < 14; i++) {
            if (i > 0) verts.append(",");
            verts.append("[")
                    .append(21.05 + i * 0.0005)
                    .append(",")
                    .append(105.82 + i * 0.0005)
                    .append("]");
        }
        verts.append(",[null,105.82]]");
        mission.setFlightPlan(
                "{\"altitudeAglMeters\":90,\"takeoffLatitude\":21.049,\"takeoffLongitude\":105.819,\"vertices\":"
                        + verts
                        + "}");

        MissionTelemetryReplayResponse resp =
                TelemetryReplayOperations.buildReplay(mission, List.of());
        assertTrue(resp.samples().size() >= 14);
        assertEquals("FLIGHT_PLAN_TRAJECTORY", resp.samples().get(0).source());
        assertEquals(90.0, resp.maxAltitudeMeters());
    }

    @Test
    void buildReplayFromFlightPlanWithCenterRadiusAndNullMissionCoords() {
        Mission mission = new Mission();
        mission.setId(13L);
        mission.setCode("MIS-13");
        mission.setFlightPlan(
                "{\"centerLatitude\":16.0544,\"centerLongitude\":108.2022,\"radiusMeters\":250}");

        MissionTelemetryReplayResponse resp = TelemetryReplayOperations.buildReplay(mission, null);
        assertTrue(resp.samples().size() >= 12);
        assertTrue(resp.totalDistanceMeters() > 0);

        // Completely empty mission falls back to Hanoi defaults
        Mission bare = new Mission();
        bare.setId(14L);
        bare.setCode("MIS-14");
        MissionTelemetryReplayResponse bareResp =
                TelemetryReplayOperations.buildReplay(bare, List.of());
        assertFalse(bareResp.samples().isEmpty());
        assertEquals(60.0, bareResp.maxAltitudeMeters());
    }
}
