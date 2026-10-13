package com.uav.platform.modules.sar.config.request;

import com.uav.platform.modules.sar.common.AiTaskType;
import com.uav.platform.modules.sar.common.ProcessingNode;
import jakarta.validation.constraints.NotNull;

public record AiTaskDispatchRequest(
    @NotNull Long missionId,
    Long mediaId,
    AiTaskType taskType,
    ProcessingNode processingNode,
    Double confidenceThreshold
) {}
