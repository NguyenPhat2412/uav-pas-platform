package com.uav.platform.dto.record;

import java.time.LocalDateTime;

/** One NOAA planetary Kp value and its time tag (UTC). */
public record KpReading(LocalDateTime tagUtc, double kp) {}
