package com.uav.platform.service.impl.dashboard;

import static org.junit.jupiter.api.Assertions.*;

import com.uav.platform.dto.response.dashboard.FleetMapResponse.UavPin;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.station.Station;
import com.uav.platform.entity.uav.Uav;
import com.uav.platform.enums.mission.MissionStatus;
import com.uav.platform.enums.uav.UavStatus;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

class FleetMapServiceTest {

    private Station station() {
        Station s = new Station();
        ReflectionTestUtils.setField(s, "id", 7L);
        s.setLatitude(21.0);
        s.setLongitude(105.8);
        return s;
    }

    private Uav uav(long id, UavStatus status, Station station) {
        Uav u = new Uav();
        ReflectionTestUtils.setField(u, "id", id);
        u.setStatus(status);
        u.setStation(station);
        return u;
    }

    private Mission mission(Uav uav, MissionStatus status, LocalDateTime start) {
        Mission m = new Mission();
        m.setUav(uav);
        m.setStatus(status);
        m.setStartTime(start);
        m.setLatitude(new BigDecimal("21.5"));
        m.setLongitude(new BigDecimal("106.1"));
        return m;
    }

    @Test
    void flyingUavIsPlacedAtItsMissionAndIdleUavAtItsStation() {
        Station home = station();
        Uav flying = uav(1, UavStatus.IN_USE, home);
        UavPin atMission =
                FleetMapServiceImpl.pin(flying, mission(flying, MissionStatus.IN_PROGRESS, null));
        assertEquals("MISSION", atMission.positionSource());
        assertEquals(21.5, atMission.latitude());

        UavPin idle = FleetMapServiceImpl.pin(uav(2, UavStatus.AVAILABLE, home), null);
        assertEquals("STATION", idle.positionSource());
        assertEquals(105.8, idle.longitude());

        UavPin unknown = FleetMapServiceImpl.pin(uav(3, UavStatus.MAINTENANCE, null), null);
        assertEquals("NONE", unknown.positionSource());
        assertNull(unknown.latitude());
    }

    @Test
    void availableUavWithAScheduledMissionStaysAtItsStation() {
        Uav idle = uav(4, UavStatus.AVAILABLE, station());
        UavPin pin =
                FleetMapServiceImpl.pin(
                        idle,
                        mission(idle, MissionStatus.CONFIRMED, LocalDateTime.now().plusDays(1)));
        assertEquals("STATION", pin.positionSource());
        assertNotNull(pin.activeMission());
    }

    @Test
    void inProgressMissionWinsOverEarlierScheduledOnes() {
        Uav u = uav(5, UavStatus.IN_USE, station());
        Mission scheduled =
                mission(u, MissionStatus.CONFIRMED, LocalDateTime.of(2026, 10, 1, 8, 0));
        Mission flying = mission(u, MissionStatus.IN_PROGRESS, LocalDateTime.of(2026, 10, 2, 8, 0));
        assertSame(
                flying, FleetMapServiceImpl.activeMissionByUav(List.of(scheduled, flying)).get(5L));
    }
}
