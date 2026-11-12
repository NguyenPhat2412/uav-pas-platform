package com.uav.platform.dto.request.sar;

import com.uav.platform.enums.sar.AiTaskType;
import com.uav.platform.enums.sar.ProcessingNode;

import jakarta.validation.constraints.NotNull;

public record AiTaskDispatchRequest(
        @NotNull Long missionId,
        Long mediaId,
        AiTaskType taskType,
        ProcessingNode processingNode,
        Double confidenceThreshold) {}
