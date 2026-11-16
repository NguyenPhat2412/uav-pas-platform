package com.uav.platform.dto.request.storage.pool;

import com.uav.platform.enums.storage.DriveAuthType;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record StorageDriveNodeCreateRequest(
        @NotBlank @Size(max = 140) String displayName,
        @NotNull DriveAuthType authType,
        @Size(max = 240) String clientId,
        @Size(max = 240) String clientSecret,
        @Size(max = 2000) String refreshToken,
        @Size(max = 16000) String serviceAccountJson,
        @Size(max = 160) String rootFolderId,
        @Min(1) @Max(1000) Integer priorityWeight,
        @Min(50) @Max(99) Integer maxUsagePercent,
        @Size(max = 300) String routedModules) {}
