package com.uav.platform.modules.sar.config.request;

import jakarta.validation.constraints.NotNull;

public record VerifyDetectionRequest(
    @NotNull Boolean verified
) {}
