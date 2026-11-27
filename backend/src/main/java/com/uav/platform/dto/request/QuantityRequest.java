package com.uav.platform.dto.request;

import com.uav.platform.enums.*;

import jakarta.validation.constraints.Min;

public record QuantityRequest(
        @Min(1) int quantity,
        @jakarta.validation.constraints.Size(max = 255) String note,
        @jakarta.validation.constraints.Size(max = 120) String requestId) {
    public QuantityRequest(int quantity, String note) {
        this(quantity, note, null);
    }
}
