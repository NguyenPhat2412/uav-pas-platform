package com.uav.platform.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record GoogleOAuthAuthorizeRequest(
        @Size(max = 140) String displayName,
        @Size(max = 160) String rootFolderId,
        @Min(1) @Max(1000) Integer priorityWeight,
        @Min(50) @Max(99) Integer maxUsagePercent,
        @Size(max = 300) String routedModules,
        @Size(max = 240) String returnOrigin) {}
