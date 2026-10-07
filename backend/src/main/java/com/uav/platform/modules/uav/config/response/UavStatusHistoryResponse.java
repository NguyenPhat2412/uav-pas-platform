package com.uav.platform.modules.uav.config.response;

import com.uav.platform.modules.uav.common.*;

import com.uav.platform.modules.uav.common.UavStatus;

import java.time.LocalDateTime;

public record UavStatusHistoryResponse(Long id, Long uavId, UavStatus fromStatus, UavStatus toStatus,
                                      String reason, String changedBy, LocalDateTime createdAt) { }
