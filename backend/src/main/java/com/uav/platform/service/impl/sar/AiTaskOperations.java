package com.uav.platform.service.impl.sar;

import com.uav.platform.entity.media.MediaAsset;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.sar.AiTask;
import com.uav.platform.enums.sar.AiTaskStatus;
import com.uav.platform.enums.sar.AiTaskType;
import com.uav.platform.enums.sar.ProcessingNode;

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
