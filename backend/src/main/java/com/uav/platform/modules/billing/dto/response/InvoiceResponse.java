package com.uav.platform.modules.billing.dto.response;

import com.uav.platform.modules.billing.enums.InvoiceStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record InvoiceResponse(
        Long id,
        String code,
        Long userId,
        String username,
        Long missionId,
        String missionTitle,
        Long planId,
        String planName,
        BigDecimal amount,
        InvoiceStatus status,
        LocalDateTime dueDate,
        LocalDateTime paidAt,
        String notes,
        LocalDateTime createdAt) {}
