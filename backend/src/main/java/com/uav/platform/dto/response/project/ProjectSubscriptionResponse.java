package com.uav.platform.dto.response.project;

import com.uav.platform.enums.marketplace.PricingModel;
import com.uav.platform.enums.project.ProjectSubscriptionStatus;
import com.uav.platform.enums.project.SubscriptionScheduleType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record ProjectSubscriptionResponse(
        Long id,
        Long projectId,
        String projectName,
        Long listingId,
        String listingSlug,
        String listingTitle,
        PricingModel pricingModel,
        String areaGeoJson,
        SubscriptionScheduleType scheduleType,
        ProjectSubscriptionStatus status,
        LocalDate startDate,
        LocalDate nextRunDate,
        LocalDateTime nextRunAt,
        BigDecimal units,
        BigDecimal unitPriceVnd,
        BigDecimal estimatedTotalVnd,
        String note,
        Long firstMissionId,
        String firstMissionCode,
        Long latestMissionId,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {}
