package com.uav.platform.service.impl.maintenance;

import com.uav.platform.entity.maintenance.*;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Internal service implementation rules; persistence entities contain data only. */
public final class RepairMaterialOperations {
    private RepairMaterialOperations() {}

    public static BigDecimal lineTotal(RepairMaterial value) {
        return value.getQuantity().multiply(value.getUnitPrice()).setScale(0, RoundingMode.HALF_UP);
    }
}
