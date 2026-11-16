package com.uav.platform.dto.request.storage.pool;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record StorageR2MigrationRequest(
        @Min(1) @Max(200) Integer limit, Boolean deleteSourceFromR2, Long targetNodeId) {}
