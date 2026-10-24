package com.uav.platform.modules.dashboard.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Admin dashboard analytics for a date window, with the same-length window before it for comparison.
 * Sections the caller may not read are returned empty rather than omitted, so the client shape is stable.
 */
public record AdminAnalyticsResponse(
        LocalDate from,
        LocalDate to,
        Kpis current,
        Kpis previous,
        List<DailyPoint> daily,
        Map<String, Long> statusBreakdown,
        List<NamedValue> flightHoursByStation,
        Map<String, Long> fleet,
        List<MissionPoint> missionLocations,
        List<MonthValue> revenueByMonth,
        long[][] auditHeatmap,
        List<WebhookStat> webhooks,
        List<QuotaWarning> quotaWarnings,
        List<Alert> alerts) {

    public record Kpis(
            long completedMissions,
            long failedMissions,
            double flightHours,
            double successRate,
            BigDecimal revenue,
            long newUsers) {}

    public record DailyPoint(LocalDate date, long completed, long failed) {}

    public record NamedValue(String name, double value) {}

    public record MissionPoint(String code, double latitude, double longitude, String status) {}

    public record MonthValue(String month, BigDecimal paid, BigDecimal outstanding) {}

    public record WebhookStat(String name, long success, long failed) {}

    public record QuotaWarning(Long userId, String username, double used, double limit) {}

    /** level: danger | warning | info. href points at the admin or operations page that resolves it. */
    public record Alert(String level, String code, String message, String href, long count) {}
}
