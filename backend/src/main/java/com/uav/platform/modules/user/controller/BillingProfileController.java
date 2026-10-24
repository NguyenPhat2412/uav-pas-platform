package com.uav.platform.modules.user.controller;

import com.uav.platform.common.constant.RestEndpoint;
import com.uav.platform.modules.user.dto.request.BillingProfileRequest;
import com.uav.platform.modules.user.dto.response.BillingProfileResponse;
import com.uav.platform.modules.user.service.BillingProfileService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(RestEndpoint.USERS + "/profile/billing")
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class BillingProfileController {
    private final BillingProfileService profiles;

    @GetMapping
    public ResponseEntity<BillingProfileResponse> get(Authentication authentication) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(profiles.get(authentication.getName()));
    }

    @PutMapping
    public ResponseEntity<BillingProfileResponse> update(@Valid @RequestBody BillingProfileRequest request, Authentication authentication) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(profiles.update(authentication.getName(), request));
    }
}
