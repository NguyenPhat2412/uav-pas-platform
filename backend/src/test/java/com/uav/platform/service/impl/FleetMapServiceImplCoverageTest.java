package com.uav.platform.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.dao.IMissionDao;
import com.uav.platform.dao.IStationDao;
import com.uav.platform.dao.IUavDao;
import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.dto.response.FleetMapResponse;
import com.uav.platform.dto.response.FleetMapResponse.StationPin;
import com.uav.platform.dto.response.FleetMapResponse.UavPin;
import com.uav.platform.dto.response.TelemetryResponse;
import com.uav.platform.entity.Mission;
import com.uav.platform.entity.Station;
import com.uav.platform.entity.Uav;
import com.uav.platform.enums.MissionStatus;
import com.uav.platform.enums.StationStatus;
import com.uav.platform.enums.UavStatus;
import com.uav.platform.service.TelemetryService;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@ExtendWith(MockitoExtension.class)
class FleetMapServiceImplCoverageTest {

    @Mock private IUavDao uavs;
    @Mock private IStationDao stations;
    @Mock private IMissionDao missions;
    @Mock private TelemetryService telemetry;

    private FleetMapServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new FleetMapServiceImpl(uavs, stations, missions, telemetry);
    }

    @Test
    @SuppressWarnings("unchecked")
    void fleetMapAggregatesTelemetryMissionsAndStations() {
        Station s1 = new Station();
        s1.setId(1L);
        s1.setCode("HN-01");
        s1.setName("Hanoi Hub");
        s1.setLatitude(21.0285);
        s1.setLongitude(105.8542);
        s1.setStatus(StationStatus.ACTIVE);

        Station s2 = new Station();
        s2.setId(2L);
        s2.setCode("DN-01");
        s2.setName("Danang Hub");
        s2.setStatus(null);

        Uav u1 = new Uav();
        u1.setId(10L);
        u1.setModel("M350");
        u1.setSerialNumber("SN-10");
        u1.setManufacturer("DJI");
        u1.setStatus(UavStatus.IN_USE);
        u1.setStation(s1);

        Uav u2 = new Uav();
        u2.setId(20L);
        u2.setModel("M30T");
        u2.setSerialNumber("SN-20");
        u2.setManufacturer("DJI");
        u2.setStatus(UavStatus.ASSIGNED);
        u2.setStation(s1);

        Uav u3 = new Uav();
        u3.setId(5L);
        u3.setModel("T40");
        u3.setSerialNumber("SN-05");
        u3.setManufacturer("DJI");
        u3.setStatus(UavStatus.AVAILABLE);
        u3.setStation(null);

        Mission m1 = new Mission();
        m1.setId(100L);
        m1.setCode("MIS-100");
        m1.setTitle("Live Mission");
        m1.setStatus(MissionStatus.IN_PROGRESS);
        m1.setUav(u1);
        m1.setLatitude(new BigDecimal("21.10"));
        m1.setLongitude(new BigDecimal("105.90"));
        m1.setLocationName("North Field");
        m1.setStartTime(LocalDateTime.of(2026, 5, 1, 9, 0));

        Mission m2 = new Mission();
        m2.setId(101L);
        m2.setCode("MIS-101");
        m2.setTitle("Assigned Mission");
        m2.setStatus(MissionStatus.READY);
        m2.setUav(u2);
        m2.setLatitude(new BigDecimal("20.95"));
        m2.setLongitude(new BigDecimal("105.75"));

        TelemetryResponse freshFix =
                new TelemetryResponse(
                        10L,
                        100L,
                        LocalDateTime.now().minusSeconds(10),
                        21.1234,
                        105.9876,
                        55.0,
                        10.0,
                        90.0,
                        80,
                        "FIXED",
                        19,
                        10,
                        false);
        TelemetryResponse staleFix =
                new TelemetryResponse(
                        20L,
                        101L,
                        LocalDateTime.now().minusMinutes(10),
                        19.0,
                        104.0,
                        50.0,
                        0.0,
                        0.0,
                        70,
                        "FLOAT",
                        12,
                        600,
                        true);

        when(uavs.findAll()).thenReturn(List.of(u2, u1, u3));
        when(telemetry.latestForFleet()).thenReturn(List.of(freshFix, staleFix));
        when(missions.findAll(any(HibernateSpecification.class))).thenReturn(List.of(m1, m2));
        when(stations.findAll()).thenReturn(List.of(s2, s1));

        FleetMapResponse resp = service.fleetMap();
        assertNotNull(resp.generatedAt());
        assertEquals(3, resp.uavs().size());

        // Sorted by id: 5, 10, 20
        UavPin pin5 = resp.uavs().get(0);
        assertEquals(5L, pin5.id());
        assertEquals("NONE", pin5.positionSource());
        assertNull(pin5.latitude());

        UavPin pin10 = resp.uavs().get(1);
        assertEquals(10L, pin10.id());
        assertEquals("TELEMETRY", pin10.positionSource());
        assertEquals(21.1234, pin10.latitude());
        assertEquals(105.9876, pin10.longitude());
        assertEquals("MIS-100", pin10.activeMission().code());

        UavPin pin20 = resp.uavs().get(2);
        assertEquals(20L, pin20.id());
        assertEquals("MISSION", pin20.positionSource());
        assertEquals(20.95, pin20.latitude());

        // Stations sorted by id: 1, 2
        assertEquals(2, resp.stations().size());
        StationPin sp1 = resp.stations().get(0);
        assertEquals(1L, sp1.id());
        assertEquals("ACTIVE", sp1.status());
        assertEquals(2L, sp1.uavCount());

        StationPin sp2 = resp.stations().get(1);
        assertEquals(2L, sp2.id());
        assertNull(sp2.status());
        assertEquals(0L, sp2.uavCount());

        // Also exercise the HibernateSpecification lambda passed to missions.findAll
        ArgumentCaptor<HibernateSpecification<Mission>> specCaptor =
                ArgumentCaptor.forClass(HibernateSpecification.class);
        verify(missions).findAll(specCaptor.capture());
        Root<Mission> root = mock(Root.class);
        CriteriaQuery<?> query = mock(CriteriaQuery.class);
        CriteriaBuilder cb = mock(CriteriaBuilder.class);
        Path<Object> uavPath = mock(Path.class);
        Path<Object> statusPath = mock(Path.class);
        Predicate p1 = mock(Predicate.class);
        Predicate p2 = mock(Predicate.class);
        Predicate combined = mock(Predicate.class);
        when(root.get("uav")).thenReturn(uavPath);
        when(root.get("status")).thenReturn(statusPath);
        when(cb.isNotNull(uavPath)).thenReturn(p1);
        when(statusPath.in(FleetMapServiceImpl.HOLDING)).thenReturn(p2);
        when(cb.and(p1, p2)).thenReturn(combined);
        assertSame(combined, specCaptor.getValue().toPredicate(root, query, cb));
    }

    @Test
    void activeMissionByUavAndWithTelemetryHandleEdgeCases() {
        Uav u = new Uav();
        u.setId(7L);

        Mission noUav = new Mission();
        noUav.setStatus(MissionStatus.IN_PROGRESS);

        Mission later = new Mission();
        later.setId(1L);
        later.setUav(u);
        later.setStatus(MissionStatus.READY);
        later.setStartTime(LocalDateTime.of(2026, 5, 2, 10, 0));

        Mission earlier = new Mission();
        earlier.setId(2L);
        earlier.setUav(u);
        earlier.setStatus(MissionStatus.READY);
        earlier.setStartTime(LocalDateTime.of(2026, 5, 1, 10, 0));

        Mission inProgress = new Mission();
        inProgress.setId(3L);
        inProgress.setUav(u);
        inProgress.setStatus(MissionStatus.IN_PROGRESS);

        Map<Long, Mission> map =
                FleetMapServiceImpl.activeMissionByUav(List.of(noUav, later, earlier, inProgress));
        assertEquals(3L, map.get(7L).getId());

        Station st = new Station();
        st.setId(9L);
        st.setName("Base");
        st.setLatitude(10.7);
        st.setLongitude(106.6);
        u.setStation(st);
        u.setStatus(UavStatus.AVAILABLE);

        UavPin stationPin = FleetMapServiceImpl.pin(u, null);
        assertEquals("STATION", stationPin.positionSource());
        assertSame(stationPin, FleetMapServiceImpl.withTelemetry(stationPin, null));
    }
}
