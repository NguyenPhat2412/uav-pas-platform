package com.uav.platform.modules.maintenance.config.response;

import com.uav.platform.modules.maintenance.entity.MaintenanceSchedule;
import com.uav.platform.modules.maintenance.entity.RepairOrder;
import com.uav.platform.modules.maintenance.common.RepairStatus;
import com.uav.platform.modules.maintenance.common.DueStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public final class MaintenanceResponses {
    private MaintenanceResponses() { }
    public record Schedule(Long id, Long uavId, String uavSerialNumber, String title, int intervalDays,
            LocalDate nextDueDate, LocalDate lastCompletedDate, boolean active, long version, DueStatus dueStatus) { }
    public record Material(Long id, String name, String unit, String quantity, String unitPrice, String lineTotal) { }
    public record Order(Long id, Long uavId, String uavSerialNumber, Long scheduleId, String title,
            String description, LocalDate plannedDate, String technicianName, RepairStatus status, long version,
            LocalDateTime createdAt, LocalDateTime startedAt, LocalDateTime completedAt, LocalDateTime cancelledAt,
            String inspectionNotes, String cancelReason, List<Material> materials, String totalMaterialCost, String currency) { }
    public static Schedule schedule(MaintenanceSchedule s, LocalDate today) {
        return new Schedule(s.getId(), s.getUav().getId(), s.getUav().getSerialNumber(), s.getTitle(), s.getIntervalDays(),
                s.getNextDueDate(), s.getLastCompletedDate(), s.isActive(), s.getVersion(), s.dueStatus(today));
    }
    public static Order order(RepairOrder o) {
        return new Order(o.getId(), o.getUav().getId(), o.getUav().getSerialNumber(),
                o.getSchedule() == null ? null : o.getSchedule().getId(), o.getTitle(), o.getDescription(),
                o.getPlannedDate(), o.getTechnicianName(), o.getStatus(), o.getVersion(), o.getCreatedAt(),
                o.getStartedAt(), o.getCompletedAt(), o.getCancelledAt(), o.getInspectionNotes(), o.getCancelReason(),
                o.getMaterials().stream().map(m -> new Material(m.getId(), m.getName(), m.getUnit(),
                        m.getQuantity().stripTrailingZeros().toPlainString(), m.getUnitPrice().toPlainString(), m.lineTotal().toPlainString())).toList(),
                o.totalMaterialCost().toPlainString(), "VND");
    }
}
