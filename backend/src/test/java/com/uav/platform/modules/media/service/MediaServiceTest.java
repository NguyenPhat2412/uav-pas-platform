package com.uav.platform.modules.media.service;

import com.uav.platform.modules.user.common.*;
import com.uav.platform.modules.uav.common.*;
import com.uav.platform.modules.station.common.*;
import com.uav.platform.modules.inventory.common.*;
import com.uav.platform.modules.media.common.*;
import com.uav.platform.modules.audit.common.*;
import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.media.common.*;

import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.media.entity.MediaAsset;
import com.uav.platform.modules.media.common.MediaType;
import com.uav.platform.modules.media.repository.MediaAssetRepository;
import com.uav.platform.modules.media.service.impl.IMediaService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MediaServiceTest {
    @Mock MediaAssetRepository repository;
    @Mock ObjectStorageService storage;
    @Mock AuditLogService audit;
    @InjectMocks IMediaService service;

    @Test
    void confirmationRequiresObjectAndDownloadRequiresConfirmation() {
        MediaAsset asset = new MediaAsset("photo.jpg", "image/key", "image/jpeg", 10, MediaType.IMAGE, "UAV", "7", "pilot", "test");
        asset.setId(7L);
        when(repository.findById(7L)).thenReturn(Optional.of(asset));
        when(storage.objectExists("image/key")).thenReturn(false);
        assertThrows(SystemException.class, () -> service.confirm(7L, "pilot"));
        assertThrows(SystemException.class, () -> service.downloadUrl(7L, "pilot"));
        verify(storage, never()).createSignedDownloadUrl(any());
    }

    @Test
    void listUsesDatabaseSpecificationForSoftDeletedAssetsAndPageable() {
        Pageable pageable = PageRequest.of(0, 20);
        when(repository.findAll(any(Specification.class), eq(pageable))).thenReturn(Page.empty(pageable));

        assertEquals(0, service.list(pageable).content().size());
        verify(repository).findAll(any(Specification.class), eq(pageable));
        verify(repository, never()).findAll(any(Specification.class), any(Sort.class));
    }

    @Test
    void listPaginatesAfterResourceAuthorizationAndReportsVisibleTotals() {
        MediaAccessService access = mock(MediaAccessService.class);
        IMediaService securedService = new IMediaService(repository, storage, audit, null, access);
        MediaAsset hidden = new MediaAsset("hidden.jpg", "hidden", "image/jpeg", 1, MediaType.IMAGE, "UAV", "7", "other", "test");
        MediaAsset visible = new MediaAsset("visible.jpg", "visible", "image/jpeg", 1, MediaType.IMAGE, "UAV", "8", "pilot", "test");
        doThrow(new AccessDeniedException("hidden")).when(access).requireFile(hidden, "pilot", false);
        when(repository.findAll(any(Specification.class), any(Sort.class))).thenReturn(java.util.List.of(hidden, visible));
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated("pilot", "n/a", java.util.List.of()));
        try {
            var result = securedService.list(PageRequest.of(0, 1));
            assertEquals(1, result.content().size());
            assertEquals("visible.jpg", result.content().get(0).originalName());
            assertEquals(1, result.totalElements());
            assertEquals(1, result.totalPages());
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    @Test
    void confirmationEnablesDownloadAndDeleteRemovesObjectAndMetadata() {
        MediaAsset asset = new MediaAsset("photo.jpg", "image/key", "image/jpeg", 10, MediaType.IMAGE, "UAV", "7", "pilot", "test");
        asset.setId(7L);
        when(repository.findById(7L)).thenReturn(Optional.of(asset));
        when(storage.objectExists("image/key")).thenReturn(true);
        when(storage.metadata("image/key")).thenReturn(new ObjectStorageService.ObjectMetadata(10,"image/jpeg"));
        when(storage.createSignedDownloadUrl("image/key")).thenReturn("https://example.test/signed");
        var confirmed = service.confirm(7L, "pilot");
        assertEquals(true, confirmed.confirmed());
        assertEquals("https://example.test/signed", service.downloadUrl(7L, "pilot").url());
        service.delete(7L, "pilot");
        verify(storage).deleteObject("image/key");
        assertEquals(true, asset.isDeleted());
        verify(repository).save(asset);
    }
}
