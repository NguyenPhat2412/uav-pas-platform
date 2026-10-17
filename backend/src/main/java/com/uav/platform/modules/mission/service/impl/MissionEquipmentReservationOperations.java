package com.uav.platform.modules.mission.service.impl;

import com.uav.platform.modules.inventory.entity.Equipment;
import com.uav.platform.modules.mission.entity.*;
import com.uav.platform.modules.mission.enums.*;

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
