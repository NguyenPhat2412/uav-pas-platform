package com.uav.platform.dto.response.settings;

import java.math.BigDecimal;
import java.util.List;

/**
 * Unauthenticated discovery catalog fetched by contextual scroll engagement cards on public pages:
 * live active UAV services, subscription plans, UAV training modules, and direct contact channels.
 */
public record PublicDiscoveryResponse(
        List<PublicServiceItem> services,
        List<PublicPlanItem> plans,
        List<PublicTrainingItem> trainings,
        String dispatchHotline,
        String zaloPhone,
        String email) {

    public record PublicServiceItem(
            String code,
            String name,
            String description,
            int defaultDurationMinutes,
            String sensors,
            Double maxAreaHectares) {}

    public record PublicPlanItem(
            String code,
            String name,
            BigDecimal price,
            Double maxMonthlyFlightHours,
            Integer maxConcurrentUavs,
            Boolean allowSarAi) {}

    public record PublicTrainingItem(
            String code,
            String slug,
            String title,
            String summary,
            Integer estimatedMinutes,
            String category) {}
}
