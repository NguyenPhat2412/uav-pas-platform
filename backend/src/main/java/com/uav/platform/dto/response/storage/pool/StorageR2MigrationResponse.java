package com.uav.platform.dto.response.storage.pool;

public record StorageR2MigrationResponse(
        int migratedCount,
        long migratedBytes,
        int failedCount,
        long remainingR2Count,
        long remainingR2Bytes) {}
