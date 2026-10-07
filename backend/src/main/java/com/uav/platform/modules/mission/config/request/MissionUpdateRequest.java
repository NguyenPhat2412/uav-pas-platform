package com.uav.platform.modules.mission.config.request;


import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.mission.common.MissionPriority;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record MissionUpdateRequest(
        @NotBlank String title,
        String description,
        @NotNull @FutureOrPresent LocalDate requestedDate,
        @NotNull LocalDateTime startTime,
        @NotNull LocalDateTime expectedEndTime,
        @NotBlank String locationName,
        BigDecimal latitude,
        BigDecimal longitude,
        MissionPriority priority,
        String notes
) {}
