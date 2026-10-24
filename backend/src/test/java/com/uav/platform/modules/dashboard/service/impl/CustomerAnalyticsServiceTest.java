package com.uav.platform.modules.dashboard.service.impl;

import static org.junit.jupiter.api.Assertions.*;

import com.uav.platform.modules.billing.entity.UserQuota;
import com.uav.platform.modules.dashboard.dto.response.CustomerAnalyticsResponse.Outcomes;
import com.uav.platform.modules.dashboard.dto.response.CustomerAnalyticsResponse.Quota;
import com.uav.platform.modules.dashboard.dto.response.CustomerAnalyticsResponse.Turnaround;
import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.mission.entity.MissionEvent;
import com.uav.platform.modules.mission.enums.MissionEventType;
import com.uav.platform.modules.mission.enums.MissionStatus;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

class CustomerAnalyticsServiceTest {

    private UserQuota quota(double used, double limit, LocalDate start, LocalDate end) {
        UserQuota q = new UserQuota();
        q.setFlightHoursUsed(used);
        q.setFlightHoursLimit(limit);
        q.setCycleStart(start.atStartOfDay());
        q.setCycleEnd(end.atStartOfDay());
        return q;
    }

    @Test
    void quotaProjectsDaysLeftFromTheCurrentUsageRate() {
        LocalDate today = LocalDate.of(2026, 10, 21);
        // 10 h used over 20 days = 0.5 h/day; 10 h remaining -> 20 days.
        Quota q =
                CustomerAnalyticsServiceImpl.quota(
                        quota(10, 20, LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31)),
                        today);

        assertEquals(20.0, q.projectedDaysToLimit());
        assertEquals(10, q.daysLeftInCycle());
    }

    @Test
    void quotaHasNoProjectionWithoutUsageAndZeroWhenExhausted() {
        LocalDate today = LocalDate.of(2026, 10, 21);
        assertNull(
                CustomerAnalyticsServiceImpl.quota(
                                quota(0, 20, LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31)),
                                today)
                        .projectedDaysToLimit());
        assertEquals(
                0.0,
                CustomerAnalyticsServiceImpl.quota(
                                quota(
                                        25,
                                        20,
                                        LocalDate.of(2026, 10, 1),
                                        LocalDate.of(2026, 10, 31)),
                                today)
                        .projectedDaysToLimit());
    }

    private Mission mission(MissionStatus status, String reason) {
        Mission m = new Mission();
        m.setStatus(status);
        m.setFailureReason(reason);
        return m;
    }

    @Test
    void outcomesCountEveryFinishedStateAndGroupReasons() {
        Outcomes o =
                CustomerAnalyticsServiceImpl.outcomes(
                        List.of(
                                mission(MissionStatus.COMPLETED, null),
                                mission(MissionStatus.COMPLETED, null),
                                mission(MissionStatus.COMPLETED, null),
                                mission(MissionStatus.FAILED, "WEATHER"),
                                mission(MissionStatus.CANCELLED, null),
                                mission(MissionStatus.DRAFT, null)));

        assertEquals(60.0, o.successRate());
        assertEquals(
                List.of("WEATHER", "CANCELLED"),
                o.reasons().stream().map(r -> r.reason()).sorted().toList().reversed());
    }

    private MissionEvent event(MissionEventType type, MissionStatus next, LocalDateTime at) {
        MissionEvent e = new MissionEvent(null, type, null, null, next, null, null);
        ReflectionTestUtils.setField(e, "createdAt", at);
        return e;
    }

    @Test
    void turnaroundMeasuresFromFirstSubmission() {
        LocalDateTime t0 = LocalDateTime.of(2026, 10, 1, 8, 0);
        Turnaround t =
                CustomerAnalyticsServiceImpl.turnaround(
                        Map.of(
                                1L,
                                        List.of(
                                                event(
                                                        MissionEventType.SUBMITTED,
                                                        MissionStatus.PENDING_CONFIRMATION,
                                                        t0),
                                                event(
                                                        MissionEventType.STATUS_CHANGED,
                                                        MissionStatus.CONFIRMED,
                                                        t0.plusHours(2)),
                                                event(
                                                        MissionEventType.COMPLETED,
                                                        MissionStatus.COMPLETED,
                                                        t0.plusHours(30))),
                                2L,
                                        List.of(
                                                event(
                                                        MissionEventType.SUBMITTED,
                                                        MissionStatus.PENDING_CONFIRMATION,
                                                        t0),
                                                event(
                                                        MissionEventType.STATUS_CHANGED,
                                                        MissionStatus.CONFIRMED,
                                                        t0.plusHours(4))),
                                3L,
                                        List.of(
                                                event(
                                                        MissionEventType.CREATED,
                                                        MissionStatus.DRAFT,
                                                        t0))));

        assertEquals(3.0, t.submitToConfirm());
        assertEquals(30.0, t.submitToComplete());
        assertEquals(2, t.sampleSize());
    }
}
