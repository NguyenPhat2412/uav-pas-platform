package com.uav.platform.modules.billing.dto.request;

import jakarta.validation.constraints.NotBlank;

public record SubscribeRequest(@NotBlank String planCode) {}
