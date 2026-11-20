package com.uav.platform.dto.request.marketplace.admin;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ManualDispatchRequest(
        @NotNull(message = "Vui lòng chọn đội bay nhận đơn") Long providerId,
        @Size(max = 500) String note) {}
