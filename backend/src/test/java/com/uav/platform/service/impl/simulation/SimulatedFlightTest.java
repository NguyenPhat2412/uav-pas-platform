package com.uav.platform.service.impl.simulation;

import static org.junit.jupiter.api.Assertions.*;

import com.uav.platform.dto.request.uav.TelemetryReportRequest;
import com.uav.platform.enums.simulation.SimCommand;
import com.uav.platform.enums.simulation.SimEventLevel;
import com.uav.platform.enums.simulation.SimFlightMode;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

class SimulatedFlightTest {
    static final double HOME_LAT = 21.0100, HOME_LNG = 105.5200;
    static final LocalDateTime T0 = LocalDateTime.of(2026, 11, 2, 9, 0);

    static SimulatedFlight flight(List<List<Double>> waypoints, double battery, double loss, int latency, double fence) {
        return new SimulatedFlight(7L, null, waypoints, HOME_LAT, HOME_LNG, battery,
                new SimulatedFlight.Settings(30, 10, loss, latency, 0, fence), new Random(42), T0);
    }

    static List<TelemetryReportRequest> run(SimulatedFlight f, int seconds) {
        List<TelemetryReportRequest> delivered = new ArrayList<>();
        for (int s = 1; s <= seconds && !f.finished(); s++) {
            LocalDateTime now = T0.plusSeconds(s);
            f.step(1, now);
            delivered.addAll(f.due(now));
        }
        return delivered;
    }

    @Test
    void fliesTheRouteReturnsHomeAndLands() {
        // Two points about 110 m and 150 m away.
        var f = flight(List.of(List.of(21.0110, 105.5200), List.of(21.0110, 105.5213)), 100, 0, 0, 2000);
        run(f, 600);
        assertEquals(SimFlightMode.LANDED, f.mode());
        assertEquals(2, f.nextWaypoint());
        assertTrue(f.distanceToHome() < 1, "lands at home");
        assertEquals(0, f.altitude(), 1e-9);
        assertTrue(f.distanceFlown() > 400 && f.distanceFlown() < 440, "flew about 111 + 135 + 175 m");
        assertTrue(f.battery() < 100);
    }

    @Test
    void climbsBeforeFlyingAndHoldsWithoutARoute() {
        var f = flight(List.of(), 100, 0, 0, 2000);
        run(f, 5);
        assertEquals(SimFlightMode.TAKEOFF, f.mode());
        assertEquals(15, f.altitude(), 1e-9);
        run(f, 10);
        assertEquals(SimFlightMode.HOLD, f.mode());
        assertEquals(0, f.distanceFlown(), 1e-9);
    }

    @Test
    void lowBatteryForcesReturnToHome() {
        var f = flight(List.of(List.of(21.0300, 105.5200)), 21, 0, 0, 5000);
        run(f, 30);
        assertTrue(f.events().stream().anyMatch(e -> e.level() == SimEventLevel.CRITICAL && e.message().contains("RTH")));
        // It had barely left home, so the return is short and it is already coming down.
        assertNotEquals(SimFlightMode.MISSION, f.mode());
        assertTrue(f.distanceToHome() < 50);
    }

    @Test
    void criticalBatteryLandsWherever() {
        var f = flight(List.of(List.of(21.0300, 105.5200)), 11, 0, 0, 5000);
        run(f, 40);
        assertTrue(f.mode() == SimFlightMode.LANDING || f.mode() == SimFlightMode.LANDED);
    }

    @Test
    void geofenceBreachTriggersReturnToHome() {
        // Target 2.2 km away with a 500 m fence.
        var f = flight(List.of(List.of(21.0300, 105.5200)), 100, 0, 0, 500);
        run(f, 90);
        assertTrue(f.events().stream().anyMatch(e -> e.message().contains("rào địa lý")));
        assertTrue(f.distanceToHome() < 560, "turned back near the fence");
    }

    @Test
    void operatorCommandsFollowThePhaseRules() {
        var f = flight(List.of(List.of(21.0130, 105.5200)), 100, 0, 0, 5000);
        assertThrows(IllegalStateException.class, () -> f.command(SimCommand.PAUSE, T0), "cannot pause during take-off");
        run(f, 15);
        assertEquals(SimFlightMode.MISSION, f.mode());
        f.command(SimCommand.PAUSE, T0);
        double lat = f.latitude();
        run(f, 5);
        assertEquals(lat, f.latitude(), 1e-12, "holds position");
        f.command(SimCommand.RESUME, T0);
        assertEquals(SimFlightMode.MISSION, f.mode());
        f.command(SimCommand.RETURN_TO_HOME, T0);
        assertThrows(IllegalStateException.class, () -> f.command(SimCommand.RETURN_TO_HOME, T0));
        f.command(SimCommand.LAND, T0);
        assertEquals(SimFlightMode.LANDING, f.mode());
    }

    @Test
    void lossyLinkDropsAboutTheConfiguredShareAndDelaysTheRest() {
        var f = flight(List.of(List.of(21.0300, 105.5200)), 100, 20, 1500, 10_000);
        List<TelemetryReportRequest> delivered = run(f, 200);
        var link = f.linkStats();
        assertEquals(200, link.sent());
        assertEquals(link.sent(), link.delivered() + link.lost() + 2, "with 1.5 s delay the last two samples are in flight");
        assertTrue(link.lost() > 25 && link.lost() < 55, "about 20 % of 200 lost, got " + link.lost());
        assertEquals(1500, link.averageLatencyMs(), 1e-9);
        assertEquals(delivered.size(), link.delivered());
        for (TelemetryReportRequest r : delivered) {
            assertTrue(r.batteryPct() >= 0 && r.batteryPct() <= 100);
            assertTrue(r.headingDeg() >= 0 && r.headingDeg() <= 360);
        }
    }
}
