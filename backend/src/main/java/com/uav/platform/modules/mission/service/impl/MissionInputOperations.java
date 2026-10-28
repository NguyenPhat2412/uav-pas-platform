package com.uav.platform.modules.mission.service.impl;

import com.uav.platform.error.SystemException;

import java.time.LocalDateTime;

/** Cross-field mission rules that bean validation cannot express; each error names the field it belongs to. */
public final class MissionInputOperations {
    private MissionInputOperations() {}

    public static void checkSchedule(LocalDateTime startTime, LocalDateTime expectedEndTime) {
        if (startTime != null && expectedEndTime != null && !expectedEndTime.isAfter(startTime))
            throw SystemException.badRequest(
                            "Thời gian kết thúc phải sau thời gian bắt đầu.",
                            "MISSION_END_BEFORE_START")
                    .at("expectedEndTime");
    }
}
