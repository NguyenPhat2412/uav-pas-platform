package com.uav.platform.dto.response.alerts;

import java.time.LocalDateTime;
import java.util.List;

/** Current issues, most severe first, with totals per severity. */
public record AlertCenterResponse(
        LocalDateTime generatedAt,
        int critical,
        int warning,
        int info,
        List<AdminAlertResponse> items) {}
