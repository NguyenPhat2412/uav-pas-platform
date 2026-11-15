package com.uav.platform.dto.request.storage;

import com.uav.platform.enums.storage.DriveAllocationStrategy;
import com.uav.platform.enums.storage.StorageBackendMode;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record StoragePoolPolicyRequest(
        @NotNull StorageBackendMode primaryBackend,
        @NotNull DriveAllocationStrategy allocationStrategy,
        @NotNull Boolean fallbackToR2,
        @Min(65536) @Max(104857600) Long tieredSmallFileMaxBytes) {}
