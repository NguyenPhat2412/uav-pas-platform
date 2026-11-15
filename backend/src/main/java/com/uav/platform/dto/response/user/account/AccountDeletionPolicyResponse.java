package com.uav.platform.dto.response.user.account;

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
