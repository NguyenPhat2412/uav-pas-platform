package com.uav.platform.dto.response.maintenance;

import com.uav.platform.enums.maintenance.DueStatus;

import java.time.LocalDate;

@io.swagger.v3.oas.annotations.media.Schema(name = "Schedule")
public record MaintenanceScheduleResponse(
        Long id,
        Long uavId,
        String uavSerialNumber,
        String title,
        int intervalDays,
        LocalDate nextDueDate,
        LocalDate lastCompletedDate,
        boolean active,
        long version,
        DueStatus dueStatus) {}
