package com.uav.platform.modules.dashboard.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** Statistics for the signed-in customer only; every figure is scoped to missions they own. */
public record CustomerAnalyticsResponse(
        Kpis thisMonth,
        Kpis lastMonth,
        long mediaFiles,
        Quota quota,
        List<MonthMissions> missionsByMonth,
        List<MonthSpend> spendByMonth,
        PendingInvoices pendingInvoices,
        Map<String, Long> pipeline,
        List<ServiceUsage> topServices,
        List<MissionPoint> locations,
        Outcomes outcomes,
        Turnaround turnaround,
        List<Upcoming> upcoming) {

    public record Kpis(long completedMissions, double flightHours, BigDecimal spend) {}

    /** projectedDaysToLimit is null when nothing has been used yet in the cycle. */
    public record Quota(
            String planName,
            double used,
            double limit,
            LocalDate cycleStart,
            LocalDate cycleEnd,
            long daysLeftInCycle,
            Double projectedDaysToLimit) {}

    public record MonthMissions(String month, long completed, long stopped) {}

    public record MonthSpend(String month, BigDecimal paid, BigDecimal outstanding) {}

    public record PendingInvoices(long count, BigDecimal amount, LocalDateTime nextDue) {}

    public record ServiceUsage(String name, long count) {}

    public record MissionPoint(Long id, String code, double latitude, double longitude, String status) {}

    /** successRate is completed / (completed + failed + cancelled + rejected), in percent. */
    public record Outcomes(long completed, long failed, long cancelled, long rejected, double successRate,
                           List<Reason> reasons) {}

    public record Reason(String reason, long count) {}

    /** Averages in hours over the customer's missions that reached each milestone; null when none did. */
    public record Turnaround(Double submitToConfirm, Double submitToComplete, long sampleSize) {}

    public record Upcoming(Long id, String code, String title, LocalDateTime startTime, String status, String location) {}
}
