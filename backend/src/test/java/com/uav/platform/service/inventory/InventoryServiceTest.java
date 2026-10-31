package com.uav.platform.service.inventory;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

import com.uav.platform.dto.request.inventory.QuantityRequest;
import com.uav.platform.entity.inventory.Equipment;
import com.uav.platform.enums.audit.*;
import com.uav.platform.enums.inventory.*;
import com.uav.platform.enums.inventory.EquipmentType;
import com.uav.platform.enums.media.*;
import com.uav.platform.enums.mission.*;
import com.uav.platform.enums.station.*;
import com.uav.platform.enums.uav.*;
import com.uav.platform.repository.inventory.EquipmentRepository;
import com.uav.platform.repository.inventory.InventoryMovementRepository;
import com.uav.platform.repository.station.StationRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.impl.inventory.EquipmentOperations;
import com.uav.platform.service.impl.inventory.InventoryServiceImpl;
import com.uav.platform.service.impl.station.StationOperations;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class InventoryServiceTest {
    @Mock EquipmentRepository equipment;
    @Mock InventoryMovementRepository movements;
    @Mock StationRepository stations;
    @Mock AuditLogService audit;

    @org.mockito.Spy
    com.uav.platform.mapper.inventory.EquipmentMapper equipmentMapper =
            org.mapstruct.factory.Mappers.getMapper(
                    com.uav.platform.mapper.inventory.EquipmentMapper.class);

    @org.mockito.Spy
    com.uav.platform.mapper.inventory.InventoryMovementMapper movementMapper =
            org.mapstruct.factory.Mappers.getMapper(
                    com.uav.platform.mapper.inventory.InventoryMovementMapper.class);

    @InjectMocks InventoryServiceImpl service;

    @Test
    void stockReserveAndReleaseKeepQuantitiesConsistent() {
        Equipment item = new Equipment("Battery", EquipmentType.BATTERY, "BAT-01", null);
        item.setId(1L);
        EquipmentOperations.stockIn(item, 10);
        when(equipment.findByIdForUpdate(1L)).thenReturn(java.util.Optional.of(item));
        assertEquals(
                7, service.reserve(1L, new QuantityRequest(3, null), "admin").availableQuantity());
        assertEquals(3, item.getReservedQuantity());
        assertEquals(
                10, service.release(1L, new QuantityRequest(3, null), "admin").availableQuantity());
        verify(movements, times(2)).save(any());
    }

    @Test
    void repeatedRequestIdDoesNotApplyMovementTwice() {
        Equipment item = new Equipment("Battery", EquipmentType.BATTERY, "BAT-02", null);
        item.setId(2L);
        EquipmentOperations.stockIn(item, 10);
        when(equipment.findByIdForUpdate(2L)).thenReturn(java.util.Optional.of(item));
        when(movements.findByRequestId("reserve-1"))
                .thenReturn(
                        java.util.Optional.empty(),
                        java.util.Optional.of(
                                new com.uav.platform.entity.inventory.InventoryMovement(
                                        item,
                                        com.uav.platform.enums.inventory.MovementType.RESERVE,
                                        3,
                                        null,
                                        null,
                                        "admin",
                                        "",
                                        "reserve-1")));
        service.reserve(2L, new QuantityRequest(3, "", "reserve-1"), "admin");
        service.reserve(2L, new QuantityRequest(3, "", "reserve-1"), "admin");
        assertEquals(7, item.getAvailableQuantity());
        verify(movements, times(1)).save(any());
    }

    @Test
    void partialTransferCreatesDestinationBalance() {
        var from = StationOperations.create("A", "A", null, null, null, null);
        from.setId(1L);
        var to = StationOperations.create("B", "B", null, null, null, null);
        to.setId(2L);
        Equipment item = new Equipment("Battery", EquipmentType.BATTERY, null, from);
        item.setId(3L);
        EquipmentOperations.stockIn(item, 10);
        when(equipment.findByIdForUpdate(3L)).thenReturn(java.util.Optional.of(item));
        when(stations.findById(2L)).thenReturn(java.util.Optional.of(to));
        service.transfer(3L, 2L, new QuantityRequest(4, "partial", "transfer-1"), "admin");
        assertEquals(6, item.getQuantity());
        assertEquals(6, item.getAvailableQuantity());
        verify(equipment)
                .save(
                        argThat(
                                destination ->
                                        destination.getStation().getId().equals(2L)
                                                && destination.getQuantity() == 4));
    }
}
