package com.uav.platform.modules.infrastructure.dto.response;

import java.util.List;

/** PostgreSQL size, connection and pool figures for the current database. No connection URL or user names. */
public record DatabaseStatusResponse(
        String version,
        long sizeBytes,
        Connections connections,
        List<TableSize> largestTables,
        Pool pool) {

    public record Connections(
            long active, long idle, long idleInTransaction, long total, int max) {}

    public record TableSize(String name, long totalBytes, long rowEstimate) {}

    /** Hikari pool counters; null when the data source is not a Hikari pool. */
    public record Pool(int active, int idle, int total, int threadsAwaiting, int maximumPoolSize) {}
}
