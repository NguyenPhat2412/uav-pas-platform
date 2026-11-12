package com.uav.platform.dto.request.sar;

import jakarta.validation.constraints.NotNull;

public record VerifyDetectionRequest(@NotNull Boolean verified) {}
