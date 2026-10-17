package com.uav.platform.modules.billing.service;

import com.uav.platform.modules.mission.entity.Mission;

public interface MissionInvoiceService {
    void enqueue(Mission mission, double hours);

    void retryDue();

    void process(Long id);
}
