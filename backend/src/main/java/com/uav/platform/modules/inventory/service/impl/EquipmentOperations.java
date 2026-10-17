package com.uav.platform.modules.inventory.service.impl;

import com.uav.platform.modules.inventory.entity.*;
import com.uav.platform.modules.inventory.enums.*;
import com.uav.platform.modules.station.entity.Station;

/** Internal service implementation rules; persistence entities contain data only. */
public final class EquipmentOperations {
    private EquipmentOperations() {}

    public static void update(Equipment value, String name, EquipmentType type, Station station) {
        value.setName(name);
        value.setType(type);
        value.setStation(station);
    }

    public static void stockIn(Equipment value, int amount) {
        requirePositive(amount);
        value.setQuantity(value.getQuantity() + amount);
        value.setAvailableQuantity(value.getAvailableQuantity() + amount);
    }

    public static void stockOut(Equipment value, int amount) {
        requirePositive(amount);
        if (value.getAvailableQuantity() < amount)
            throw new IllegalStateException("Insufficient available equipment");
        value.setQuantity(value.getQuantity() - amount);
        value.setAvailableQuantity(value.getAvailableQuantity() - amount);
    }

    public static void reserve(Equipment value, int amount) {
        requirePositive(amount);
        if (value.getAvailableQuantity() < amount)
            throw new IllegalStateException("Insufficient available equipment");
        value.setAvailableQuantity(value.getAvailableQuantity() - amount);
        value.setReservedQuantity(value.getReservedQuantity() + amount);
    }

    public static void release(Equipment value, int amount) {
        requirePositive(amount);
        if (value.getReservedQuantity() < amount)
            throw new IllegalStateException("Insufficient reserved equipment");
        value.setReservedQuantity(value.getReservedQuantity() - amount);
        value.setAvailableQuantity(value.getAvailableQuantity() + amount);
    }

    public static void transferOut(Equipment value, int amount) {
        stockOut(value, amount);
    }

    private static void requirePositive(int amount) {
        if (amount <= 0) throw new IllegalArgumentException("Quantity must be positive");
    }
}
