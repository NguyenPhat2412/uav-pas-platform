package com.uav.platform.dto.response;

import com.uav.platform.enums.DriveAuthType;
import com.uav.platform.enums.DriveNodeHealth;

import java.time.LocalDateTime;

public record StorageDriveNodeResponse(
        Long id,
        String code,
        String displayName,
        DriveAuthType authType,
        String accountEmail,
        String rootFolderId,
        boolean enabled,
        int priorityWeight,
        int maxUsagePercent,
        String routedModules,
        Long quotaLimitBytes,
        Long quotaUsedBytes,
        Long quotaDriveBytes,
        Long freeBytes,
        Double usagePercent,
        long storedObjectCount,
        long storedBytes,
        DriveNodeHealth healthStatus,
        String lastError,
        LocalDateTime lastCheckedAt,
        LocalDateTime createdAt) {}
