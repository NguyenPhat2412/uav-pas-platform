package com.uav.platform.dto.response.project;

import com.uav.platform.enums.project.ProjectStatus;

import java.time.LocalDateTime;

public record ProjectResponse(
        Long id,
        String code,
        String name,
        String province,
        String areaGeoJson,
        String note,
        ProjectStatus status,
        long activeSubscriptionCount,
        long missionCount,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {}
