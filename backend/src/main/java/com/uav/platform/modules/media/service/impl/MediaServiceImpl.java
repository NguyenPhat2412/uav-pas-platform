package com.uav.platform.modules.media.service.impl;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.audit.enums.AuditAction;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.media.dto.request.*;
import com.uav.platform.modules.media.dto.response.*;
import com.uav.platform.modules.media.entity.MediaAsset;
import com.uav.platform.modules.media.mapper.MediaMapper;
import com.uav.platform.modules.media.repository.MediaAssetRepository;
import com.uav.platform.modules.media.service.MediaService;
import com.uav.platform.modules.media.service.ObjectStorageService;
import com.uav.platform.modules.media.specification.MediaAssetSpecifications;
import com.uav.platform.modules.mission.repository.MissionMediaRepository;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional
public class MediaServiceImpl implements MediaService {
    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager entityManager;
    private final MediaAssetRepository repository;
    private final ObjectStorageService storage;
    private final AuditLogService audit;
    private final MissionMediaRepository missionMedia;
    private final com.uav.platform.modules.media.service.MediaAccessService access;
    private final MediaMapper mediaMapper;

    public MediaServiceImpl(
            MediaAssetRepository repository, ObjectStorageService storage, AuditLogService audit) {
        this(repository, storage, audit, null, null);
    }

    public MediaServiceImpl(
            MediaAssetRepository repository,
            ObjectStorageService storage,
            AuditLogService audit,
            MissionMediaRepository missionMedia,
            com.uav.platform.modules.media.service.MediaAccessService access) {
        this(
                repository,
                storage,
                audit,
                missionMedia,
                access,
                org.mapstruct.factory.Mappers.getMapper(MediaMapper.class));
    }

    @org.springframework.beans.factory.annotation.Autowired
    public MediaServiceImpl(
            MediaAssetRepository repository,
            ObjectStorageService storage,
            AuditLogService audit,
            @org.springframework.beans.factory.annotation.Autowired(required = false)
                    MissionMediaRepository missionMedia,
            com.uav.platform.modules.media.service.MediaAccessService access,
            MediaMapper mediaMapper) {
        this.repository = repository;
        this.storage = storage;
        this.audit = audit;
        this.missionMedia = missionMedia;
        this.access = access;
        this.mediaMapper = mediaMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MediaAssetResponse> list(Pageable pageable) {
        String actor = currentActor();
        Specification<MediaAsset> scope =
                Specification.where(MediaAssetSpecifications.isDeleted(false));
        if (access != null) scope = scope.and(access.readableBy(actor));
        if (pageable.isPaged() && pageable.getSort().getOrderFor("id") == null) {
            pageable =
                    PageRequest.of(
                            pageable.getPageNumber(),
                            pageable.getPageSize(),
                            pageable.getSort().and(Sort.by("id")));
        }
        return PageResponse.from(repository.findAll(scope, pageable), mediaMapper::toResponse);
    }

    @Override
    public MediaAssetResponse register(MediaUploadRequest request, String actor) {
        com.uav.platform.modules.media.service.MediaUploadPolicy.validate(
                request.contentType(), request.size());
        if (access != null)
            access.requireLink(request.linkedEntityType(), request.linkedEntityId(), actor, true);
        String objectKey =
                request.type().name().toLowerCase()
                        + "/"
                        + UUID.randomUUID()
                        + "-"
                        + request.originalName().replaceAll("[^a-zA-Z0-9._-]", "_");
        MediaAsset asset =
                repository.save(
                        new MediaAsset(
                                request.originalName(),
                                objectKey,
                                request.contentType(),
                                request.size(),
                                request.type(),
                                request.linkedEntityType(),
                                request.linkedEntityId(),
                                actor,
                                storage.provider()));
        audit.record(null, actor, AuditAction.UPLOAD, "MEDIA", asset.getId().toString(), objectKey);
        return mediaMapper.toResponse(asset);
    }

    @Override
    public SignedMediaUrlResponse uploadUrl(Long id) {
        MediaAsset asset = find(id);
        requireAccess(asset, currentActor(), true);
        if (asset.isDeleted()) throw SystemException.notFound("Media asset not found");
        if (asset.isConfirmed())
            throw SystemException.conflict("Confirmed media cannot be overwritten");
        com.uav.platform.modules.media.service.MediaUploadPolicy.requireCurrent(
                asset.getCreatedAt());
        com.uav.platform.modules.media.service.MediaUploadPolicy.validate(
                asset.getContentType(), asset.getSize());
        long seconds =
                asset.getCreatedAt() == null
                        ? 900
                        : Math.min(
                                900,
                                java.time.Duration.between(
                                                java.time.LocalDateTime.now(),
                                                asset.getCreatedAt().plusHours(24))
                                        .getSeconds());
        if (seconds < 1)
            throw SystemException.conflict(
                    "Tệp chưa xác nhận đã hết hạn sau 24 giờ. Vui lòng tải lại tệp.");
        MediaAssetOperations.recordUploadUntil(
                asset, java.time.LocalDateTime.now().plusSeconds(seconds));
        return new SignedMediaUrlResponse(
                id,
                storage.createSignedUploadUrl(
                        asset.getObjectKey(),
                        asset.getContentType(),
                        asset.getSize(),
                        java.time.Duration.ofSeconds(seconds)),
                "upload",
                (int) seconds);
    }

    @Override
    public SignedMediaUrlResponse downloadUrl(Long id, String actor) {
        MediaAsset asset = find(id);
        requireAccess(asset, actor, false);
        if (!asset.isConfirmed()) throw SystemException.conflict("Media upload is not confirmed");
        audit.record(
                null, actor, AuditAction.DOWNLOAD, "MEDIA", id.toString(), asset.getObjectKey());
        return new SignedMediaUrlResponse(
                id, storage.createSignedDownloadUrl(asset.getObjectKey()), "download", 900);
    }

    @Override
    public MediaAssetResponse confirm(Long id, String actor) {
        MediaAsset asset = find(id);
        requireAccess(asset, actor, true);
        if (asset.isDeleted()) throw SystemException.notFound("Media asset not found");
        if (asset.isConfirmed()) return mediaMapper.toResponse(asset);
        com.uav.platform.modules.media.service.MediaUploadPolicy.requireCurrent(
                asset.getCreatedAt());
        com.uav.platform.modules.media.service.MediaUploadPolicy.validate(
                asset.getContentType(), asset.getSize());
        if (!storage.objectExists(asset.getObjectKey()))
            throw SystemException.conflict("Media object is not present in storage");
        var metadata = storage.metadata(asset.getObjectKey());
        if (metadata == null
                || metadata.size() != asset.getSize()
                || !java.util.Objects.equals(metadata.contentType(), asset.getContentType()))
            throw SystemException.conflict(
                    "Storage object metadata differs from registered upload");
        com.uav.platform.modules.media.service.MediaUploadPolicy.validateHeader(
                asset.getContentType(), storage.readHeader(asset.getObjectKey()));
        MediaAssetOperations.confirm(asset);
        audit.record(null, actor, AuditAction.UPDATE, "MEDIA", id.toString(), "CONFIRMED");
        return mediaMapper.toResponse(asset);
    }

    @Override
    public void delete(Long id, String actor) {
        MediaAsset asset =
                repository
                        .findById(id)
                        .orElseThrow(() -> SystemException.notFound("Media asset not found"));
        requireAccess(asset, actor, true);
        if (asset.isDeleted()) {
            scheduleDelete(asset);
            return;
        }
        if (missionMedia != null && missionMedia.existsByMediaId(id))
            throw SystemException.conflict("Media is attached to a mission");
        MediaAssetOperations.markDeleted(asset);
        repository.save(asset);
        scheduleDelete(asset);
        audit.record(null, actor, AuditAction.DELETE, "MEDIA", id.toString(), asset.getObjectKey());
    }

    private void scheduleDelete(MediaAsset asset) {
        MediaAssetOperations.queueDeletion(asset, java.time.LocalDateTime.now());
        repository.save(asset);
        // Persist intent in the caller transaction; the bounded worker resumes it after restart.
    }

    @Override
    public MediaAssetResponse confirmMission(Long id, Long missionId, String actor) {
        MediaAsset asset = find(id);
        if (!"MISSION".equals(asset.getLinkedEntityType())
                || !missionId.toString().equals(asset.getLinkedEntityId()))
            throw new org.springframework.security.access.AccessDeniedException(
                    "Media is not linked to this mission");
        return confirm(id, actor);
    }

    @Override
    public SignedMediaUrlResponse registerMissionUploadUrl(
            Long missionId, MediaUploadRequest request, String actor) {
        var asset =
                register(
                        new MediaUploadRequest(
                                request.originalName(),
                                request.contentType(),
                                request.size(),
                                request.type(),
                                "MISSION",
                                missionId.toString()),
                        actor);
        return uploadUrl(asset.id());
    }

    private String currentActor() {
        var auth =
                org.springframework.security.core.context.SecurityContextHolder.getContext()
                        .getAuthentication();
        return auth == null ? null : auth.getName();
    }

    private void requireAccess(MediaAsset asset, String actor, boolean write) {
        if (access != null) access.requireFile(asset, actor, write);
        // Mission writes serialize on the mission row. Refresh an asset loaded before that lock,
        // otherwise a waiting confirm/delete could act on stale confirmed/deleted flags.
        if (write && entityManager != null && entityManager.contains(asset))
            entityManager.refresh(asset, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
    }

    private MediaAsset find(Long id) {
        return repository
                .findById(id)
                .filter(asset -> !asset.isDeleted())
                .orElseThrow(() -> SystemException.notFound("Media asset not found"));
    }
}
