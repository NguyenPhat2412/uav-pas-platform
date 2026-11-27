package com.uav.platform.dto.response;

import com.uav.platform.dto.record.MailConnectionCheck;

import java.time.LocalDateTime;

public record MailOtpSettingsResponse(
        boolean mailEnabled,
        String smtpHost,
        Integer smtpPort,
        String smtpUsername,
        String fromAddress,
        String senderDisplayName,
        boolean smtpAuth,
        boolean smtpStarttls,
        boolean passwordConfigured,
        String passwordSource,
        String passwordHint,
        boolean hasDatabaseOverride,
        int otpTtlMinutes,
        int resendCooldownSeconds,
        int maxOtpAttempts,
        int otpPerAccount,
        int otpPerIp,
        int maxEmailsPerMinute,
        LocalDateTime updatedAt,
        String updatedBy,
        MailConnectionCheck connection) {}
