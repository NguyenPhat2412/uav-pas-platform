package com.uav.platform.dto.request.storage;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record StorageDriveNodeUpdateRequest(
        @NotBlank @Size(max = 140) String displayName,
        Boolean enabled,
        @Min(1) @Max(1000) Integer priorityWeight,
        @Min(50) @Max(99) Integer maxUsagePercent,
        @Size(max = 300) String routedModules,
        @Size(max = 160) String rootFolderId) {}
