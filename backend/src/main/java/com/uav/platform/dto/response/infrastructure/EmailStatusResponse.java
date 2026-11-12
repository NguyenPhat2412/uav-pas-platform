package com.uav.platform.dto.response.infrastructure;

import com.uav.platform.dto.record.infrastructure.MailConnectionCheck;

/**
 * Outbound mail configuration as booleans and the sender address; SMTP host, username and password are never
 * returned. testRecipient is the caller's own address, masked.
 */
public record EmailStatusResponse(
        boolean enabled,
        boolean senderAvailable,
        boolean hostConfigured,
        boolean usernameConfigured,
        Integer port,
        String fromAddress,
        String testRecipient,
        long testCooldownSeconds,
        MailConnectionCheck connection) {}
