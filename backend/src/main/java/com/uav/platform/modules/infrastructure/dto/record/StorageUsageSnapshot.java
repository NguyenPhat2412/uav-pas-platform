package com.uav.platform.modules.infrastructure.dto.record;

import com.uav.platform.modules.media.dto.record.StorageUsage;

import java.time.Instant;

/** Cached result of one bucket usage scan. usage is null when the scan failed or was skipped. */
public record StorageUsageSnapshot(
        StorageUsage usage, String reachable, String error, Instant checkedAt) {}
