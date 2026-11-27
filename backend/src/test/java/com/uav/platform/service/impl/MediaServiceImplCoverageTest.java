package com.uav.platform.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dao.IMediaAssetDao;
import com.uav.platform.dao.IMissionMediaDao;
import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.dto.record.ObjectMetadata;
import com.uav.platform.dto.request.MediaUploadRequest;
import com.uav.platform.dto.response.MediaAssetResponse;
import com.uav.platform.dto.response.SignedMediaUrlResponse;
import com.uav.platform.entity.MediaAsset;
import com.uav.platform.enums.AuditAction;
import com.uav.platform.enums.MediaType;
import com.uav.platform.enums.MediaVisibility;
import com.uav.platform.error.SystemException;
import com.uav.platform.service.AuditLogService;
import com.uav.platform.service.MediaAccessService;
import com.uav.platform.service.ObjectStorageService;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.lang.reflect.Field;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

class MediaServiceImplCoverageTest {

    private static final byte[] PNG_HEADER =
            new byte[] {(byte) 137, 80, 78, 71, 13, 10, 26, 10, 0, 0};

    private IMediaAssetDao repository;
    private ObjectStorageService storage;
    private AuditLogService audit;
    private IMissionMediaDao missionMedia;
    private MediaAccessService access;
    private MediaServiceImpl service;

    @BeforeEach
    void setUp() {
        repository = mock(IMediaAssetDao.class);
        storage = mock(ObjectStorageService.class);
        audit = mock(AuditLogService.class);
        missionMedia = mock(IMissionMediaDao.class);
        access = mock(MediaAccessService.class);
        service = new MediaServiceImpl(repository, storage, audit, missionMedia, access);
        SecurityContextHolder.getContext()
                .setAuthentication(
                        UsernamePasswordAuthenticationToken.authenticated(
                                "pilot", null, List.of()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private static MediaAsset asset(Long id, boolean confirmed, boolean deleted) {
        MediaAsset a =
                new MediaAsset(
                        "photo.png",
                        "image/uuid-photo.png",
                        "image/png",
                        1024L,
                        MediaType.IMAGE,
                        "MISSION",
                        "42",
                        "pilot",
                        "minio");
        a.setId(id);
        a.setConfirmed(confirmed);
        a.setDeleted(deleted);
        a.setCreatedAt(LocalDateTime.now().minusMinutes(5));
        return a;
    }

    @Test
    @SuppressWarnings("unchecked")
    void listCoversAccessScopeAndSortAppending() {
        when(access.readableBy("pilot")).thenReturn((root, q, cb) -> cb.conjunction());
        when(repository.findAll(any(HibernateSpecification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(asset(1L, true, false))));

        // Paged without "id" sort -> appends id sort
        PageResponse<MediaAssetResponse> res1 =
                service.list(PageRequest.of(0, 10, Sort.by("createdAt")));
        assertEquals(1, res1.content().size());
        ArgumentCaptor<Pageable> cap = ArgumentCaptor.forClass(Pageable.class);
        verify(repository).findAll(any(HibernateSpecification.class), cap.capture());
        assertNotNull(cap.getValue().getSort().getOrderFor("id"));

        // Paged already sorted by id -> keeps as-is
        Pageable byId = PageRequest.of(0, 5, Sort.by("id"));
        service.list(byId);

        // Unpaged + no access + no security context
        SecurityContextHolder.clearContext();
        MediaServiceImpl minimal = new MediaServiceImpl(repository, storage, audit);
        minimal.list(Pageable.unpaged());
        verify(repository, times(3))
                .findAll(any(HibernateSpecification.class), any(Pageable.class));
    }

    @Test
    void registerSanitizesNameSetsVisibilityAndAudits() {
        when(storage.provider()).thenReturn("minio");
        when(repository.save(any(MediaAsset.class)))
                .thenAnswer(
                        inv -> {
                            MediaAsset a = inv.getArgument(0);
                            a.setId(10L);
                            return a;
                        });

        MediaUploadRequest req =
                new MediaUploadRequest(
                        "my photo (1).png",
                        "image/png",
                        2048L,
                        MediaType.IMAGE,
                        "MISSION",
                        "99",
                        MediaVisibility.PUBLIC);
        MediaAssetResponse res = service.register(req, "pilot");

        assertEquals(10L, res.id());
        verify(access).requireLink("MISSION", "99", "pilot", true);
        verify(audit)
                .record(
                        isNull(),
                        eq("pilot"),
                        eq(AuditAction.UPLOAD),
                        eq("MEDIA"),
                        eq("10"),
                        contains("my_photo__1_.png"));

        // With null visibility
        MediaUploadRequest privateReq =
                new MediaUploadRequest(
                        "doc.pdf", "application/pdf", 500L, MediaType.DOCUMENT, null, null);
        service.register(privateReq, "pilot");
    }

    @Test
    void uploadUrlCoversFreshNullCreatedAtNearExpiryConfirmedAndRefreshedDeleted()
            throws Exception {
        MediaAsset fresh = asset(1L, false, false);
        when(repository.findById(1L)).thenReturn(Optional.of(fresh));
        when(storage.createSignedUploadUrl(any(), any(), anyLong(), any(Duration.class)))
                .thenReturn("https://s3/up");

        SignedMediaUrlResponse r1 = service.uploadUrl(1L);
        assertEquals("upload", r1.operation());
        assertEquals(900, r1.expiresInSeconds());

        // Null createdAt -> defaults to 900 seconds
        MediaAsset noTs = asset(2L, false, false);
        noTs.setCreatedAt(null);
        when(repository.findById(2L)).thenReturn(Optional.of(noTs));
        assertEquals(900, service.uploadUrl(2L).expiresInSeconds());

        // Near 24h expiry -> bounded < 900 seconds
        MediaAsset nearExpiry = asset(3L, false, false);
        nearExpiry.setCreatedAt(LocalDateTime.now().minusHours(23).minusMinutes(55));
        when(repository.findById(3L)).thenReturn(Optional.of(nearExpiry));
        SignedMediaUrlResponse r3 = service.uploadUrl(3L);
        assertTrue(r3.expiresInSeconds() > 0 && r3.expiresInSeconds() <= 300);

        // Already confirmed -> conflict
        when(repository.findById(4L)).thenReturn(Optional.of(asset(4L, true, false)));
        assertThrows(SystemException.class, () -> service.uploadUrl(4L));

        // EntityManager refresh flips asset to deleted -> triggers post-lock deleted check
        MediaAsset stale = asset(5L, false, false);
        when(repository.findById(5L)).thenReturn(Optional.of(stale));
        EntityManager em = mock(EntityManager.class);
        when(em.contains(stale)).thenReturn(true);
        doAnswer(
                        inv -> {
                            stale.setDeleted(true);
                            return null;
                        })
                .when(em)
                .refresh(stale, LockModeType.PESSIMISTIC_WRITE);
        Field emField = MediaServiceImpl.class.getDeclaredField("entityManager");
        emField.setAccessible(true);
        emField.set(service, em);

        assertThrows(SystemException.class, () -> service.uploadUrl(5L));
        verify(em).refresh(stale, LockModeType.PESSIMISTIC_WRITE);
    }

    @Test
    void downloadUrlRequiresConfirmedAndAudits() {
        MediaAsset unconfirmed = asset(1L, false, false);
        when(repository.findById(1L)).thenReturn(Optional.of(unconfirmed));
        assertThrows(SystemException.class, () -> service.downloadUrl(1L, "pilot"));

        MediaAsset confirmed = asset(2L, true, false);
        when(repository.findById(2L)).thenReturn(Optional.of(confirmed));
        when(storage.createSignedDownloadUrl(confirmed.getObjectKey()))
                .thenReturn("https://s3/down");

        SignedMediaUrlResponse res = service.downloadUrl(2L, "pilot");
        assertEquals("https://s3/down", res.url());
        assertEquals("download", res.operation());
        verify(audit)
                .record(
                        isNull(),
                        eq("pilot"),
                        eq(AuditAction.DOWNLOAD),
                        eq("MEDIA"),
                        eq("2"),
                        eq(confirmed.getObjectKey()));
    }

    @Test
    void confirmCoversAlreadyConfirmedMissingMetadataMismatchAndSuccess() throws Exception {
        // Already confirmed -> returns directly
        MediaAsset confirmed = asset(1L, true, false);
        when(repository.findById(1L)).thenReturn(Optional.of(confirmed));
        assertEquals(1L, service.confirm(1L, "pilot").id());
        verifyNoInteractions(storage);

        // Missing in storage
        MediaAsset pending = asset(2L, false, false);
        when(repository.findById(2L)).thenReturn(Optional.of(pending));
        when(storage.objectExists(pending.getObjectKey())).thenReturn(false);
        assertThrows(SystemException.class, () -> service.confirm(2L, "pilot"));

        // Metadata null / size mismatch / content-type mismatch
        when(storage.objectExists(pending.getObjectKey())).thenReturn(true);
        when(storage.metadata(pending.getObjectKey())).thenReturn(null);
        assertThrows(SystemException.class, () -> service.confirm(2L, "pilot"));

        when(storage.metadata(pending.getObjectKey()))
                .thenReturn(new ObjectMetadata(999L, "image/png"));
        assertThrows(SystemException.class, () -> service.confirm(2L, "pilot"));

        when(storage.metadata(pending.getObjectKey()))
                .thenReturn(new ObjectMetadata(1024L, "image/jpeg"));
        assertThrows(SystemException.class, () -> service.confirm(2L, "pilot"));

        // Success
        when(storage.metadata(pending.getObjectKey()))
                .thenReturn(new ObjectMetadata(1024L, "image/png"));
        when(storage.readHeader(pending.getObjectKey())).thenReturn(PNG_HEADER);

        MediaAssetResponse ok = service.confirm(2L, "pilot");
        assertTrue(pending.isConfirmed());
        assertEquals(2L, ok.id());
        verify(audit)
                .record(
                        isNull(),
                        eq("pilot"),
                        eq(AuditAction.UPDATE),
                        eq("MEDIA"),
                        eq("2"),
                        eq("CONFIRMED"));

        // Post-lock deleted check in confirm
        MediaAsset stale = asset(3L, false, false);
        when(repository.findById(3L)).thenReturn(Optional.of(stale));
        EntityManager em = mock(EntityManager.class);
        when(em.contains(stale)).thenReturn(true);
        doAnswer(
                        inv -> {
                            stale.setDeleted(true);
                            return null;
                        })
                .when(em)
                .refresh(stale, LockModeType.PESSIMISTIC_WRITE);
        Field emField = MediaServiceImpl.class.getDeclaredField("entityManager");
        emField.setAccessible(true);
        emField.set(service, em);
        assertThrows(SystemException.class, () -> service.confirm(3L, "pilot"));
    }

    @Test
    void deleteAndMissionHelpersCoverAllBranches() {
        when(repository.findById(404L)).thenReturn(Optional.empty());
        assertThrows(SystemException.class, () -> service.delete(404L, "pilot"));

        // Already deleted -> re-queues deletion without audit
        MediaAsset alreadyDeleted = asset(1L, true, true);
        when(repository.findById(1L)).thenReturn(Optional.of(alreadyDeleted));
        service.delete(1L, "pilot");
        verify(repository).save(alreadyDeleted);
        verify(audit, never()).record(any(), any(), eq(AuditAction.DELETE), any(), any(), any());

        // Attached to mission -> conflict
        MediaAsset attached = asset(2L, true, false);
        when(repository.findById(2L)).thenReturn(Optional.of(attached));
        when(missionMedia.existsByMediaId(2L)).thenReturn(true);
        assertThrows(SystemException.class, () -> service.delete(2L, "pilot"));

        // Normal delete
        when(missionMedia.existsByMediaId(2L)).thenReturn(false);
        service.delete(2L, "pilot");
        assertTrue(attached.isDeleted());
        verify(audit)
                .record(
                        isNull(),
                        eq("pilot"),
                        eq(AuditAction.DELETE),
                        eq("MEDIA"),
                        eq("2"),
                        eq(attached.getObjectKey()));

        // confirmMission: wrong entity type, wrong id, valid match
        MediaAsset otherType = asset(3L, true, false);
        otherType.setLinkedEntityType("USER");
        when(repository.findById(3L)).thenReturn(Optional.of(otherType));
        assertThrows(AccessDeniedException.class, () -> service.confirmMission(3L, 42L, "pilot"));

        MediaAsset otherId = asset(4L, true, false);
        otherId.setLinkedEntityId("99");
        when(repository.findById(4L)).thenReturn(Optional.of(otherId));
        assertThrows(AccessDeniedException.class, () -> service.confirmMission(4L, 42L, "pilot"));

        MediaAsset matching = asset(5L, true, false);
        when(repository.findById(5L)).thenReturn(Optional.of(matching));
        assertEquals(5L, service.confirmMission(5L, 42L, "pilot").id());

        // registerMissionUploadUrl
        when(storage.provider()).thenReturn("minio");
        when(repository.save(any(MediaAsset.class)))
                .thenAnswer(
                        inv -> {
                            MediaAsset a = inv.getArgument(0);
                            a.setId(88L);
                            a.setCreatedAt(LocalDateTime.now());
                            when(repository.findById(88L)).thenReturn(Optional.of(a));
                            return a;
                        });
        when(storage.createSignedUploadUrl(any(), any(), anyLong(), any(Duration.class)))
                .thenReturn("https://s3/mission-up");

        SignedMediaUrlResponse missionUp =
                service.registerMissionUploadUrl(
                        42L,
                        new MediaUploadRequest(
                                "plan.pdf",
                                "application/pdf",
                                512L,
                                MediaType.DOCUMENT,
                                null,
                                null),
                        "pilot");
        assertEquals(88L, missionUp.mediaId());
        assertEquals("https://s3/mission-up", missionUp.url());
    }
}
