package com.uav.platform.modules.sar.dto.request;

import jakarta.validation.constraints.NotNull;

public record VerifyDetectionRequest(@NotNull Boolean verified) {}
