package com.uav.platform.dto.request.support;

import jakarta.validation.constraints.NotBlank;

public record SupportStatusUpdateRequest(@NotBlank String status) {}
