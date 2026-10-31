package com.uav.platform.service.impl.user;

import com.uav.platform.dto.request.media.MediaUploadRequest;
import com.uav.platform.dto.request.user.AvatarUploadRequest;
import com.uav.platform.dto.response.media.MediaAssetResponse;
import com.uav.platform.dto.response.media.SignedMediaUrlResponse;
import com.uav.platform.dto.response.user.AvatarResponse;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.audit.AuditAction;
import com.uav.platform.enums.media.MediaType;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.media.MediaAssetRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.media.MediaService;
import com.uav.platform.service.media.ObjectStorageService;
import com.uav.platform.service.permission.PermissionService;
import com.uav.platform.service.user.AvatarService;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Avatars are ordinary media assets without a linked resource, owned by the uploader. The account stores a
 * stable API path ({@code /api/v1/users/{id}/avatar?v={mediaId}}) so any client can use it as an image source;
 * the version parameter changes with every new picture, which keeps browser caches correct.
 */
@Service
@Transactional
@RequiredArgsConstructor
public class AvatarServiceImpl implements AvatarService {
    static final long MAX_BYTES = 5_000_000L;
    static final Set<String> TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final Pattern VERSION = Pattern.compile("[?&]v=(\\d+)");

    private final UserRepository users;
    private final MediaService media;
    private final MediaAssetRepository assets;
    private final ObjectStorageService storage;
    private final PermissionService permissions;
    private final AuditLogService audit;

    @Override
    public SignedMediaUrlResponse uploadUrl(String username, AvatarUploadRequest request) {
        validate(request.contentType(), request.size());
        resolve(username);
        MediaAssetResponse asset =
                media.register(
                        new MediaUploadRequest(
                                request.originalName(),
                                request.contentType(),
                                request.size(),
                                MediaType.IMAGE,
                                null,
                                null),
                        username);
        return media.uploadUrl(asset.id());
    }

    @Override
    public AvatarResponse use(String username, Long mediaId) {
        AppUser user = resolve(username);
        // confirm() checks storage contents and that the caller uploaded this unlinked asset.
        MediaAssetResponse asset = media.confirm(mediaId, username);
        if (asset.linkedEntityType() != null && !asset.linkedEntityType().isBlank())
            throw SystemException.badRequest(
                    "Ảnh đại diện phải là tệp tải lên riêng.", "AVATAR_INVALID");
        validate(asset.contentType(), asset.size());
        Long previous = versionOf(user.getAvatarUrl());
        user.setAvatarUrl(path(user.getId(), mediaId));
        users.save(user);
        if (previous != null && !previous.equals(mediaId)) retire(previous, username);
        audit.record(
                user.getId(),
                username,
                AuditAction.UPDATE,
                "USER_PROFILE",
                user.getId().toString(),
                "AVATAR_UPDATED");
        return new AvatarResponse(user.getAvatarUrl());
    }

    @Override
    public void remove(String username) {
        AppUser user = resolve(username);
        Long previous = versionOf(user.getAvatarUrl());
        if (previous == null && user.getAvatarUrl() == null) return;
        user.setAvatarUrl(null);
        users.save(user);
        if (previous != null) retire(previous, username);
        audit.record(
                user.getId(),
                username,
                AuditAction.UPDATE,
                "USER_PROFILE",
                user.getId().toString(),
                "AVATAR_REMOVED");
    }

    @Override
    @Transactional(readOnly = true)
    public String signedUrl(Long userId, Authentication viewer) {
        AppUser user =
                users.findById(userId)
                        .orElseThrow(() -> SystemException.notFound("Avatar not found"));
        boolean self = viewer != null && user.getUsername().equals(viewer.getName());
        if (!self && !permissions.has(viewer, "USER_READ"))
            throw SystemException.notFound("Avatar not found");
        Long mediaId = versionOf(user.getAvatarUrl());
        if (mediaId == null) throw SystemException.notFound("Avatar not found");
        var asset =
                assets.findById(mediaId)
                        .filter(
                                a ->
                                        a.isConfirmed()
                                                && !a.isDeleted()
                                                && user.getUsername().equals(a.getUploadedBy()))
                        .orElseThrow(() -> SystemException.notFound("Avatar not found"));
        return storage.createSignedDownloadUrl(asset.getObjectKey());
    }

    static String path(Long userId, Long mediaId) {
        return "/api/v1/users/" + userId + "/avatar?v=" + mediaId;
    }

    static Long versionOf(String avatarUrl) {
        if (avatarUrl == null) return null;
        Matcher matcher = VERSION.matcher(avatarUrl);
        return matcher.find() ? Long.valueOf(matcher.group(1)) : null;
    }

    private static void validate(String contentType, long size) {
        if (!TYPES.contains(contentType) || size < 1 || size > MAX_BYTES)
            throw SystemException.badRequest(
                    "Ảnh đại diện phải là JPEG, PNG hoặc WebP, tối đa 5 MB.", "AVATAR_INVALID");
    }

    private void retire(Long mediaId, String username) {
        try {
            media.delete(mediaId, username);
        } catch (RuntimeException ignored) {
            // A stale picture left in storage is harmless; never fail the avatar change because of
            // it.
        }
    }

    private AppUser resolve(String username) {
        return users.findByUsername(username)
                .orElseThrow(() -> SystemException.unauthorized("Tài khoản không còn tồn tại."));
    }
}
