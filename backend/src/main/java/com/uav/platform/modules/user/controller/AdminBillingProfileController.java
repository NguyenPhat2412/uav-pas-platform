package com.uav.platform.modules.user.controller;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.modules.user.dto.response.BillingProfileResponse;
import com.uav.platform.modules.user.service.BillingProfileService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** Read-only view of a customer's invoicing details for operators. */
@RestController
@RequestMapping(ApiRoutes.Admin.USER_BILLING_PROFILE)
@RequiredArgsConstructor
public class AdminBillingProfileController {
    private final BillingProfileService profiles;

    @GetMapping
    @PreAuthorize("@permissionService.has(authentication, 'USER_READ')")
    public ResponseEntity<BillingProfileResponse> get(@PathVariable Long id) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(profiles.getForUser(id));
    }
}
