package com.uav.platform.service.impl.mission;

import com.uav.platform.entity.mission.*;
import com.uav.platform.service.mission.MissionBillingService;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

/** Records usage and queues durable invoice work; never issues an invoice inline. */
@Service
@RequiredArgsConstructor
public class MissionBillingServiceImpl implements MissionBillingService {
    private final com.uav.platform.service.billing.QuotaService quotaService;
    private final com.uav.platform.service.billing.MissionInvoiceService missionInvoiceService;

    @Override
    public double calculateDurationHours(
            java.time.LocalDateTime start, java.time.LocalDateTime end) {
        return com.uav.platform.service.impl.billing.FlightHoursOperations.plannedHours(start, end);
    }

    @Override
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
