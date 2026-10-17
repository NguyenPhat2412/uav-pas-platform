package com.uav.platform.modules.sar.dto.response;

import com.uav.platform.modules.sar.enums.AiTaskStatus;
import com.uav.platform.modules.sar.enums.AiTaskType;
import com.uav.platform.modules.sar.enums.ProcessingNode;

import java.time.LocalDateTime;

public record AiTaskResponse(
        Long id,
        Long missionId,
        Long mediaId,
        AiTaskType taskType,
        AiTaskStatus status,
        ProcessingNode processingNode,
        Double confidenceThreshold,
        Integer inferenceTimeMs,
        Double fps,
        Double dpuUtilization,
        Double socTemperature,
        String errorMessage,
        LocalDateTime createdAt,
        LocalDateTime completedAt) {}
