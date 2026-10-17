package com.uav.platform.modules.media.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.audit.enums.*;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.inventory.enums.*;
import com.uav.platform.modules.media.entity.MediaAsset;
import com.uav.platform.modules.media.enums.*;
import com.uav.platform.modules.media.enums.MediaType;
import com.uav.platform.modules.media.repository.MediaAssetRepository;
import com.uav.platform.modules.media.service.impl.MediaServiceImpl;
import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.station.enums.*;
import com.uav.platform.modules.uav.enums.*;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

@ExtendWith(MockitoExtension.class)
class MediaServiceTest {
    @Mock MediaAssetRepository repository;
    @Mock ObjectStorageService storage;
    @Mock AuditLogService audit;
    @InjectMocks MediaServiceImpl service;

    @Test
    void registrationRejectsUnsupportedTypesAndDecimalSizeOverflowBeforePersistence() {
        for (String mime :
                java.util.List.of("text/plain", "image/gif", "application/octet-stream")) {
            assertThrows(
                    SystemException.class,
                    () ->
                            service.register(
                                    new com.uav.platform.modules.media.dto.request
                                            .MediaUploadRequest(
                                            "bad", mime, 1, MediaType.DOCUMENT, null, null),
                                    "pilot"));
        }
        for (String mime :
                java.util.List.of(
                        "image/jpeg",
                        "image/png",
                        "image/webp",
                        "application/pdf",
                        "video/mp4",
                        "video/webm")) {
            long max = mime.startsWith("video/") ? 1_000_000_000L : 100_000_000L;
            assertThrows(
                    SystemException.class,
                    () ->
                            service.register(
                                    new com.uav.platform.modules.media.dto.request
                                            .MediaUploadRequest(
                                            "large", mime, max + 1, MediaType.DOCUMENT, null, null),
                                    "pilot"));
        }
        assertThrows(
                SystemException.class,
                () ->
                        service.register(
                                new com.uav.platform.modules.media.dto.request.MediaUploadRequest(
                                        "empty", "image/png", 0, MediaType.IMAGE, null, null),
                                "pilot"));
        verify(repository, never()).save(any());
    }

    @Test
    void confirmationRequiresObjectAndDownloadRequiresConfirmation() {
        MediaAsset asset =
                new MediaAsset(
                        "photo.jpg",
                        "image/key",
                        "image/jpeg",
                        10,
                        MediaType.IMAGE,
                        "UAV",
                        "7",
                        "pilot",
                        "test");
        asset.setId(7L);
        when(repository.findById(7L)).thenReturn(Optional.of(asset));
        when(storage.objectExists("image/key")).thenReturn(false);
        assertThrows(SystemException.class, () -> service.confirm(7L, "pilot"));
        assertThrows(SystemException.class, () -> service.downloadUrl(7L, "pilot"));
        verify(storage, never()).createSignedDownloadUrl(any());
    }

    @Test
    void listUsesDatabaseSpecificationForSoftDeletedAssetsAndPageable() {
        Pageable pageable = PageRequest.of(0, 20, Sort.by("id"));
        when(repository.findAll(any(Specification.class), eq(pageable)))
                .thenReturn(Page.empty(pageable));

        assertEquals(0, service.list(pageable).content().size());
        verify(repository).findAll(any(Specification.class), eq(pageable));
        verify(repository, never()).findAll(any(Specification.class), any(Sort.class));
    }

    @Test
    void listUsesAuthorizedDatabasePageAndReportsVisibleTotals() {
        MediaAccessService access = mock(MediaAccessService.class);
        MediaServiceImpl securedService =
                new MediaServiceImpl(repository, storage, audit, null, access);
        MediaAsset visible =
                new MediaAsset(
                        "visible.jpg",
                        "visible",
                        "image/jpeg",
                        1,
                        MediaType.IMAGE,
                        "UAV",
                        "8",
                        "pilot",
                        "test");
        when(access.readableBy("pilot"))
                .thenReturn(
                        com.uav.platform.modules.media.specification.MediaAssetSpecifications
                                .hasUploader("pilot"));
        var pageable = PageRequest.of(0, 1, Sort.by("id"));
        when(repository.findAll(any(Specification.class), eq(pageable)))
                .thenReturn(
                        new org.springframework.data.domain.PageImpl<>(
                                java.util.List.of(visible), pageable, 1));
        SecurityContextHolder.getContext()
                .setAuthentication(
                        UsernamePasswordAuthenticationToken.authenticated(
                                "pilot", "n/a", java.util.List.of()));
        try {
            var result = securedService.list(PageRequest.of(0, 1));
            assertEquals(1, result.content().size());
            assertEquals("visible.jpg", result.content().get(0).originalName());
            assertEquals(1, result.totalElements());
            assertEquals(1, result.totalPages());
            verify(access).readableBy("pilot");
            verify(repository, never()).findAll(any(Specification.class), any(Sort.class));
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    @Test
    void confirmationEnablesDownloadAndDeleteQueuesDurableCleanup() {
        MediaAsset asset =
                new MediaAsset(
                        "photo.jpg",
                        "image/key",
                        "image/jpeg",
                        10,
                        MediaType.IMAGE,
                        "UAV",
                        "7",
                        "pilot",
                        "test");
        asset.setId(7L);
        when(repository.findById(7L)).thenReturn(Optional.of(asset));
        when(storage.objectExists("image/key")).thenReturn(true);
        when(storage.metadata("image/key"))
                .thenReturn(new ObjectStorageService.ObjectMetadata(10, "image/jpeg"));
        when(storage.readHeader("image/key"))
                .thenReturn(new byte[] {(byte) 255, (byte) 216, (byte) 255});
        when(storage.createSignedDownloadUrl("image/key"))
                .thenReturn("https://example.test/signed");
        var confirmed = service.confirm(7L, "pilot");
        assertEquals(true, confirmed.confirmed());
        assertEquals("https://example.test/signed", service.downloadUrl(7L, "pilot").url());
        service.delete(7L, "pilot");
        verify(storage, never()).deleteObject("image/key");
        org.junit.jupiter.api.Assertions.assertNotNull(asset.getDeleteAfter());
        assertEquals(true, asset.isDeleted());
        verify(repository, times(2)).save(asset);
    }
}
