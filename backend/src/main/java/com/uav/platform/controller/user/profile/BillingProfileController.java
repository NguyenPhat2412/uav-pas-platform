package com.uav.platform.controller.user.profile;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.request.user.profile.BillingProfileRequest;
import com.uav.platform.dto.response.user.profile.BillingProfileResponse;
import com.uav.platform.service.user.profile.BillingProfileService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(ApiRoutes.Users.FULL_PROFILE_BILLING)
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class BillingProfileController {
    private final BillingProfileService profiles;

    @GetMapping
    public ResponseEntity<BillingProfileResponse> get(Authentication authentication) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(profiles.get(authentication.getName()));
    }

    @PutMapping
    public ResponseEntity<BillingProfileResponse> update(
            @Valid @RequestBody BillingProfileRequest request, Authentication authentication) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(profiles.update(authentication.getName(), request));
    }
}
