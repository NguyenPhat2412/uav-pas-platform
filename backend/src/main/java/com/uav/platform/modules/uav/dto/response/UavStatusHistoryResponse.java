package com.uav.platform.modules.uav.dto.response;

import com.uav.platform.modules.uav.enums.*;
import com.uav.platform.modules.uav.enums.UavStatus;

import java.time.LocalDateTime;

public record UavStatusHistoryResponse(
        Long id,
        Long uavId,
        UavStatus fromStatus,
        UavStatus toStatus,
        String reason,
        String changedBy,
        LocalDateTime createdAt) {}
