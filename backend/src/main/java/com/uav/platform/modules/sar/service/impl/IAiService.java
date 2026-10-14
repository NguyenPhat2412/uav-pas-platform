package com.uav.platform.modules.sar.service.impl;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.media.entity.MediaAsset;
import com.uav.platform.modules.media.repository.MediaAssetRepository;
import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.notification.common.NotificationType;
import com.uav.platform.modules.notification.config.request.CreateNotificationRequest;
import com.uav.platform.modules.notification.service.NotificationService;
import com.uav.platform.modules.sar.common.AiTaskStatus;
import com.uav.platform.modules.sar.common.ProcessingNode;
import com.uav.platform.modules.sar.common.SarStatus;
import com.uav.platform.modules.sar.config.request.AiTaskDispatchRequest;
import com.uav.platform.modules.sar.config.request.VerifyDetectionRequest;
import com.uav.platform.modules.sar.config.response.AiDetectionResponse;
import com.uav.platform.modules.sar.config.response.AiTaskResponse;
import com.uav.platform.modules.sar.entity.AiDetection;
import com.uav.platform.modules.sar.entity.AiTask;
import com.uav.platform.modules.sar.mapper.SarMapper;
import com.uav.platform.modules.sar.repository.AiDetectionRepository;
import com.uav.platform.modules.sar.repository.AiTaskRepository;
import com.uav.platform.modules.sar.repository.SarMissionRepository;
import com.uav.platform.modules.sar.service.AiService;
import com.uav.platform.modules.webhook.service.WebhookService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class IAiService implements AiService {

    private final AiTaskRepository aiTaskRepository;
    private final AiDetectionRepository aiDetectionRepository;
    private final MissionRepository missionRepository;
    private final MediaAssetRepository mediaAssetRepository;
    private final SarMissionRepository sarMissionRepository;
    private final NotificationService notificationService;
    private final WebhookService webhookService;
    private final com.uav.platform.modules.user.service.PermissionService permissionService;

    public IAiService(AiTaskRepository aiTaskRepository,
                      AiDetectionRepository aiDetectionRepository,
                      MissionRepository missionRepository,
                      MediaAssetRepository mediaAssetRepository) {
        this(aiTaskRepository, aiDetectionRepository, missionRepository, mediaAssetRepository, null, null, null, null);
    }

    public IAiService(AiTaskRepository aiTaskRepository,
                      AiDetectionRepository aiDetectionRepository,
                      MissionRepository missionRepository,
                      MediaAssetRepository mediaAssetRepository,
                      SarMissionRepository sarMissionRepository,
                      NotificationService notificationService,
                      WebhookService webhookService) {
        this(aiTaskRepository, aiDetectionRepository, missionRepository, mediaAssetRepository, sarMissionRepository, notificationService, webhookService, null);
    }

    @Autowired
    public IAiService(AiTaskRepository aiTaskRepository,
                      AiDetectionRepository aiDetectionRepository,
                      MissionRepository missionRepository,
                      MediaAssetRepository mediaAssetRepository,
                      @Autowired(required = false) SarMissionRepository sarMissionRepository,
                      @Autowired(required = false) NotificationService notificationService,
                      @Autowired(required = false) WebhookService webhookService,
                      @Autowired(required = false) com.uav.platform.modules.user.service.PermissionService permissionService) {
        this.aiTaskRepository = aiTaskRepository;
        this.aiDetectionRepository = aiDetectionRepository;
        this.missionRepository = missionRepository;
        this.mediaAssetRepository = mediaAssetRepository;
        this.sarMissionRepository = sarMissionRepository;
        this.notificationService = notificationService;
        this.webhookService = webhookService;
        this.permissionService = permissionService;
    }

    private void requireMissionAccess(Mission mission, Authentication auth, boolean requireOperationalAuthority) {
        if (mission == null || auth == null || permissionService == null) {
            return;
        }
        if (permissionService.has(auth, "MISSION_VIEW_ALL") || permissionService.has(auth, "USER_MANAGE")) {
            return;
        }
        String actor = auth.getName();
        boolean isOperator = mission.getOperator() != null && java.util.Objects.equals(mission.getOperator().getUsername(), actor);
        boolean isCustomer = mission.getCustomer() != null && java.util.Objects.equals(mission.getCustomer().getUsername(), actor);
        if (!isOperator && !isCustomer) {
            throw new org.springframework.security.access.AccessDeniedException("You do not have permission to access this mission");
        }
        if (requireOperationalAuthority && !isOperator && !permissionService.has(auth, "MISSION_STATUS_UPDATE")) {
            throw new org.springframework.security.access.AccessDeniedException("Only assigned operators or commanders can verify AI detections");
        }
    }

    @Override
    public AiTaskResponse dispatchTask(AiTaskDispatchRequest request, Authentication authentication) {
        Mission mission = missionRepository.findById(request.missionId())
            .orElseThrow(() -> SystemException.notFound("Mission not found with id: " + request.missionId()));
        requireMissionAccess(mission, authentication, false);

        MediaAsset media = null;
        if (request.mediaId() != null) {
            media = mediaAssetRepository.findById(request.mediaId()).orElse(null);
            if (media != null && authentication != null && permissionService != null
                    && !permissionService.has(authentication, "MEDIA_MANAGE")
                    && !permissionService.has(authentication, "MISSION_VIEW_ALL")) {
                boolean linkedToMission = "MISSION".equals(media.getLinkedEntityType())
                        && java.util.Objects.equals(String.valueOf(mission.getId()), media.getLinkedEntityId());
                boolean uploadedByActor = java.util.Objects.equals(media.getUploadedBy(), authentication.getName());
                if (!linkedToMission && !uploadedByActor) {
                    throw new org.springframework.security.access.AccessDeniedException("You do not have permission to attach this media asset");
                }
            }
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

        if (notificationService != null && mission.getCustomer() != null && mission.getCustomer().getId() != null) {
            try {
                notificationService.sendNotification(new CreateNotificationRequest(
                    mission.getCustomer().getId(),
                    "KV260 Edge AI Completed - Mission " + mission.getCode(),
                    "Detected 2 high-confidence SAR candidates on " + savedTask.getProcessingNode(),
                    NotificationType.SAR_TARGET_FOUND,
                    "MISSION",
                    mission.getId()
                ));
            } catch (RuntimeException ignored) {
            }
        }

        return SarMapper.toAiTaskResponse(savedTask);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AiDetectionResponse> listDetections(Long missionId, Authentication authentication) {
        if (authentication != null && permissionService != null) {
            Mission mission = missionRepository.findById(missionId)
                .orElseThrow(() -> SystemException.notFound("Mission not found with id: " + missionId));
            requireMissionAccess(mission, authentication, false);
        }
        return aiDetectionRepository.findByMissionIdOrderByCreatedAtDesc(missionId)
            .stream()
            .map(SarMapper::toAiDetectionResponse)
            .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AiTaskResponse> listTasks(Long missionId, Authentication authentication) {
        if (authentication != null && permissionService != null) {
            Mission mission = missionRepository.findById(missionId)
                .orElseThrow(() -> SystemException.notFound("Mission not found with id: " + missionId));
            requireMissionAccess(mission, authentication, false);
        }
        return aiTaskRepository.findByMissionIdOrderByCreatedAtDesc(missionId)
            .stream()
            .map(SarMapper::toAiTaskResponse)
            .toList();
    }

    @Override
    public AiDetectionResponse verifyDetection(Long detectionId, VerifyDetectionRequest request, Authentication authentication) {
        AiDetection det = aiDetectionRepository.findById(detectionId)
            .orElseThrow(() -> SystemException.notFound("AI Detection not found with id: " + detectionId));
        requireMissionAccess(det.getMission(), authentication, true);

        det.setVerified(request.verified());
        String verifier = authentication != null ? authentication.getName() : "OPERATOR";
        det.setVerifiedBy(verifier);
        AiDetection saved = aiDetectionRepository.save(det);

        if (Boolean.TRUE.equals(request.verified()) && saved.getMission() != null) {
            Mission mission = saved.getMission();
            if (sarMissionRepository != null && mission.getId() != null) {
                sarMissionRepository.findByMissionId(mission.getId()).ifPresent(sar -> {
                    sar.setSarStatus(SarStatus.TARGET_LOCATED);
                    sarMissionRepository.save(sar);
                });
            }
            if (notificationService != null && mission.getCustomer() != null && mission.getCustomer().getId() != null) {
                try {
                    notificationService.sendNotification(new CreateNotificationRequest(
                        mission.getCustomer().getId(),
                        "SAR Target Verified - " + saved.getLabel(),
                        "Verified by " + verifier + " at (" + saved.getLatitude() + ", " + saved.getLongitude() + ")",
                        NotificationType.SAR_TARGET_FOUND,
                        "MISSION",
                        mission.getId()
                    ));
                } catch (RuntimeException ignored) {
                }
            }
            if (webhookService != null) {
                webhookService.broadcastEvent("SAR_EMERGENCY_TRIGGERED", Map.of(
                    "detectionId", saved.getId() != null ? saved.getId() : detectionId,
                    "missionId", mission.getId() != null ? mission.getId() : 0L,
                    "label", saved.getLabel() != null ? saved.getLabel() : "Person",
                    "confidence", saved.getConfidence() != null ? saved.getConfidence() : 0.94,
                    "latitude", saved.getLatitude() != null ? saved.getLatitude() : 20.7284,
                    "longitude", saved.getLongitude() != null ? saved.getLongitude() : 107.0512,
                    "verifiedBy", verifier
                ));
            }
        }

        return SarMapper.toAiDetectionResponse(saved);
    }
}
