package com.uav.platform.modules.mission.dto.request;

import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.mission.enums.MissionPriority;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record MissionUpdateRequest(
        @NotNull @Min(0) Long expectedVersion,
        @NotBlank String title,
        String description,
        @NotNull @FutureOrPresent LocalDate requestedDate,
        @NotNull LocalDateTime startTime,
        @NotNull LocalDateTime expectedEndTime,
        @NotBlank String locationName,
        BigDecimal latitude,
        BigDecimal longitude,
        MissionPriority priority,
        @Size(max = 2000) String notes,
        @jakarta.validation.Valid FlightPlanRequest flightPlan) {

    public MissionUpdateRequest(
            Long expectedVersion, String title, String description, LocalDate requestedDate, LocalDateTime startTime,
            LocalDateTime expectedEndTime, String locationName, BigDecimal latitude, BigDecimal longitude,
            MissionPriority priority, String notes) {
        this(expectedVersion, title, description, requestedDate, startTime, expectedEndTime, locationName, latitude,
                longitude, priority, notes, null);
    }
}
