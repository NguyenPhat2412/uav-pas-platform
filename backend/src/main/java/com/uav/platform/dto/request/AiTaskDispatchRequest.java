package com.uav.platform.dto.request;

import com.uav.platform.enums.AiTaskType;
import com.uav.platform.enums.ProcessingNode;

import jakarta.validation.constraints.NotNull;

public record AiTaskDispatchRequest(
        @NotNull Long missionId,
        Long mediaId,
        AiTaskType taskType,
        ProcessingNode processingNode,
        Double confidenceThreshold) {}
