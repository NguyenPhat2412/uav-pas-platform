package com.uav.platform.dto.request.infrastructure;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record MailOtpSettingsUpdateRequest(
        Boolean mailEnabled,
        @Size(max = 255) String smtpHost,
        @Min(1) @Max(65535) Integer smtpPort,
        @Size(max = 255) String smtpUsername,
        @Size(max = 512) String smtpPassword,
        Boolean resetToEnvDefaults,
        @Size(max = 255) String fromAddress,
        @Size(max = 120) String senderDisplayName,
        Boolean smtpAuth,
        Boolean smtpStarttls,
        @Min(1) @Max(60) Integer otpTtlMinutes,
        @Min(5) @Max(600) Integer resendCooldownSeconds,
        @Min(1) @Max(20) Integer maxOtpAttempts,
        @Min(1) @Max(100) Integer otpPerAccount,
        @Min(1) @Max(500) Integer otpPerIp,
        @Min(1) @Max(1000) Integer maxEmailsPerMinute) {}
