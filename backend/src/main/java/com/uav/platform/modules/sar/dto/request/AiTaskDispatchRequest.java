package com.uav.platform.modules.sar.dto.request;

import com.uav.platform.modules.sar.enums.AiTaskType;
import com.uav.platform.modules.sar.enums.ProcessingNode;

import jakarta.validation.constraints.NotNull;

public record AiTaskDispatchRequest(
        @NotNull Long missionId,
        Long mediaId,
        AiTaskType taskType,
        ProcessingNode processingNode,
        Double confidenceThreshold) {}
