package com.uav.platform.service.mission;

import com.uav.platform.entity.mission.Mission;

import java.time.LocalDateTime;

/** Records usage and queues durable invoice work; never issues an invoice inline. */
public interface MissionBillingService {
    double calculateDurationHours(LocalDateTime start, LocalDateTime end);

    void recordCompletion(Mission mission);
}
