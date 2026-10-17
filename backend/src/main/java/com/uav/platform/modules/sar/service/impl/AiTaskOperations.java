package com.uav.platform.modules.sar.service.impl;

import com.uav.platform.modules.media.entity.MediaAsset;
import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.sar.entity.AiTask;
import com.uav.platform.modules.sar.enums.AiTaskStatus;
import com.uav.platform.modules.sar.enums.AiTaskType;
import com.uav.platform.modules.sar.enums.ProcessingNode;

/** Internal creation rules shared by application services and setup callers. */
public final class AiTaskOperations {
    private AiTaskOperations() {}

    public static AiTask create(
            Mission mission,
            MediaAsset media,
            AiTaskType taskType,
            ProcessingNode processingNode,
            Double confidenceThreshold) {
        AiTask entity = new AiTask();
        entity.setMission(mission);
        entity.setMedia(media);
        entity.setTaskType(taskType != null ? taskType : AiTaskType.OBJECT_DETECTION_YOLOV8S);
        entity.setProcessingNode(
                processingNode != null ? processingNode : ProcessingNode.KV260_EDGE);
        entity.setConfidenceThreshold(confidenceThreshold != null ? confidenceThreshold : 0.75);
        entity.setStatus(AiTaskStatus.PENDING);
        return entity;
    }
}
