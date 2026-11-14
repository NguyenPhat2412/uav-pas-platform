package com.uav.platform.common.constant;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/** The platform runs its schedules, "today" and flight-weather windows in Vietnam time. */
public final class TimeConstants {
    private TimeConstants() {}

    /** Default JVM zone; APP_TIME_ZONE overrides it at start-up. */
    public static final String BUSINESS_TIME_ZONE = "Asia/Ho_Chi_Minh";

    public static final ZoneId BUSINESS_ZONE = ZoneId.of(BUSINESS_TIME_ZONE);

    /** "2026-11-14 09:20": CSV exports and receipts. */
    public static final DateTimeFormatter DATE_TIME_MINUTE =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
}
