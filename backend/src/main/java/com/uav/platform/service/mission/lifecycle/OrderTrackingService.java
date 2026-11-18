package com.uav.platform.service.mission.lifecycle;

import com.uav.platform.dto.response.mission.lifecycle.OrderSummaryResponse;
import com.uav.platform.dto.response.mission.lifecycle.OrderTrackingResponse;

import org.springframework.security.core.Authentication;

public interface OrderTrackingService {

    OrderSummaryResponse getCustomerSummary(Authentication auth);

    OrderTrackingResponse getOrderTracking(Long missionId, Authentication auth);
}
