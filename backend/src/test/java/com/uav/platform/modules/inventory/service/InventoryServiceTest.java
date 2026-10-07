package com.uav.platform.modules.inventory.service;

import com.uav.platform.modules.user.common.*;
import com.uav.platform.modules.uav.common.*;
import com.uav.platform.modules.station.common.*;
import com.uav.platform.modules.inventory.common.*;
import com.uav.platform.modules.media.common.*;
import com.uav.platform.modules.audit.common.*;
import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.inventory.common.*;

import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.inventory.config.request.QuantityRequest;
import com.uav.platform.modules.inventory.entity.Equipment;
import com.uav.platform.modules.inventory.common.EquipmentType;
import com.uav.platform.modules.inventory.repository.EquipmentRepository;
import com.uav.platform.modules.inventory.repository.InventoryMovementRepository;
import com.uav.platform.modules.inventory.service.impl.IInventoryService;
import com.uav.platform.modules.station.repository.StationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InventoryServiceTest {
    @Mock EquipmentRepository equipment;
    @Mock InventoryMovementRepository movements;
    @Mock StationRepository stations;
    @Mock AuditLogService audit;
    @InjectMocks IInventoryService service;

    @Test
    void stockReserveAndReleaseKeepQuantitiesConsistent() {
        Equipment item = new Equipment("Battery", EquipmentType.BATTERY, "BAT-01", null);
        item.setId(1L); item.stockIn(10);
        when(equipment.findByIdForUpdate(1L)).thenReturn(java.util.Optional.of(item));
        assertEquals(7, service.reserve(1L, new QuantityRequest(3, null), "admin").availableQuantity());
        assertEquals(3, item.getReservedQuantity());
        assertEquals(10, service.release(1L, new QuantityRequest(3, null), "admin").availableQuantity());
        verify(movements, times(2)).save(any());
    }

    @Test
    void repeatedRequestIdDoesNotApplyMovementTwice() {
        Equipment item = new Equipment("Battery", EquipmentType.BATTERY, "BAT-02", null);
        item.setId(2L); item.stockIn(10);
        when(equipment.findByIdForUpdate(2L)).thenReturn(java.util.Optional.of(item));
        when(movements.findByRequestId("reserve-1")).thenReturn(java.util.Optional.empty(), java.util.Optional.of(new com.uav.platform.modules.inventory.entity.InventoryMovement(item, com.uav.platform.modules.inventory.common.MovementType.RESERVE, 3, null, null, "admin", "", "reserve-1")));
        service.reserve(2L, new QuantityRequest(3, "", "reserve-1"), "admin");
        service.reserve(2L, new QuantityRequest(3, "", "reserve-1"), "admin");
        assertEquals(7, item.getAvailableQuantity());
        verify(movements, times(1)).save(any());
    }

    @Test
    void partialTransferCreatesDestinationBalance() {
        var from = new com.uav.platform.modules.station.entity.Station("A", "A", null, null, null, null); from.setId(1L);
        var to = new com.uav.platform.modules.station.entity.Station("B", "B", null, null, null, null); to.setId(2L);
        Equipment item = new Equipment("Battery", EquipmentType.BATTERY, null, from); item.setId(3L); item.stockIn(10);
        when(equipment.findByIdForUpdate(3L)).thenReturn(java.util.Optional.of(item));
        when(stations.findById(2L)).thenReturn(java.util.Optional.of(to));
        service.transfer(3L, 2L, new QuantityRequest(4, "partial", "transfer-1"), "admin");
        assertEquals(6, item.getQuantity());
        assertEquals(6, item.getAvailableQuantity());
        verify(equipment).save(argThat(destination -> destination.getStation().getId().equals(2L) && destination.getQuantity() == 4));
    }
}
