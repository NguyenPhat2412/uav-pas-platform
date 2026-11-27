package com.uav.platform.dto.response;

import java.time.LocalDateTime;

public record InvoiceEmailDispatchResponse(
        Long invoiceId,
        String invoiceCode,
        String recipientEmail,
        boolean pdfAttached,
        LocalDateTime sentAt) {}
