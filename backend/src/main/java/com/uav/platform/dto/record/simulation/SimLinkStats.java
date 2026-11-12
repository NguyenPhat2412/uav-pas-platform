package com.uav.platform.dto.record.simulation;

/** Link counters: what the vehicle sent and what reached the platform, with delivery latency. */
public record SimLinkStats(
        long sent, long delivered, long lost, double averageLatencyMs, long maxLatencyMs) {}
