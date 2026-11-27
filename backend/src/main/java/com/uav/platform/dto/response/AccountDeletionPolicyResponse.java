package com.uav.platform.dto.response;

public record AccountDeletionPolicyResponse(
        boolean enabled,
        boolean eligible,
        String ineligibleReasonCode,
        String ineligibleReason,
        boolean hasPassword,
        boolean requirePassword,
        boolean requireReason,
        String confirmationPhrase,
        String mode,
        boolean blockActiveMissions,
        boolean blockUnpaidInvoices,
        long activeMissionCount,
        long unpaidInvoiceCount,
        String noticeMessage) {}
