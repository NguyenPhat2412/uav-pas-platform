package com.uav.platform.modules.sar.mapper;

import com.uav.platform.modules.sar.config.response.AiDetectionResponse;
import com.uav.platform.modules.sar.config.response.AiTaskResponse;
import com.uav.platform.modules.sar.config.response.SarMissionResponse;
import com.uav.platform.modules.sar.entity.AiDetection;
import com.uav.platform.modules.sar.entity.AiTask;
import com.uav.platform.modules.sar.entity.SarMission;

public final class SarMapper {

    private SarMapper() {}

    public static SarMissionResponse toSarMissionResponse(SarMission sar) {
        return new SarMissionResponse(
            sar.getId(),
            sar.getMission().getId(),
            sar.getSearchAreaPolygon(),
            sar.getLkpLatitude(),
            sar.getLkpLongitude(),
            sar.getDriftRadiusMeters(),
            sar.getSarStatus(),
            sar.getEmergencyContact(),
            sar.getVictimCountEstimated(),
            sar.getNotes(),
            sar.getCreatedAt(),
            sar.getUpdatedAt()
        );
    }

    public static AiTaskResponse toAiTaskResponse(AiTask task) {
        return new AiTaskResponse(
            task.getId(),
            task.getMission().getId(),
            task.getMedia() != null ? task.getMedia().getId() : null,
            task.getTaskType(),
            task.getStatus(),
            task.getProcessingNode(),
            task.getConfidenceThreshold(),
            task.getInferenceTimeMs(),
            task.getFps(),
            task.getDpuUtilization(),
            task.getSocTemperature(),
            task.getErrorMessage(),
            task.getCreatedAt(),
            task.getCompletedAt()
        );
    }

    public static AiDetectionResponse toAiDetectionResponse(AiDetection d) {
        return new AiDetectionResponse(
            d.getId(),
            d.getAiTask().getId(),
            d.getMission().getId(),
            d.getLabel(),
            d.getConfidence(),
            d.getBoxTop(),
            d.getBoxLeft(),
            d.getBoxWidth(),
            d.getBoxHeight(),
            d.getLatitude(),
            d.getLongitude(),
            d.getTrackingId(),
            d.getVerified(),
            d.getVerifiedBy(),
            d.getCreatedAt()
        );
    }
}
