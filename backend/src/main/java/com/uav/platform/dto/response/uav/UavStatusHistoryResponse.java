package com.uav.platform.dto.response.uav;

import com.uav.platform.enums.uav.*;
import com.uav.platform.enums.uav.UavStatus;

import java.time.LocalDateTime;

public record UavStatusHistoryResponse(
        Long id,
        Long uavId,
        UavStatus fromStatus,
        UavStatus toStatus,
        String reason,
        String changedBy,
        LocalDateTime createdAt) {}
