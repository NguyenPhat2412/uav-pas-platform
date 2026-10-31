package com.uav.platform.service.infrastructure;

import com.uav.platform.dto.record.infrastructure.MailConnectionCheck;
import com.uav.platform.dto.response.infrastructure.EmailStatusResponse;
import com.uav.platform.dto.response.infrastructure.EmailTestResponse;

import org.springframework.security.core.Authentication;

public interface MailDiagnosticsService {
    EmailStatusResponse status(Authentication authentication);

    /** Sends one test message to the caller's own address; rate limited per admin. */
    EmailTestResponse sendTest(Authentication authentication);

    /** Cached SMTP connection probe; never sends a message. */
    MailConnectionCheck connection();
}
