package com.uav.platform.controller.mission.lifecycle;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.response.mission.lifecycle.OrderSummaryResponse;
import com.uav.platform.dto.response.mission.lifecycle.OrderTrackingResponse;
import com.uav.platform.service.mission.lifecycle.OrderTrackingService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiRoutes.Orders.BASE)
@RequiredArgsConstructor
public class OrderController {

    private final OrderTrackingService orderTrackingService;

    @GetMapping(ApiRoutes.Orders.SUMMARY)
    public ResponseEntity<OrderSummaryResponse> summary(Authentication auth) {
        return ResponseEntity.ok(orderTrackingService.getCustomerSummary(auth));
    }

    @GetMapping(ApiRoutes.Orders.TRACKING)
    public ResponseEntity<OrderTrackingResponse> tracking(
            @PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(orderTrackingService.getOrderTracking(id, auth));
    }
}
