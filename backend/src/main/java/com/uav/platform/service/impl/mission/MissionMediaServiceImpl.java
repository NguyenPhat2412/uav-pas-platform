package com.uav.platform.service.impl.mission;

import com.uav.platform.dto.request.mission.*;
import com.uav.platform.dto.response.mission.*;
import com.uav.platform.entity.media.MediaAsset;
import com.uav.platform.entity.mission.*;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.audit.AuditAction;
import com.uav.platform.enums.mission.*;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.mission.MissionMediaMapper;
import com.uav.platform.repository.media.MediaAssetRepository;
import com.uav.platform.repository.mission.MissionMediaRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.mission.MissionAccessService;
import com.uav.platform.service.mission.MissionEventService;
import com.uav.platform.service.mission.MissionMediaService;
import com.uav.platform.service.permission.PermissionService;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Mission attachments with the mission lock acquired before the media lock. */
@Service
@Transactional
@RequiredArgsConstructor
public class MissionMediaServiceImpl implements MissionMediaService {
    private final PermissionService permissions;
    private final AuditLogService audit;
    private final MediaAssetRepository mediaAssets;
    private final com.uav.platform.service.media.MediaAccessService mediaAccess;
    private final MissionMediaRepository missionMedia;
    private final MissionAccessService access;
    private final MissionEventService missionEvents;
    private final MissionMediaMapper missionMediaMapper;

    @Override
    public MissionMediaResponse attachMedia(
            Long id, MissionMediaRequest request, Authentication authentication) {
        if (!permissions.has(authentication, "MISSION_MEDIA_UPLOAD")) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Mission media upload is not permitted");
        }
        Mission mission = access.accessibleForUpdate(id, authentication);
        MissionOperations.requireMediaWritable(mission);
        if (missionMedia.existsByMissionIdAndMediaId(id, request.mediaId()))
            throw SystemException.conflict("Media already attached");
        MediaAsset media =
                mediaAssets
                        .findByIdForUpdate(request.mediaId())
                        .orElseThrow(() -> SystemException.notFound("Media not found"));
        if (media.isDeleted() || !media.isConfirmed())
            throw SystemException.conflict("Media upload must be confirmed before attachment");
        // Reject a foreign mission before authorization can acquire a second mission lock.
        if ("MISSION".equals(media.getLinkedEntityType())
                && !id.toString().equals(media.getLinkedEntityId()))
            throw new org.springframework.security.access.AccessDeniedException(
                    "Media belongs to another mission");
        if (mediaAccess != null) mediaAccess.requireFile(media, authentication.getName(), true);
        AppUser actor = access.user(authentication.getName());
        MissionMedia link =
                missionMedia.save(new MissionMedia(mission, media, request.mediaRole(), actor));
        missionEvents.record(
                mission,
                MissionEventType.MEDIA_ATTACHED,
                authentication,
                mission.getStatus(),
                mission.getStatus(),
                "Media attached");
        audit.record(
                actor.getId(),
                authentication.getName(),
                AuditAction.UPLOAD,
                "MISSION_MEDIA",
                id.toString(),
                media.getId().toString());
        return missionMediaMapper.toResponse(link);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MissionMediaResponse> listMedia(Long id, Authentication authentication) {
        Mission mission = access.accessible(id, authentication);
        return missionMedia.findByMissionIdOrderByCreatedAtAsc(mission.getId()).stream()
                .map(missionMediaMapper::toResponse)
                .toList();
    }
}
