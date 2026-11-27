package com.uav.platform.dto.request;

import jakarta.validation.constraints.NotNull;

public record VerifyDetectionRequest(@NotNull Boolean verified) {}
