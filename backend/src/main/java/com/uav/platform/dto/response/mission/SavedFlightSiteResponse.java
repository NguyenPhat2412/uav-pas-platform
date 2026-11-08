package com.uav.platform.dto.response.mission;

import com.uav.platform.enums.mission.MissionType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record SavedFlightSiteResponse(
        Long id,
        String name,
        String locationName,
        BigDecimal latitude,
        BigDecimal longitude,
        MissionType defaultMissionType,
        FlightPlanResponse flightPlan,
        String notes,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {}
