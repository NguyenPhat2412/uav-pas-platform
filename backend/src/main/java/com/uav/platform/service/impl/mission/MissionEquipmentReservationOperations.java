package com.uav.platform.service.impl.mission;

import com.uav.platform.entity.inventory.Equipment;
import com.uav.platform.entity.mission.*;
import com.uav.platform.enums.mission.*;

import java.time.LocalDateTime;

/** Internal service implementation rules; persistence entities contain data only. */
public final class MissionEquipmentReservationOperations {
    private MissionEquipmentReservationOperations() {}

    public static MissionEquipmentReservation create(
            Mission mission, Equipment equipment, int quantity, String reservedBy) {
        MissionEquipmentReservation value = new MissionEquipmentReservation();

        if (quantity <= 0) throw new IllegalArgumentException("Quantity must be positive");
        value.setMission(mission);
        value.setEquipment(equipment);
        value.setQuantity(quantity);
        value.setReservedBy(reservedBy);

        return value;
    }

    public static void release(MissionEquipmentReservation value) {
        value.setReleased(true);
        value.setReleasedAt(LocalDateTime.now());
    }
}
