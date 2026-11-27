package com.uav.platform.mapper;

import com.uav.platform.dto.response.ProjectResponse;
import com.uav.platform.dto.response.ProjectSubscriptionResponse;
import com.uav.platform.entity.Mission;
import com.uav.platform.entity.Project;
import com.uav.platform.entity.ProjectSubscription;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Component
public class ProjectMapper {

    public ProjectResponse toProjectResponse(
            Project project, long activeSubscriptionCount, long missionCount) {
        var customer = project.getCustomer();
        return new ProjectResponse(
                project.getId(),
                project.getCode(),
                project.getName(),
                project.getProvince(),
                project.getAreaGeoJson(),
                project.getNote(),
                project.getStatus(),
                customer != null ? customer.getId() : null,
                customer != null ? customer.getUsername() : null,
                customer != null ? customer.getFullName() : null,
                activeSubscriptionCount,
                missionCount,
                project.getCreatedAt(),
                project.getUpdatedAt());
    }

    public ProjectSubscriptionResponse toSubscriptionResponse(
            ProjectSubscription sub, Mission firstMission, Mission latestMission) {
        var project = sub.getProject();
        var listing = sub.getListing();
        BigDecimal unitPrice =
                listing != null && listing.getBasePriceVnd() != null
                        ? listing.getBasePriceVnd()
                        : BigDecimal.ZERO;
        BigDecimal units = sub.getUnits() != null ? sub.getUnits() : BigDecimal.ONE;
        BigDecimal estimatedTotal = unitPrice.multiply(units).setScale(0, RoundingMode.HALF_UP);
        LocalDateTime nextRunAt =
                sub.getNextRunDate() != null ? sub.getNextRunDate().atTime(8, 30) : null;

        return new ProjectSubscriptionResponse(
                sub.getId(),
                project != null ? project.getId() : null,
                project != null ? project.getName() : null,
                listing != null ? listing.getId() : null,
                listing != null ? listing.getSlug() : null,
                listing != null ? listing.getTitle() : null,
                listing != null ? listing.getPricingModel() : null,
                sub.getAreaGeoJson(),
                sub.getScheduleType(),
                sub.getStatus(),
                sub.getStartDate(),
                sub.getNextRunDate(),
                nextRunAt,
                units,
                unitPrice,
                estimatedTotal,
                sub.getNote(),
                firstMission != null ? firstMission.getId() : null,
                firstMission != null ? firstMission.getCode() : null,
                latestMission != null ? latestMission.getId() : null,
                sub.getCreatedAt(),
                sub.getUpdatedAt());
    }
}
