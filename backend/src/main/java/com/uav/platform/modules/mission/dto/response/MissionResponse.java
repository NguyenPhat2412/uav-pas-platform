package com.uav.platform.modules.mission.dto.response;

import com.uav.platform.modules.mission.enums.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record MissionResponse(
        Long id,
        String code,
        Long customerId,
        String customerName,
        Long serviceId,
        MissionType missionType,
        String title,
        String description,
        LocalDate requestedDate,
        LocalDateTime startTime,
        LocalDateTime expectedEndTime,
        String locationName,
        BigDecimal latitude,
        BigDecimal longitude,
        Long stationId,
        Long uavId,
        Long operatorId,
        MissionPriority priority,
        MissionStatus status,
        String notes,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        String completionNote,
        String equipmentCondition,
        String failureReason,
        String failureNotes,
        boolean operatorAccepted,
        String operatorConflictNote,
        long version,
        String billingStatus) {}
