package com.uav.platform.service.impl.dashboard;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.uav.platform.entity.audit.AuditLog;
import com.uav.platform.enums.audit.AuditAction;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;

class AdminAnalyticsHeatmapTest {

    private AuditLog at(LocalDateTime time) {
        AuditLog log = new AuditLog(1L, "admin", AuditAction.UPDATE, "USER", "1", "x");
        ReflectionTestUtils.setField(log, "createdAt", time);
        return log;
    }

    @Test
    void bucketsByIsoWeekdayAndHourAndIgnoresUndatedRows() {
        // 2026-10-19 is a Monday, 2026-10-25 a Sunday.
        long[][] grid =
                AdminAnalyticsServiceImpl.auditHeatmap(
                        List.of(
                                at(LocalDateTime.of(2026, 10, 19, 9, 5)),
                                at(LocalDateTime.of(2026, 10, 19, 9, 55)),
                                at(LocalDateTime.of(2026, 10, 25, 23, 0)),
                                new AuditLog(1L, "admin", AuditAction.UPDATE, "USER", "1", "x")));

        assertEquals(2, grid[0][9]);
        assertEquals(1, grid[6][23]);
        assertEquals(7, grid.length);
        assertEquals(24, grid[0].length);
    }
}
