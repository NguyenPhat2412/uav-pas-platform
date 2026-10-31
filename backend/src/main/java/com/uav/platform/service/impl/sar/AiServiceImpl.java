package com.uav.platform.service.impl.sar;

import com.uav.platform.dto.request.notification.CreateNotificationRequest;
import com.uav.platform.dto.request.sar.AiTaskDispatchRequest;
import com.uav.platform.dto.request.sar.AiTaskResultRequest;
import com.uav.platform.dto.request.sar.VerifyDetectionRequest;
import com.uav.platform.dto.response.sar.AiDetectionResponse;
import com.uav.platform.dto.response.sar.AiTaskResponse;
import com.uav.platform.entity.media.MediaAsset;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.sar.AiDetection;
import com.uav.platform.entity.sar.AiTask;
import com.uav.platform.enums.notification.NotificationType;
import com.uav.platform.enums.sar.AiTaskStatus;
import com.uav.platform.enums.sar.SarStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.sar.SarMapper;
import com.uav.platform.repository.media.MediaAssetRepository;
import com.uav.platform.repository.mission.MissionRepository;
import com.uav.platform.repository.sar.AiDetectionRepository;
import com.uav.platform.repository.sar.AiTaskRepository;
import com.uav.platform.repository.sar.SarMissionRepository;
import com.uav.platform.service.notification.NotificationService;
import com.uav.platform.service.sar.AiService;
import com.uav.platform.service.webhook.WebhookService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class AiServiceImpl implements AiService {

    private final AiTaskRepository aiTaskRepository;
    private final AiDetectionRepository aiDetectionRepository;
    private final MissionRepository missionRepository;
    private final MediaAssetRepository mediaAssetRepository;
    private final SarMissionRepository sarMissionRepository;
    private final NotificationService notificationService;
    private final WebhookService webhookService;
    private final com.uav.platform.service.permission.PermissionService permissionService;
    private final SarMapper sarMapper;

    public AiServiceImpl(
            AiTaskRepository aiTaskRepository,
            AiDetectionRepository aiDetectionRepository,
            MissionRepository missionRepository,
            MediaAssetRepository mediaAssetRepository) {
        this(
                aiTaskRepository,
                aiDetectionRepository,
                missionRepository,
                mediaAssetRepository,
                null,
                null,
                null,
                null);
    }

    public AiServiceImpl(
            AiTaskRepository aiTaskRepository,
            AiDetectionRepository aiDetectionRepository,
            MissionRepository missionRepository,
            MediaAssetRepository mediaAssetRepository,
            SarMissionRepository sarMissionRepository,
            NotificationService notificationService,
            WebhookService webhookService) {
        this(
                aiTaskRepository,
                aiDetectionRepository,
                missionRepository,
                mediaAssetRepository,
                sarMissionRepository,
                notificationService,
                webhookService,
                null);
    }

    public AiServiceImpl(
            AiTaskRepository aiTaskRepository,
            AiDetectionRepository aiDetectionRepository,
            MissionRepository missionRepository,
            MediaAssetRepository mediaAssetRepository,
            SarMissionRepository sarMissionRepository,
            NotificationService notificationService,
            WebhookService webhookService,
            com.uav.platform.service.permission.PermissionService permissionService) {
        this(
                aiTaskRepository,
                aiDetectionRepository,
                missionRepository,
                mediaAssetRepository,
                sarMissionRepository,
                notificationService,
                webhookService,
                permissionService,
                org.mapstruct.factory.Mappers.getMapper(SarMapper.class));
    }

    @Autowired
    public AiServiceImpl(
            AiTaskRepository aiTaskRepository,
            AiDetectionRepository aiDetectionRepository,
            MissionRepository missionRepository,
            MediaAssetRepository mediaAssetRepository,
            @Autowired(required = false) SarMissionRepository sarMissionRepository,
            @Autowired(required = false) NotificationService notificationService,
            @Autowired(required = false) WebhookService webhookService,
            @Autowired(required = false)
                    com.uav.platform.service.permission.PermissionService permissionService,
            SarMapper sarMapper) {
        this.aiTaskRepository = aiTaskRepository;
        this.aiDetectionRepository = aiDetectionRepository;
        this.missionRepository = missionRepository;
        this.mediaAssetRepository = mediaAssetRepository;
        this.sarMissionRepository = sarMissionRepository;
        this.notificationService = notificationService;
        this.webhookService = webhookService;
        this.permissionService = permissionService;
        this.sarMapper = sarMapper;
    }

    private void requireMissionAccess(
            Mission mission, Authentication auth, boolean requireOperationalAuthority) {
        if (mission == null || auth == null || permissionService == null) {
            return;
        }
        if (permissionService.has(auth, "MISSION_VIEW_ALL")
                || permissionService.has(auth, "USER_MANAGE")) {
            return;
        }
        String actor = auth.getName();
        boolean isOperator =
                mission.getOperator() != null
                        && java.util.Objects.equals(mission.getOperator().getUsername(), actor);
        boolean isCustomer =
                mission.getCustomer() != null
                        && java.util.Objects.equals(mission.getCustomer().getUsername(), actor);
        if (!isOperator && !isCustomer) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "You do not have permission to access this mission");
        }
        if (requireOperationalAuthority
                && !isOperator
                && !permissionService.has(auth, "MISSION_STATUS_UPDATE")) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Only assigned operators or commanders can verify AI detections");
        }
    }

    @Override
    public AiTaskResponse dispatchTask(
            AiTaskDispatchRequest request, Authentication authentication) {
        Mission mission =
                missionRepository
                        .findById(request.missionId())
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "Mission not found with id: "
                                                        + request.missionId()));
        requireMissionAccess(mission, authentication, false);

        MediaAsset media = null;
        if (request.mediaId() != null) {
            media = mediaAssetRepository.findById(request.mediaId()).orElse(null);
            if (media != null
                    && authentication != null
                    && permissionService != null
                    && !permissionService.has(authentication, "MEDIA_MANAGE")
                    && !permissionService.has(authentication, "MISSION_VIEW_ALL")) {
                boolean linkedToMission =
                        "MISSION".equals(media.getLinkedEntityType())
                                && java.util.Objects.equals(
                                        String.valueOf(mission.getId()), media.getLinkedEntityId());
                boolean uploadedByActor =
                        java.util.Objects.equals(media.getUploadedBy(), authentication.getName());
                if (!linkedToMission && !uploadedByActor) {
                    throw new org.springframework.security.access.AccessDeniedException(
                            "You do not have permission to attach this media asset");
                }
            }
        }

        AiTask task =
                AiTaskOperations.create(
                        mission,
                        media,
                        request.taskType(),
                        request.processingNode(),
                        request.confidenceThreshold());

        // Inference runs on the KV260 edge board or the cloud worker; it reports back via
        // submitResults.
        AiTask savedTask = aiTaskRepository.save(task);
        return sarMapper.toAiTaskResponse(savedTask);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AiDetectionResponse> listDetections(Long missionId, Authentication authentication) {
        if (authentication != null && permissionService != null) {
            Mission mission =
                    missionRepository
                            .findById(missionId)
                            .orElseThrow(
                                    () ->
                                            SystemException.notFound(
                                                    "Mission not found with id: " + missionId));
            requireMissionAccess(mission, authentication, false);
        }
        return aiDetectionRepository.findByMissionIdOrderByCreatedAtDesc(missionId).stream()
                .map(sarMapper::toAiDetectionResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AiTaskResponse> listTasks(Long missionId, Authentication authentication) {
        if (authentication != null && permissionService != null) {
            Mission mission =
                    missionRepository
                            .findById(missionId)
                            .orElseThrow(
                                    () ->
                                            SystemException.notFound(
                                                    "Mission not found with id: " + missionId));
            requireMissionAccess(mission, authentication, false);
        }
        return aiTaskRepository.findByMissionIdOrderByCreatedAtDesc(missionId).stream()
                .map(sarMapper::toAiTaskResponse)
                .toList();
    }

    @Override
    public AiTaskResponse submitResults(
            Long taskId, AiTaskResultRequest request, Authentication authentication) {
        // Row lock: a retried edge-node submission waits, then sees the finished task and stops.
        AiTask task =
                aiTaskRepository
                        .findByIdForUpdate(taskId)
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "AI task not found with id: " + taskId));
        if (task.getStatus() == AiTaskStatus.COMPLETED || task.getStatus() == AiTaskStatus.FAILED)
            throw SystemException.conflict("AI_TASK_ALREADY_FINISHED");
        boolean failed = "FAILED".equals(request.status());
        task.setStatus(failed ? AiTaskStatus.FAILED : AiTaskStatus.COMPLETED);
        task.setInferenceTimeMs(request.inferenceTimeMs());
        task.setFps(request.fps());
        task.setDpuUtilization(request.dpuUtilization());
        task.setSocTemperature(request.socTemperature());
        task.setErrorMessage(failed ? request.errorMessage() : null);
        task.setCompletedAt(LocalDateTime.now());
        AiTask saved = aiTaskRepository.save(task);

        Mission mission = saved.getMission();
        List<AiDetection> detections =
                failed || request.detections() == null
                        ? List.of()
                        : request.detections().stream()
                                .map(
                                        d ->
                                                new AiDetection(
                                                        saved,
                                                        mission,
                                                        d.label().trim(),
                                                        d.confidence(),
                                                        d.boxTop(),
                                                        d.boxLeft(),
                                                        d.boxWidth(),
                                                        d.boxHeight(),
                                                        d.latitude(),
                                                        d.longitude(),
                                                        d.trackingId()))
                                .toList();
        aiDetectionRepository.saveAll(detections);

        if (!detections.isEmpty()
                && notificationService != null
                && mission.getCustomer() != null
                && mission.getCustomer().getId() != null) {
            try {
                notificationService.sendNotification(
                        new CreateNotificationRequest(
                                mission.getCustomer().getId(),
                                "AI detections - Mission " + mission.getCode(),
                                detections.size()
                                        + " candidate(s) reported by "
                                        + saved.getProcessingNode(),
                                NotificationType.SAR_TARGET_FOUND,
                                "MISSION",
                                mission.getId()));
            } catch (RuntimeException ignored) {
            }
        }
        return sarMapper.toAiTaskResponse(saved);
    }

    @Override
    public AiDetectionResponse verifyDetection(
            Long detectionId, VerifyDetectionRequest request, Authentication authentication) {
        AiDetection det =
                aiDetectionRepository
                        .findById(detectionId)
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "AI Detection not found with id: " + detectionId));
        requireMissionAccess(det.getMission(), authentication, true);

        det.setVerified(request.verified());
        String verifier = authentication != null ? authentication.getName() : "OPERATOR";
        det.setVerifiedBy(verifier);
        AiDetection saved = aiDetectionRepository.save(det);

        if (Boolean.TRUE.equals(request.verified()) && saved.getMission() != null) {
            Mission mission = saved.getMission();
            if (sarMissionRepository != null && mission.getId() != null) {
                sarMissionRepository
                        .findByMissionId(mission.getId())
                        .ifPresent(
                                sar -> {
                                    sar.setSarStatus(SarStatus.TARGET_LOCATED);
                                    sarMissionRepository.save(sar);
                                });
            }
            if (notificationService != null
                    && mission.getCustomer() != null
                    && mission.getCustomer().getId() != null) {
                try {
                    notificationService.sendNotification(
                            new CreateNotificationRequest(
                                    mission.getCustomer().getId(),
                                    "SAR Target Verified - " + saved.getLabel(),
                                    "Verified by "
                                            + verifier
                                            + " at ("
                                            + saved.getLatitude()
                                            + ", "
                                            + saved.getLongitude()
                                            + ")",
                                    NotificationType.SAR_TARGET_FOUND,
                                    "MISSION",
                                    mission.getId()));
                } catch (RuntimeException ignored) {
                }
            }
            if (webhookService != null) {
                Map<String, Object> data = new java.util.HashMap<>();
                data.put("detectionId", saved.getId());
                data.put("missionId", mission.getId());
                data.put("label", saved.getLabel());
                data.put("confidence", saved.getConfidence());
                if (saved.getLatitude() != null) data.put("latitude", saved.getLatitude());
                if (saved.getLongitude() != null) data.put("longitude", saved.getLongitude());
                data.put("verifiedBy", verifier);
                webhookService.broadcastEvent("SAR_EMERGENCY_TRIGGERED", data);
            }
        }

        return sarMapper.toAiDetectionResponse(saved);
    }
}
