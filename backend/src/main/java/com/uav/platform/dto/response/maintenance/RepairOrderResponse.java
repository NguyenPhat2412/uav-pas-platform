package com.uav.platform.dto.response.maintenance;

import com.uav.platform.enums.maintenance.RepairStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@io.swagger.v3.oas.annotations.media.Schema(name = "Order")
public record RepairOrderResponse(
        Long id,
        Long uavId,
        String uavSerialNumber,
        Long scheduleId,
        String title,
        String description,
        LocalDate plannedDate,
        String technicianName,
        RepairStatus status,
        long version,
        LocalDateTime createdAt,
        LocalDateTime startedAt,
        LocalDateTime completedAt,
        LocalDateTime cancelledAt,
        String inspectionNotes,
        String cancelReason,
        List<RepairMaterialResponse> materials,
        String totalMaterialCost,
        String currency) {}
