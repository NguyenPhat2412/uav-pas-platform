package com.uav.platform.modules.maintenance.service.impl;

import com.uav.platform.modules.maintenance.entity.*;
import com.uav.platform.modules.maintenance.enums.RepairStatus;
import com.uav.platform.modules.uav.entity.Uav;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** Internal service implementation rules; persistence entities contain data only. */
public final class RepairOrderOperations {
    private RepairOrderOperations() {}

    public static RepairOrder create(
            Uav uav,
            MaintenanceSchedule schedule,
            String title,
            String description,
            LocalDate plannedDate,
            String technicianName) {
        RepairOrder value = new RepairOrder();

        value.setUav(uav);
        value.setSchedule(schedule);
        update(value, title, description, plannedDate, technicianName);

        return value;
    }

    public static void update(
            RepairOrder value,
            String title,
            String description,
            LocalDate plannedDate,
            String technicianName) {
        value.setTitle(title);
        value.setDescription(description);
        value.setPlannedDate(plannedDate);
        value.setTechnicianName(technicianName);
        touch(value);
    }

    public static void replaceMaterials(RepairOrder value, List<RepairMaterial> items) {
        value.getMaterials().clear();
        value.getMaterials().addAll(items);
        touch(value);
    }

    public static void start(RepairOrder value, LocalDateTime now) {
        value.setStatus(RepairStatus.IN_PROGRESS);
        value.setStartedAt(now);
        touch(value);
    }

    public static void complete(RepairOrder value, LocalDateTime now, String notes) {
        value.setStatus(RepairStatus.COMPLETED);
        value.setCompletedAt(now);
        value.setInspectionNotes(notes);
        touch(value);
    }

    public static void cancel(RepairOrder value, LocalDateTime now, String reason) {
        value.setStatus(RepairStatus.CANCELLED);
        value.setCancelledAt(now);
        value.setCancelReason(reason);
        touch(value);
    }

    public static BigDecimal totalMaterialCost(RepairOrder value) {
        return value.getMaterials().stream()
                .map(RepairMaterialOperations::lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static void touch(RepairOrder value) {
        value.setUpdatedAt(LocalDateTime.now());
    }
}
