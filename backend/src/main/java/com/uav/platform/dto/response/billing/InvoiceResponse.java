package com.uav.platform.dto.response.billing;

import com.uav.platform.enums.billing.InvoiceStatus;

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
