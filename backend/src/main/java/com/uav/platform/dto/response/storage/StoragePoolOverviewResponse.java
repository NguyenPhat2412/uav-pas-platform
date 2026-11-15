package com.uav.platform.dto.response.storage;

import com.uav.platform.enums.storage.DriveAllocationStrategy;
import com.uav.platform.enums.storage.StorageBackendMode;

import java.util.List;

public record StoragePoolOverviewResponse(
        StorageBackendMode primaryBackend,
        DriveAllocationStrategy allocationStrategy,
        boolean fallbackToR2,
        long tieredSmallFileMaxBytes,
        boolean oauthConfigured,
        String maskedClientId,
        String callbackPath,
        long driveActiveNodeCount,
        long driveTotalObjectCount,
        long driveTotalStoredBytes,
        Long driveTotalLimitBytes,
        Long driveTotalFreeBytes,
        long r2PendingObjectCount,
        long r2PendingBytes,
        List<StorageDriveNodeResponse> nodes) {}
