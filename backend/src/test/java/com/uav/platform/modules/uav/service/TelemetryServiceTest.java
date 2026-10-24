package com.uav.platform.modules.uav.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.uav.dto.request.TelemetryReportRequest;
import com.uav.platform.modules.uav.dto.response.TelemetryResponse;
import com.uav.platform.modules.uav.entity.Uav;
import com.uav.platform.modules.uav.entity.UavTelemetry;
import com.uav.platform.modules.uav.repository.UavRepository;
import com.uav.platform.modules.uav.repository.UavTelemetryRepository;
import com.uav.platform.modules.uav.service.impl.TelemetryServiceImpl;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@ExtendWith(MockitoExtension.class)
class TelemetryServiceTest {
    @Mock UavTelemetryRepository telemetry;
    @Mock UavRepository uavs;
    @Mock MissionRepository missions;
    @InjectMocks TelemetryServiceImpl service;

    private static TelemetryReportRequest sample(LocalDateTime at, Long missionId) {
        return new TelemetryReportRequest(
                at, 21.0285, 105.8542, 80.0, 12.5, 270.0, 76, "FIXED", 18, missionId);
    }

    @Test
    void ingestStoresSampleAndReportsFresh() {
        when(uavs.existsById(1L)).thenReturn(true);
        when(telemetry.save(any())).thenAnswer(i -> i.getArgument(0));
        TelemetryResponse r =
                service.ingest(1L, sample(LocalDateTime.now().minusSeconds(5), null), "gcs-01");
        assertEquals(21.0285, r.latitude(), 1e-7);
        assertEquals("FIXED", r.rtkStatus());
        assertFalse(r.stale());
        verify(telemetry)
                .save(
                        argThat(
                                t ->
                                        "gcs-01".equals(t.getReportedBy())
                                                && t.getReceivedAt() != null));
    }

    @Test
    void ingestRejectsFutureTimestampAndForeignMission() {
        when(uavs.existsById(1L)).thenReturn(true);
        assertThrows(
                SystemException.class,
                () -> service.ingest(1L, sample(LocalDateTime.now().plusMinutes(10), null), "gcs"));
        Uav other = new Uav("M", "SN-2", "A");
        other.setId(2L);
        Mission mission = mock(Mission.class);
        when(mission.getUav()).thenReturn(other);
        when(missions.findById(9L)).thenReturn(Optional.of(mission));
        assertThrows(
                SystemException.class,
                () -> service.ingest(1L, sample(LocalDateTime.now(), 9L), "gcs"));
        verify(telemetry, never()).save(any());
    }

    @Test
    void oldSampleIsStale() {
        UavTelemetry t = new UavTelemetry();
        t.setUavId(3L);
        t.setRecordedAt(LocalDateTime.now().minusMinutes(5));
        t.setLatitude(new BigDecimal("10.0000000"));
        t.setLongitude(new BigDecimal("106.0000000"));
        when(telemetry.latestPerUav()).thenReturn(List.of(t));
        TelemetryResponse r = service.latestForFleet().get(0);
        assertTrue(r.stale());
        assertTrue(r.ageSeconds() >= 300);
    }
}
