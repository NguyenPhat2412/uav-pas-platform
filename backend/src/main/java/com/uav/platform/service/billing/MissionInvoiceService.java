package com.uav.platform.service.billing;

import com.uav.platform.entity.mission.Mission;

public interface MissionInvoiceService {
    void enqueue(Mission mission, double hours);

    void retryDue();

    void process(Long id);
}
