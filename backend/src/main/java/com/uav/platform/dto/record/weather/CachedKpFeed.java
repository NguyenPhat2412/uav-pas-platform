package com.uav.platform.dto.record.weather;

import java.time.LocalDateTime;
import java.util.List;

/** The last NOAA Kp feed read and when it was read. */
public record CachedKpFeed(LocalDateTime fetchedAt, List<KpReading> readings) {}
