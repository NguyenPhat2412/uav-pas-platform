package com.uav.platform.modules.media.service.impl;

import com.uav.platform.modules.media.mapper.MediaMapper;

import com.uav.platform.modules.audit.common.AuditAction;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.media.config.request.*;
import com.uav.platform.modules.media.config.response.*;
import com.uav.platform.modules.media.entity.MediaAsset;
import com.uav.platform.modules.media.repository.MediaAssetRepository;
import com.uav.platform.modules.media.service.MediaService;
import com.uav.platform.modules.media.service.ObjectStorageService;
import com.uav.platform.modules.media.specification.MediaAssetSpecifications;
import com.uav.platform.modules.mission.repository.MissionMediaRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional
public class IMediaService implements MediaService {
    private final MediaAssetRepository repository;
    private final ObjectStorageService storage;
    private final AuditLogService audit;
    private final MissionMediaRepository missionMedia;
    private final com.uav.platform.modules.media.service.MediaAccessService access;
    public IMediaService(MediaAssetRepository repository, ObjectStorageService storage, AuditLogService audit) { this(repository, storage, audit, null, null); }
    @org.springframework.beans.factory.annotation.Autowired
    public IMediaService(MediaAssetRepository repository, ObjectStorageService storage, AuditLogService audit, @org.springframework.beans.factory.annotation.Autowired(required = false) MissionMediaRepository missionMedia, com.uav.platform.modules.media.service.MediaAccessService access) { this.repository = repository; this.storage = storage; this.audit = audit; this.missionMedia = missionMedia; this.access = access; }
    @Override @Transactional(readOnly = true)
    public PageResponse<MediaAssetResponse> list(Pageable pageable) {
        String actor = currentActor();
        Specification<MediaAsset> scope = Specification.where(MediaAssetSpecifications.isDeleted(false));
        if (access == null) {
            return PageResponse.from(repository.findAll(scope, pageable), MediaMapper::toResponse);
        }
        var candidates = repository.findAll(scope, pageable.getSort());
        var visible = new java.util.ArrayList<MediaAsset>();
        for (MediaAsset asset : candidates) {
            if (access == null) {
                visible.add(asset);
                continue;
            }
            try {
                access.requireFile(asset, actor, false);
                visible.add(asset);
            } catch (org.springframework.security.access.AccessDeniedException ignored) {
                // Resource-level authorization is intentionally enforced after the database scope.
            }
        }
        int start = (int) Math.min(pageable.getOffset(), visible.size());
        int end = Math.min(start + pageable.getPageSize(), visible.size());
        return PageResponse.from(new PageImpl<>(visible.subList(start, end), pageable, visible.size()), MediaMapper::toResponse);
    }
    @Override
    public MediaAssetResponse register(MediaUploadRequest request, String actor) {
        if(access!=null) access.requireLink(request.linkedEntityType(), request.linkedEntityId(), actor, true);
        String objectKey = request.type().name().toLowerCase() + "/" + UUID.randomUUID() + "-" + request.originalName().replaceAll("[^a-zA-Z0-9._-]", "_");
        MediaAsset asset = repository.save(new MediaAsset(request.originalName(), objectKey, request.contentType(), request.size(), request.type(), request.linkedEntityType(), request.linkedEntityId(), actor, storage.provider()));
        audit.record(null, actor, AuditAction.UPLOAD, "MEDIA", asset.getId().toString(), objectKey);
        return MediaMapper.toResponse(asset);
    }
    @Override @Transactional(readOnly = true)
    public SignedMediaUrlResponse uploadUrl(Long id) { MediaAsset asset = find(id); requireAccess(asset, currentActor(), true); if(asset.isConfirmed()) throw SystemException.conflict("Confirmed media cannot be overwritten"); return new SignedMediaUrlResponse(id, storage.createSignedUploadUrl(asset.getObjectKey(), asset.getContentType()), "upload", 900); }
    @Override
    public SignedMediaUrlResponse downloadUrl(Long id, String actor) { MediaAsset asset = find(id); requireAccess(asset,actor,false); if (!asset.isConfirmed()) throw SystemException.conflict("Media upload is not confirmed"); audit.record(null, actor, AuditAction.DOWNLOAD, "MEDIA", id.toString(), asset.getObjectKey()); return new SignedMediaUrlResponse(id, storage.createSignedDownloadUrl(asset.getObjectKey()), "download", 900); }
    @Override
    public MediaAssetResponse confirm(Long id, String actor) { MediaAsset asset = find(id); requireAccess(asset,actor,true); if(asset.isConfirmed()) return MediaMapper.toResponse(asset); if (!storage.objectExists(asset.getObjectKey())) throw SystemException.conflict("Media object is not present in storage"); var metadata=storage.metadata(asset.getObjectKey());
        if(metadata == null || metadata.size()!=asset.getSize() || !java.util.Objects.equals(metadata.contentType(),asset.getContentType())) throw SystemException.conflict("Storage object metadata differs from registered upload");
        asset.confirm(); audit.record(null, actor, AuditAction.UPDATE, "MEDIA", id.toString(), "CONFIRMED"); return MediaMapper.toResponse(asset); }
    @Override
    public void delete(Long id, String actor) { MediaAsset asset = repository.findById(id).orElseThrow(() -> SystemException.notFound("Media asset not found")); requireAccess(asset,actor,true); if(asset.isDeleted()) { scheduleDelete(asset); return; } if (missionMedia != null && missionMedia.existsByMediaId(id)) throw SystemException.conflict("Media is attached to a mission"); asset.markDeleted(); repository.save(asset);
        scheduleDelete(asset);
        audit.record(null, actor, AuditAction.DELETE, "MEDIA", id.toString(), asset.getObjectKey()); }
    private void scheduleDelete(MediaAsset asset) {
        Runnable cleanup = () -> {
            try { storage.deleteObject(asset.getObjectKey()); }
            catch(RuntimeException ex) { org.slf4j.LoggerFactory.getLogger(IMediaService.class).warn("Object cleanup pending for media {}",asset.getId()); }
        };
        if (org.springframework.transaction.support.TransactionSynchronizationManager.isSynchronizationActive()) {
            org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(new org.springframework.transaction.support.TransactionSynchronization() {
                @Override public void afterCommit() { cleanup.run(); }
            });
        } else { cleanup.run(); }
    }
    @Override public MediaAssetResponse confirmMission(Long id, Long missionId, String actor) {
        MediaAsset asset=find(id);
        if(!"MISSION".equals(asset.getLinkedEntityType()) || !missionId.toString().equals(asset.getLinkedEntityId())) throw new org.springframework.security.access.AccessDeniedException("Media is not linked to this mission");
        return confirm(id,actor);
    }
    private String currentActor() { var auth=org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication(); return auth==null?null:auth.getName(); }
    private void requireAccess(MediaAsset asset,String actor,boolean write) { if(access!=null) access.requireFile(asset,actor,write); }
    private MediaAsset find(Long id) { return repository.findById(id).filter(asset -> !asset.isDeleted()).orElseThrow(() -> SystemException.notFound("Media asset not found")); }
}
