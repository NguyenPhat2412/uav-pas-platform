package com.uav.platform.controller.infrastructure;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.request.infrastructure.AdminOtpSupportRequest;
import com.uav.platform.dto.request.infrastructure.MailOtpSettingsUpdateRequest;
import com.uav.platform.dto.response.infrastructure.AdminOtpSupportResponse;
import com.uav.platform.dto.response.infrastructure.AdminOtpTokenResponse;
import com.uav.platform.dto.response.infrastructure.MailOtpSettingsResponse;
import com.uav.platform.service.infrastructure.MailOtpSettingsService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Runtime SMTP App Password / sender management, OTP policy tuning, OTP challenge inspection, and
 * support recovery actions for administrators.
 */
@RestController
@RequestMapping(ApiRoutes.Admin.INFRASTRUCTURE)
@RequiredArgsConstructor
public class MailOtpAdminController {

    private final MailOtpSettingsService mailOtpSettingsService;

    @GetMapping(ApiRoutes.Admin.INFRASTRUCTURE_MAIL_OTP_SETTINGS)
    @PreAuthorize("@permissionService.has(authentication, 'USER_PERMISSION_MANAGE')")
    public ResponseEntity<MailOtpSettingsResponse> getSettings() {
        return ResponseEntity.ok(mailOtpSettingsService.getSettings());
    }

    @PutMapping(ApiRoutes.Admin.INFRASTRUCTURE_MAIL_OTP_SETTINGS)
    @PreAuthorize("@permissionService.has(authentication, 'USER_PERMISSION_MANAGE')")
    public ResponseEntity<MailOtpSettingsResponse> updateSettings(
            @Valid @RequestBody MailOtpSettingsUpdateRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(mailOtpSettingsService.updateSettings(request, authentication));
    }

    @GetMapping(ApiRoutes.Admin.INFRASTRUCTURE_OTP_TOKENS)
    @PreAuthorize("@permissionService.has(authentication, 'USER_PERMISSION_MANAGE')")
    public ResponseEntity<PageResponse<AdminOtpTokenResponse>> listOtpTokens(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String purpose,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String q) {
        return ResponseEntity.ok(
                mailOtpSettingsService.listOtpTokens(page, size, purpose, status, q));
    }

    @PostMapping(ApiRoutes.Admin.INFRASTRUCTURE_OTP_TOKEN_INVALIDATE)
    @PreAuthorize("@permissionService.has(authentication, 'USER_PERMISSION_MANAGE')")
    public ResponseEntity<AdminOtpTokenResponse> invalidateOtpToken(
            @PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(mailOtpSettingsService.invalidateOtpToken(id, authentication));
    }

    @PostMapping(ApiRoutes.Admin.INFRASTRUCTURE_OTP_SEND_RESET)
    @PreAuthorize("@permissionService.has(authentication, 'USER_PERMISSION_MANAGE')")
    public ResponseEntity<AdminOtpSupportResponse> sendPasswordResetSupportOtp(
            @Valid @RequestBody AdminOtpSupportRequest request, Authentication authentication) {
        return ResponseEntity.ok(
                mailOtpSettingsService.sendPasswordResetSupportOtp(request, authentication));
    }

    @PostMapping(ApiRoutes.Admin.INFRASTRUCTURE_OTP_CLEAR_RATE_LIMIT)
    @PreAuthorize("@permissionService.has(authentication, 'USER_PERMISSION_MANAGE')")
    public ResponseEntity<AdminOtpSupportResponse> clearRateLimit(
            @Valid @RequestBody AdminOtpSupportRequest request, Authentication authentication) {
        return ResponseEntity.ok(
                mailOtpSettingsService.clearAccountRateLimits(request, authentication));
    }
}
