package com.uav.platform.dto.record.media;

/**
 * Object count and total bytes in the media bucket. truncated is true when the listing stopped at the scan limit,
 * so both numbers are lower bounds.
 */
public record StorageUsage(long objectCount, long totalBytes, boolean truncated) {}
