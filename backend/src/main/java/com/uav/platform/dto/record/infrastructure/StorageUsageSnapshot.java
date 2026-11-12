package com.uav.platform.dto.record.infrastructure;

import com.uav.platform.dto.record.media.StorageUsage;

import java.time.Instant;

/** Cached result of one bucket usage scan. usage is null when the scan failed or was skipped. */
public record StorageUsageSnapshot(
        StorageUsage usage, String reachable, String error, Instant checkedAt) {}
