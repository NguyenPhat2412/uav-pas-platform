package com.uav.platform.service;

import com.uav.platform.dto.record.MailConnectionCheck;
import com.uav.platform.dto.response.EmailStatusResponse;
import com.uav.platform.dto.response.EmailTestResponse;

import org.springframework.security.core.Authentication;

public interface MailDiagnosticsService {
    EmailStatusResponse status(Authentication authentication);

    /** Sends one test message to the caller's own address; rate limited per admin. */
    EmailTestResponse sendTest(Authentication authentication);

    /** Cached SMTP connection probe; never sends a message. */
    MailConnectionCheck connection();

    /** Evicts cached SMTP connection probe when runtime mail settings are updated. */
    default void invalidateConnectionCache() {}
}
