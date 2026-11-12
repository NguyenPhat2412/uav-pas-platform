package com.uav.platform.service.impl.mission;

import com.uav.platform.error.SystemException;

import java.time.Duration;
import java.time.LocalDateTime;

/** Cross-field mission rules that bean validation cannot express; each error names the field it belongs to. */
public final class MissionInputOperations {
    /** Longest flight window one mission may book; longer jobs are split into several missions. */
    public static final Duration MAX_DURATION = Duration.ofHours(24);

    /** A start a few minutes in the past is still accepted while the customer fills in the form. */
    public static final Duration START_GRACE = Duration.ofMinutes(5);

    private MissionInputOperations() {}

    public static void checkSchedule(LocalDateTime startTime, LocalDateTime expectedEndTime) {
        checkSchedule(startTime, expectedEndTime, LocalDateTime.now());
    }

    public static void checkSchedule(
            LocalDateTime startTime, LocalDateTime expectedEndTime, LocalDateTime now) {
        if (startTime != null && startTime.isBefore(now.minus(START_GRACE)))
            throw SystemException.badRequest(
                            "Thời gian bắt đầu phải ở tương lai.", "MISSION_START_IN_PAST")
                    .at("startTime");
        if (startTime != null && expectedEndTime != null && !expectedEndTime.isAfter(startTime))
            throw SystemException.badRequest(
                            "Thời gian kết thúc phải sau thời gian bắt đầu.",
                            "MISSION_END_BEFORE_START")
                    .at("expectedEndTime");
        if (startTime != null
                && expectedEndTime != null
                && Duration.between(startTime, expectedEndTime).compareTo(MAX_DURATION) > 0)
            throw SystemException.badRequest(
                            "Một nhiệm vụ không được kéo dài quá 24 giờ.",
                            "MISSION_DURATION_TOO_LONG")
                    .at("expectedEndTime");
    }
}
