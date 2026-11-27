package com.uav.platform.service;

import com.uav.platform.dto.response.OrderSummaryResponse;
import com.uav.platform.dto.response.OrderTrackingResponse;

import org.springframework.security.core.Authentication;

public interface OrderTrackingService {

    OrderSummaryResponse getCustomerSummary(Authentication auth);

    OrderTrackingResponse getOrderTracking(Long missionId, Authentication auth);
}
