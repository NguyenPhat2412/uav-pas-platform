package com.uav.platform.dto.response;

import com.uav.platform.enums.*;
import com.uav.platform.enums.UavStatus;

import java.time.LocalDateTime;

public record UavStatusHistoryResponse(
        Long id,
        Long uavId,
        UavStatus fromStatus,
        UavStatus toStatus,
        String reason,
        String changedBy,
        LocalDateTime createdAt) {}
