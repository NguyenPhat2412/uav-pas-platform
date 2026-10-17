package com.uav.platform.modules.maintenance.mapper;

import com.uav.platform.modules.maintenance.dto.response.*;
import com.uav.platform.modules.maintenance.entity.MaintenanceSchedule;
import com.uav.platform.modules.maintenance.entity.RepairOrder;

import java.time.LocalDate;

public final class MaintenanceMapper {
    private MaintenanceMapper() {}

    public static MaintenanceScheduleResponse toScheduleResponse(
            MaintenanceSchedule s, LocalDate today) {
        return new MaintenanceScheduleResponse(
                s.getId(),
                s.getUav().getId(),
                s.getUav().getSerialNumber(),
                s.getTitle(),
                s.getIntervalDays(),
                s.getNextDueDate(),
                s.getLastCompletedDate(),
                s.isActive(),
                s.getVersion(),
                s.dueStatus(today));
    }

    public static RepairOrderResponse toOrderResponse(RepairOrder o) {
        return new RepairOrderResponse(
                o.getId(),
                o.getUav().getId(),
                o.getUav().getSerialNumber(),
                o.getSchedule() == null ? null : o.getSchedule().getId(),
                o.getTitle(),
                o.getDescription(),
                o.getPlannedDate(),
                o.getTechnicianName(),
                o.getStatus(),
                o.getVersion(),
                o.getCreatedAt(),
                o.getStartedAt(),
                o.getCompletedAt(),
                o.getCancelledAt(),
                o.getInspectionNotes(),
                o.getCancelReason(),
                o.getMaterials().stream()
                        .map(
                                m ->
                                        new RepairMaterialResponse(
                                                m.getId(),
                                                m.getName(),
                                                m.getUnit(),
                                                m.getQuantity()
                                                        .stripTrailingZeros()
                                                        .toPlainString(),
                                                m.getUnitPrice().toPlainString(),
                                                m.lineTotal().toPlainString()))
                        .toList(),
                o.totalMaterialCost().toPlainString(),
                "VND");
    }
}
