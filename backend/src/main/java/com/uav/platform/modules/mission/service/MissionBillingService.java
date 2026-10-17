package com.uav.platform.modules.mission.service;

import com.uav.platform.modules.mission.dto.request.*;
import com.uav.platform.modules.mission.dto.response.*;
import com.uav.platform.modules.mission.entity.*;
import com.uav.platform.modules.mission.enums.*;

import org.springframework.stereotype.Service;

/** Records usage and queues durable invoice work; never issues an invoice inline. */
@Service
@lombok.RequiredArgsConstructor
public class MissionBillingService {
    private final com.uav.platform.modules.billing.service.QuotaService quotaService;
    private final com.uav.platform.modules.billing.service.MissionInvoiceService
            missionInvoiceService;

    public double calculateDurationHours(
            java.time.LocalDateTime start, java.time.LocalDateTime end) {
        if (start == null || end == null || !end.isAfter(start)) {
            return 1.0;
        }
        long minutes = java.time.Duration.between(start, end).toMinutes();
        return Math.max(0.5, Math.min(24.0, Math.round((minutes / 60.0) * 10.0) / 10.0));
    }

    public void recordCompletion(Mission mission) {
        if (mission.getCustomer() == null || mission.getCustomer().getId() == null) {
            return;
        }
        double hoursUsed =
                calculateDurationHours(mission.getStartTime(), mission.getExpectedEndTime());
        if (quotaService != null) {
            quotaService.recordMissionUsage(mission.getCustomer().getId(), hoursUsed);
        }
        if (missionInvoiceService != null) missionInvoiceService.enqueue(mission, hoursUsed);
    }
}
