package com.uav.platform.controller.user;

import com.uav.platform.common.dto.response.MessageResponse;
import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.request.user.AccountDeletionRequest;
import com.uav.platform.dto.request.user.UserProfilePatchRequest;
import com.uav.platform.dto.response.user.AccountDeletionPolicyResponse;
import com.uav.platform.dto.response.user.UserProfileResponse;
import com.uav.platform.security.AuthCookieHelper;
import com.uav.platform.service.user.UserProfileService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(ApiRoutes.Users.FULL_PROFILE)
@PreAuthorize("isAuthenticated()")
public class UserProfileController {
    private final UserProfileService profiles;
    private final AuthCookieHelper authCookieHelper;

    public UserProfileController(UserProfileService profiles) {
        this(profiles, null);
    }

    @Autowired
    public UserProfileController(
            UserProfileService profiles,
            @Autowired(required = false) AuthCookieHelper authCookieHelper) {
        this.profiles = profiles;
        this.authCookieHelper = authCookieHelper;
    }

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

    @GetMapping(ApiRoutes.Users.DELETION_POLICY)
    public ResponseEntity<AccountDeletionPolicyResponse> getDeletionPolicy(
            Authentication authentication) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(profiles.getDeletionPolicy(authentication.getName()));
    }

    @PostMapping(ApiRoutes.Users.DELETE)
    public ResponseEntity<MessageResponse> deleteOwnAccount(
            Authentication authentication,
            @RequestBody(required = false) AccountDeletionRequest request) {
        profiles.deleteOwnAccount(authentication.getName(), request);
        return AuthCookieHelper.okClearedCookies(
                authCookieHelper, "Tài khoản của bạn đã được xoá thành công.");
    }
}
