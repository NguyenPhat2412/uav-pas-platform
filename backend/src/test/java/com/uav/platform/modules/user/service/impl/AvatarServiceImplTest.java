package com.uav.platform.modules.user.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.media.dto.request.MediaUploadRequest;
import com.uav.platform.modules.media.dto.response.MediaAssetResponse;
import com.uav.platform.modules.media.dto.response.SignedMediaUrlResponse;
import com.uav.platform.modules.media.entity.MediaAsset;
import com.uav.platform.modules.media.enums.MediaType;
import com.uav.platform.modules.media.repository.MediaAssetRepository;
import com.uav.platform.modules.media.service.MediaService;
import com.uav.platform.modules.media.service.ObjectStorageService;
import com.uav.platform.modules.media.service.impl.MediaAssetOperations;
import com.uav.platform.modules.permission.service.PermissionService;
import com.uav.platform.modules.user.dto.request.AvatarUploadRequest;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserStatus;
import com.uav.platform.modules.user.repository.UserRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@DisplayName("AvatarServiceImpl")
class AvatarServiceImplTest {
    private final UserRepository users = mock(UserRepository.class);
    private final MediaService media = mock(MediaService.class);
    private final MediaAssetRepository assets = mock(MediaAssetRepository.class);
    private final ObjectStorageService storage = mock(ObjectStorageService.class);
    private final PermissionService permissions = mock(PermissionService.class);
    private final AuditLogService audit = mock(AuditLogService.class);
    private final AvatarServiceImpl service =
            new AvatarServiceImpl(users, media, assets, storage, permissions, audit);
    private AppUser alice;

    @BeforeEach
    void setUp() {
        alice = new AppUser("alice", "alice@example.com", "hash", "0900000000", UserStatus.ACTIVE);
        ReflectionTestUtils.setField(alice, "id", 7L);
        when(users.findByUsername("alice")).thenReturn(Optional.of(alice));
        when(users.findById(7L)).thenReturn(Optional.of(alice));
    }

    private static MediaAssetResponse asset(Long id, String type, long size, String linkedType) {
        return new MediaAssetResponse(id, "me.png", "image/key-" + id, type, size, MediaType.IMAGE, linkedType,
                linkedType == null ? null : "1", "alice", "s3", true, LocalDateTime.now(), LocalDateTime.now());
    }

    private static Authentication as(String username) {
        return UsernamePasswordAuthenticationToken.authenticated(username, null, List.of());
    }

    @Test
    @DisplayName("upload URL: registers an unlinked image owned by the caller")
    void uploadUrlRegistersUnlinkedImage() {
        when(media.register(any(), eq("alice"))).thenReturn(asset(11L, "image/png", 1000, null));
        when(media.uploadUrl(11L)).thenReturn(new SignedMediaUrlResponse(11L, "https://put", "upload", 900));

        var signed = service.uploadUrl("alice", new AvatarUploadRequest("me.png", "image/png", 1000));

        assertThat(signed.url()).isEqualTo("https://put");
        verify(media).register(eq(new MediaUploadRequest("me.png", "image/png", 1000, MediaType.IMAGE, null, null)), eq("alice"));
    }

    @Test
    @DisplayName("upload URL: rejects non-image types and files over 5 MB before touching storage")
    void uploadUrlRejectsWrongTypeOrSize() {
        assertThatThrownBy(() -> service.uploadUrl("alice", new AvatarUploadRequest("a.gif", "image/gif", 1000)))
                .isInstanceOf(SystemException.class);
        assertThatThrownBy(() -> service.uploadUrl("alice", new AvatarUploadRequest("a.pdf", "application/pdf", 1000)))
                .isInstanceOf(SystemException.class);
        assertThatThrownBy(() -> service.uploadUrl("alice", new AvatarUploadRequest("a.png", "image/png", 5_000_001)))
                .isInstanceOf(SystemException.class);
        verify(media, never()).register(any(), anyString());
    }

    @Test
    @DisplayName("use: stores a versioned API path and retires the previous picture")
    void useStoresPathAndRetiresPrevious() {
        alice.setAvatarUrl("/api/v1/users/7/avatar?v=5");
        when(media.confirm(11L, "alice")).thenReturn(asset(11L, "image/webp", 2000, null));

        var response = service.use("alice", 11L);

        assertThat(response.avatarUrl()).isEqualTo("/api/v1/users/7/avatar?v=11");
        assertThat(alice.getAvatarUrl()).isEqualTo("/api/v1/users/7/avatar?v=11");
        verify(media).delete(5L, "alice");
    }

    @Test
    @DisplayName("use: refuses media linked to a mission or other resource")
    void useRefusesLinkedMedia() {
        when(media.confirm(12L, "alice")).thenReturn(asset(12L, "image/png", 1000, "MISSION"));

        assertThatThrownBy(() -> service.use("alice", 12L)).isInstanceOf(SystemException.class);
        assertThat(alice.getAvatarUrl()).isNull();
    }

    @Test
    @DisplayName("remove: clears the avatar and retires its media")
    void removeClearsAvatar() {
        alice.setAvatarUrl("/api/v1/users/7/avatar?v=5");

        service.remove("alice");

        assertThat(alice.getAvatarUrl()).isNull();
        verify(media).delete(5L, "alice");
    }

    @Test
    @DisplayName("image: the owner and USER_READ holders get a signed URL; others get not-found")
    void imageVisibility() {
        alice.setAvatarUrl("/api/v1/users/7/avatar?v=11");
        MediaAsset stored = new MediaAsset("me.png", "image/key-11", "image/png", 1000, MediaType.IMAGE,
                null, null, "alice", "s3");
        MediaAssetOperations.confirm(stored);
        when(assets.findById(11L)).thenReturn(Optional.of(stored));
        when(storage.createSignedDownloadUrl("image/key-11")).thenReturn("https://get");

        assertThat(service.signedUrl(7L, as("alice"))).isEqualTo("https://get");

        Authentication admin = as("admin");
        when(permissions.has(admin, "USER_READ")).thenReturn(true);
        assertThat(service.signedUrl(7L, admin)).isEqualTo("https://get");

        Authentication stranger = as("mallory");
        when(permissions.has(stranger, "USER_READ")).thenReturn(false);
        assertThatThrownBy(() -> service.signedUrl(7L, stranger)).isInstanceOf(SystemException.class);
    }

    @Test
    @DisplayName("image: an asset uploaded by someone else is never served as this user's avatar")
    void imageRequiresOwnUpload() {
        alice.setAvatarUrl("/api/v1/users/7/avatar?v=11");
        MediaAsset foreign = new MediaAsset("x.png", "image/key-x", "image/png", 1000, MediaType.IMAGE,
                null, null, "mallory", "s3");
        MediaAssetOperations.confirm(foreign);
        when(assets.findById(11L)).thenReturn(Optional.of(foreign));

        assertThatThrownBy(() -> service.signedUrl(7L, as("alice"))).isInstanceOf(SystemException.class);
        verify(storage, never()).createSignedDownloadUrl(anyString());
    }
}
