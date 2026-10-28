package com.uav.platform.modules.devicekey.dto.request;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

/** uavId binds the key to one UAV (recommended); expiresAt is optional and must be in the future. */
public record CreateDeviceKeyRequest(
        @NotBlank @Size(max = 120) String name,
        @Positive Long uavId,
        @Future LocalDateTime expiresAt) {}
