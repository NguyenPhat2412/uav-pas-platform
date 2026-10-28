package com.uav.platform.modules.infrastructure.service;

import com.uav.platform.modules.infrastructure.dto.record.MailConnectionCheck;
import com.uav.platform.modules.infrastructure.dto.response.EmailStatusResponse;
import com.uav.platform.modules.infrastructure.dto.response.EmailTestResponse;

import org.springframework.security.core.Authentication;

public interface MailDiagnosticsService {
    EmailStatusResponse status(Authentication authentication);

    /** Sends one test message to the caller's own address; rate limited per admin. */
    EmailTestResponse sendTest(Authentication authentication);

    /** Cached SMTP connection probe; never sends a message. */
    MailConnectionCheck connection();
}
