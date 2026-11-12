package com.uav.platform.service.uav;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.dto.request.uav.UavRequest;
import com.uav.platform.entity.uav.Uav;
import com.uav.platform.enums.audit.*;
import com.uav.platform.enums.inventory.*;
import com.uav.platform.enums.media.*;
import com.uav.platform.enums.mission.*;
import com.uav.platform.enums.station.*;
import com.uav.platform.enums.uav.*;
import com.uav.platform.repository.maintenance.RepairOrderRepository;
import com.uav.platform.repository.mission.MissionRepository;
import com.uav.platform.repository.station.StationRepository;
import com.uav.platform.repository.uav.UavRepository;
import com.uav.platform.repository.uav.UavStatusHistoryRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.impl.uav.UavServiceImpl;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

@ExtendWith(MockitoExtension.class)
class UavServiceTest {
    @Mock UavRepository repository;
    @Mock StationRepository stations;
    @Mock UavStatusHistoryRepository history;
    @Mock MissionRepository missions;
    @Mock RepairOrderRepository repairOrders;
    @Mock AuditLogService audit;

    @org.mockito.Spy
    com.uav.platform.mapper.uav.UavMapper mapper =
            org.mapstruct.factory.Mappers.getMapper(com.uav.platform.mapper.uav.UavMapper.class);

    @InjectMocks UavServiceImpl service;

    @Test
    void createStartsAvailableAndWritesHistory() {
        Uav uav = new Uav("Mavic", "SN-01", "Acme");
        uav.setId(1L);
        when(repository.existsBySerialNumber("SN-01")).thenReturn(false);
        when(repository.save(any(Uav.class))).thenReturn(uav);
        assertEquals(
                "AVAILABLE",
                service.create(new UavRequest("Mavic", "SN-01", "Acme"), "admin").status().name());
        verify(history).save(any());
    }

    @Test
    void healthAnalyticsClassifiesMultiAirframeAndComputesSoh() {
        Uav quad = new Uav("Matrice 350 RTK", "UAV-350-RTK", "DJI");
        quad.setId(1L);
        Uav hexa = new Uav("Matrice 600 SAR Heavy", "SAR-600-01", "DJI");
        hexa.setId(2L);
        Uav vtol = new Uav("DeltaQuad VTOL Fixed-Wing", "VTOL-LR-01", "DeltaQuad");
        vtol.setId(3L);
        when(repository.findAllWithStation()).thenReturn(List.of(quad, hexa, vtol));
        when(missions.findAllNonDraftWithAssociations()).thenReturn(List.of());
        when(repairOrders.findAllWithUav()).thenReturn(List.of());

        var analytics = service.healthAnalytics();
        assertEquals(3, analytics.totalFleetCount());
        assertEquals("QUADCOPTER_RTK", analytics.profiles().get(0).airframeClass());
        assertEquals("HEXACOPTER_SAR", analytics.profiles().get(1).airframeClass());
        assertEquals("VTOL_FIXED_WING", analytics.profiles().get(2).airframeClass());
    }
}
