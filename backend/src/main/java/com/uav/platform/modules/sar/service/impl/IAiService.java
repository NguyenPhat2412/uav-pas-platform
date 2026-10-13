package com.uav.platform.modules.sar.service.impl;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.media.entity.MediaAsset;
import com.uav.platform.modules.media.repository.MediaAssetRepository;
import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.sar.common.AiTaskStatus;
import com.uav.platform.modules.sar.common.ProcessingNode;
import com.uav.platform.modules.sar.config.request.AiTaskDispatchRequest;
import com.uav.platform.modules.sar.config.request.VerifyDetectionRequest;
import com.uav.platform.modules.sar.config.response.AiDetectionResponse;
import com.uav.platform.modules.sar.config.response.AiTaskResponse;
import com.uav.platform.modules.sar.entity.AiDetection;
import com.uav.platform.modules.sar.entity.AiTask;
import com.uav.platform.modules.sar.repository.AiDetectionRepository;
import com.uav.platform.modules.sar.repository.AiTaskRepository;
import com.uav.platform.modules.sar.service.AiService;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class IAiService implements AiService {

    private final AiTaskRepository aiTaskRepository;
    private final AiDetectionRepository aiDetectionRepository;
    private final MissionRepository missionRepository;
    private final MediaAssetRepository mediaAssetRepository;

    public IAiService(AiTaskRepository aiTaskRepository,
                      AiDetectionRepository aiDetectionRepository,
                      MissionRepository missionRepository,
                      MediaAssetRepository mediaAssetRepository) {
        this.aiTaskRepository = aiTaskRepository;
        this.aiDetectionRepository = aiDetectionRepository;
        this.missionRepository = missionRepository;
        this.mediaAssetRepository = mediaAssetRepository;
    }

    @Override
    public AiTaskResponse dispatchTask(AiTaskDispatchRequest request, Authentication authentication) {
        Mission mission = missionRepository.findById(request.missionId())
            .orElseThrow(() -> SystemException.notFound("Mission not found with id: " + request.missionId()));

        MediaAsset media = null;
        if (request.mediaId() != null) {
            media = mediaAssetRepository.findById(request.mediaId()).orElse(null);
        }

        AiTask task = new AiTask(
            mission,
            media,
            request.taskType(),
            request.processingNode(),
            request.confidenceThreshold()
        );

        // Execute inference simulation (YOLOv8s-Int8 on KV260 Edge or Cloud GPU)
        boolean isEdge = task.getProcessingNode() == ProcessingNode.KV260_EDGE;
        task.setStatus(AiTaskStatus.COMPLETED);
        task.setInferenceTimeMs(isEdge ? 35 : 18);
        task.setFps(isEdge ? 28.6 : 55.4);
        task.setDpuUtilization(isEdge ? 68.0 : null);
        task.setSocTemperature(isEdge ? 54.2 : null);
        task.setCompletedAt(LocalDateTime.now());

        AiTask savedTask = aiTaskRepository.save(task);

        // Generate and persist detection candidates for this mission
        double baseLat = mission.getLatitude() != null ? mission.getLatitude().doubleValue() : 20.7284;
        double baseLng = mission.getLongitude() != null ? mission.getLongitude().doubleValue() : 107.0512;

        AiDetection det1 = new AiDetection(
            savedTask, mission, "Person (Nạn nhân)", 0.94,
            38.0, 42.0, 9.0, 16.0,
            baseLat, baseLng, "TRK-101"
        );
        AiDetection det2 = new AiDetection(
            savedTask, mission, "Lifebuoy (Phao cứu sinh)", 0.91,
            48.0, 54.0, 8.0, 9.0,
            baseLat + 0.0002, baseLng + 0.0005, "TRK-102"
        );

        aiDetectionRepository.saveAll(List.of(det1, det2));

        return toTaskResponse(savedTask);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AiDetectionResponse> listDetections(Long missionId, Authentication authentication) {
        return aiDetectionRepository.findByMissionIdOrderByCreatedAtDesc(missionId)
            .stream()
            .map(this::toDetectionResponse)
            .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AiTaskResponse> listTasks(Long missionId, Authentication authentication) {
        return aiTaskRepository.findByMissionIdOrderByCreatedAtDesc(missionId)
            .stream()
            .map(this::toTaskResponse)
            .toList();
    }

    @Override
    public AiDetectionResponse verifyDetection(Long detectionId, VerifyDetectionRequest request, Authentication authentication) {
        AiDetection det = aiDetectionRepository.findById(detectionId)
            .orElseThrow(() -> SystemException.notFound("AI Detection not found with id: " + detectionId));

        det.setVerified(request.verified());
        det.setVerifiedBy(authentication != null ? authentication.getName() : "OPERATOR");
        AiDetection saved = aiDetectionRepository.save(det);
        return toDetectionResponse(saved);
    }

    private AiTaskResponse toTaskResponse(AiTask task) {
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

    private AiDetectionResponse toDetectionResponse(AiDetection d) {
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
