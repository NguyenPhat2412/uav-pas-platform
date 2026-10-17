package com.uav.platform.modules.uav.service.impl;

import com.uav.platform.modules.uav.entity.*;
import com.uav.platform.modules.uav.enums.*;

import java.time.LocalDateTime;

/** Internal service implementation rules; persistence entities contain data only. */
public final class UavOperations {
    private UavOperations() {}

    public static void update(Uav value, String model, String manufacturer) {
        value.setModel(model);
        value.setManufacturer(manufacturer);
    }

    public static void markMaintenance(Uav value) {
        value.setStatus(UavStatus.MAINTENANCE);
        value.setLastMaintenanceAt(LocalDateTime.now());
    }
}
