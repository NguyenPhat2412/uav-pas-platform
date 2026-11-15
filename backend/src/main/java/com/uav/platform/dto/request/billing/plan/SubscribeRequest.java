package com.uav.platform.dto.request.billing.plan;

import jakarta.validation.constraints.NotBlank;

public record SubscribeRequest(@NotBlank String planCode) {}
