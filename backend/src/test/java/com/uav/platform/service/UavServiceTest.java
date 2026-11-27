package com.uav.platform.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.dao.IMissionDao;
import com.uav.platform.dao.IRepairOrderDao;
import com.uav.platform.dao.IStationDao;
import com.uav.platform.dao.IUavDao;
import com.uav.platform.dao.IUavStatusHistoryDao;
import com.uav.platform.dto.request.UavRequest;
import com.uav.platform.entity.Uav;
import com.uav.platform.enums.*;
import com.uav.platform.service.impl.UavServiceImpl;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

@ExtendWith(MockitoExtension.class)
class UavServiceTest {
    @Mock IUavDao repository;
    @Mock IStationDao stations;
    @Mock IUavStatusHistoryDao history;
    @Mock IMissionDao missions;
    @Mock IRepairOrderDao repairOrders;
    @Mock AuditLogService audit;

    @org.mockito.Spy
    com.uav.platform.mapper.UavMapper mapper =
            org.mapstruct.factory.Mappers.getMapper(com.uav.platform.mapper.UavMapper.class);

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
