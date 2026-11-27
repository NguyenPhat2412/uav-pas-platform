package com.uav.platform.service;

import com.uav.platform.entity.Mission;

public interface MissionInvoiceService {
    void enqueue(Mission mission, double hours);

    void retryDue();

    void process(Long id);
}
