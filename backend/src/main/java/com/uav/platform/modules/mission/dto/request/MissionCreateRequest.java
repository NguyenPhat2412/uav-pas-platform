package com.uav.platform.modules.mission.dto.request;

import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.mission.enums.MissionPriority;
import com.uav.platform.modules.mission.enums.MissionType;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record MissionCreateRequest(
        @NotNull MissionType missionType,
        @NotBlank String title,
        String description,
        @NotNull @FutureOrPresent LocalDate requestedDate,
        @NotNull LocalDateTime startTime,
        @NotNull LocalDateTime expectedEndTime,
        @NotBlank String locationName,
        BigDecimal latitude,
        BigDecimal longitude,
        Long serviceId,
        MissionPriority priority,
        @Size(max = 2000) String notes,
        @jakarta.validation.Valid FlightPlanRequest flightPlan) {

    public MissionCreateRequest(
            MissionType missionType,
            String title,
            String description,
            LocalDate requestedDate,
            LocalDateTime startTime,
            LocalDateTime expectedEndTime,
            String locationName,
            BigDecimal latitude,
            BigDecimal longitude,
            Long serviceId,
            MissionPriority priority,
            String notes) {
        this(
                missionType,
                title,
                description,
                requestedDate,
                startTime,
                expectedEndTime,
                locationName,
                latitude,
                longitude,
                serviceId,
                priority,
                notes,
                null);
    }
}
