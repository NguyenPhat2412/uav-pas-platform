package com.uav.platform.modules.user.controller;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.modules.user.dto.request.UserProfilePatchRequest;
import com.uav.platform.modules.user.dto.response.UserProfileResponse;
import com.uav.platform.modules.user.service.UserProfileService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(ApiRoutes.Users.FULL_PROFILE)
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class UserProfileController {
    private final UserProfileService profiles;

    @GetMapping
    public ResponseEntity<UserProfileResponse> get(Authentication authentication) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(profiles.get(authentication.getName()));
    }

    @PatchMapping
    public ResponseEntity<UserProfileResponse> update(
            Authentication authentication, @RequestBody UserProfilePatchRequest request) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(profiles.updatePayload(authentication.getName(), request));
    }
}
