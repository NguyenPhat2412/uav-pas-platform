package com.uav.platform.service;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.request.AdminOtpSupportRequest;
import com.uav.platform.dto.request.MailOtpSettingsUpdateRequest;
import com.uav.platform.dto.response.AdminOtpSupportResponse;
import com.uav.platform.dto.response.AdminOtpTokenResponse;
import com.uav.platform.dto.response.MailOtpSettingsResponse;

import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.core.Authentication;

public interface MailOtpSettingsService {

    boolean isMailEnabled();

    String effectiveSmtpHost();

    Integer effectiveSmtpPort();

    String effectiveSmtpUsername();

    String effectiveFromAddress();

    String effectiveSenderDisplayName();

    boolean effectiveSmtpAuth();

    boolean effectiveSmtpStarttls();

    int effectiveOtpTtlMinutes();

    int effectiveResendCooldownSeconds();

    int effectiveMaxOtpAttempts();

    int effectiveOtpPerAccount();

    int effectiveOtpPerIp();

    int effectiveMaxEmailsPerMinute();

    JavaMailSender currentMailSender();

    void invalidateCache();

    MailOtpSettingsResponse getSettings();

    MailOtpSettingsResponse updateSettings(
            MailOtpSettingsUpdateRequest request, Authentication authentication);

    PageResponse<AdminOtpTokenResponse> listOtpTokens(
            int page, int size, String purpose, String status, String query);

    AdminOtpTokenResponse invalidateOtpToken(Long id, Authentication authentication);

    AdminOtpSupportResponse sendPasswordResetSupportOtp(
            AdminOtpSupportRequest request, Authentication authentication);

    AdminOtpSupportResponse clearAccountRateLimits(
            AdminOtpSupportRequest request, Authentication authentication);
}
