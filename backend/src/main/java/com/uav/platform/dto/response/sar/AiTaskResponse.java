package com.uav.platform.dto.response.sar;

import com.uav.platform.enums.sar.AiTaskStatus;
import com.uav.platform.enums.sar.AiTaskType;
import com.uav.platform.enums.sar.ProcessingNode;

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
