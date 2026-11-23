package com.uav.platform.service.impl.marketplace.admin;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.dao.marketplace.IMarketplaceListingDao;
import com.uav.platform.dao.marketplace.IProviderDocumentDao;
import com.uav.platform.dao.marketplace.IProviderPayoutDao;
import com.uav.platform.dao.marketplace.IProviderProfileDao;
import com.uav.platform.dao.marketplace.IProviderWalletDao;
import com.uav.platform.dao.marketplace.IWalletTransactionDao;
import com.uav.platform.dao.user.IUserDao;
import com.uav.platform.dto.request.marketplace.admin.ListingModerationRequest;
import com.uav.platform.dto.request.marketplace.admin.ProviderDocumentModerationRequest;
import com.uav.platform.dto.request.marketplace.admin.ProviderModerationRequest;
import com.uav.platform.dto.request.marketplace.escrow.PayoutProcessRequest;
import com.uav.platform.entity.marketplace.MarketplaceListing;
import com.uav.platform.entity.marketplace.ProviderDocument;
import com.uav.platform.entity.marketplace.ProviderPayout;
import com.uav.platform.entity.marketplace.ProviderProfile;
import com.uav.platform.entity.marketplace.ProviderWallet;
import com.uav.platform.entity.marketplace.WalletTransaction;
import com.uav.platform.entity.media.MediaAsset;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.marketplace.ListingModerationStatus;
import com.uav.platform.enums.marketplace.PayoutStatus;
import com.uav.platform.enums.marketplace.ProviderDocumentStatus;
import com.uav.platform.enums.marketplace.ProviderDocumentType;
import com.uav.platform.enums.marketplace.ProviderVerificationStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.marketplace.provider.MarketplaceMapper;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.media.ObjectStorageService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

class MarketplaceAdminServiceImplTest {

    private IProviderProfileDao providers;
    private IProviderDocumentDao documents;
    private IMarketplaceListingDao listings;
    private IProviderWalletDao wallets;
    private IProviderPayoutDao payouts;
    private IWalletTransactionDao ledger;
    private IUserDao users;
    private AuditLogService audit;
    private MarketplaceMapper mapper;
    private MarketplaceAdminServiceImpl service;

    @BeforeEach
    void setUp() {
        providers = mock(IProviderProfileDao.class);
        documents = mock(IProviderDocumentDao.class);
        listings = mock(IMarketplaceListingDao.class);
        wallets = mock(IProviderWalletDao.class);
        payouts = mock(IProviderPayoutDao.class);
        ledger = mock(IWalletTransactionDao.class);
        users = mock(IUserDao.class);
        audit = mock(AuditLogService.class);
        mapper = new MarketplaceMapper();
        service =
                new MarketplaceAdminServiceImpl(
                        providers, documents, listings, wallets, payouts, ledger, users, audit,
                        mapper);
        AppUser admin = new AppUser();
        admin.setId(1L);
        admin.setUsername("admin");
        when(users.findByUsername("admin")).thenReturn(Optional.of(admin));
    }

    @Test
    @SuppressWarnings("unchecked")
    void listProvidersBatchLoadsDocumentsAndHandlesEmptyPage() {
        ProviderProfile p = provider(10L, ProviderVerificationStatus.PENDING_REVIEW);
        ProviderDocument doc = doc(100L, p, ProviderDocumentStatus.PENDING);

        when(providers.findAll(any(HibernateSpecification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(p)));
        when(documents.findByProviderIdInOrderByCreatedAtDesc(List.of(10L)))
                .thenReturn(List.of(doc));

        var page =
                service.listProviders(
                        ProviderVerificationStatus.PENDING_REVIEW, "sky", PageRequest.of(0, 20));
        assertEquals(1, page.content().size());
        assertEquals(1, page.content().get(0).documents().size());

        when(providers.findAll(any(HibernateSpecification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));
        var empty = service.listProviders(null, null, PageRequest.of(0, 100));
        assertTrue(empty.content().isEmpty());
    }

    @Test
    void listAndModerateProviderDocumentsCoversApprovalRejectionAndErrors() {
        ProviderProfile p = provider(19L, ProviderVerificationStatus.PENDING_REVIEW);
        ProviderDocument d = doc(190L, p, ProviderDocumentStatus.PENDING);

        when(providers.existsById(999L)).thenReturn(false);
        assertThrows(SystemException.class, () -> service.listProviderDocuments(999L));

        when(providers.existsById(19L)).thenReturn(true);
        when(documents.findByProviderIdOrderByCreatedAtDesc(19L)).thenReturn(List.of(d));
        var listed = service.listProviderDocuments(19L);
        assertEquals(1, listed.size());
        assertEquals("https://example.com/doc-190.pdf", listed.get(0).downloadUrl());

        when(providers.findById(19L)).thenReturn(Optional.of(p));
        when(documents.findByIdAndProviderId(190L, 19L)).thenReturn(Optional.of(d));
        when(documents.save(any(ProviderDocument.class))).thenAnswer(inv -> inv.getArgument(0));

        // Reject without reviewerNote fails
        SystemException noteReq =
                assertThrows(
                        SystemException.class,
                        () ->
                                service.moderateProviderDocument(
                                        19L,
                                        190L,
                                        new ProviderDocumentModerationRequest(
                                                ProviderDocumentStatus.REJECTED, "   "),
                                        "admin"));
        assertEquals("REVIEWER_NOTE_REQUIRED", noteReq.getCode());

        // Reject with reviewerNote succeeds
        var rejected =
                service.moderateProviderDocument(
                        19L,
                        190L,
                        new ProviderDocumentModerationRequest(
                                ProviderDocumentStatus.REJECTED, "Ảnh bị mờ"),
                        "admin");
        assertEquals(ProviderDocumentStatus.REJECTED, rejected.status());
        assertEquals("Ảnh bị mờ", rejected.reviewerNote());

        // Approve succeeds
        var approved =
                service.moderateProviderDocument(
                        19L,
                        190L,
                        new ProviderDocumentModerationRequest(
                                ProviderDocumentStatus.APPROVED, "Hợp lệ"),
                        "admin");
        assertEquals(ProviderDocumentStatus.APPROVED, approved.status());

        // Missing doc throws notFound
        when(documents.findByIdAndProviderId(999L, 19L)).thenReturn(Optional.empty());
        assertThrows(
                SystemException.class,
                () ->
                        service.moderateProviderDocument(
                                19L,
                                999L,
                                new ProviderDocumentModerationRequest(
                                        ProviderDocumentStatus.APPROVED, null),
                                "admin"));
    }

    @Test
    void moderateProviderVerifiedApprovesPendingDocsAndInitializesWallet() {
        ProviderProfile p = provider(11L, ProviderVerificationStatus.PENDING_REVIEW);
        ProviderDocument pendingDoc = doc(101L, p, ProviderDocumentStatus.PENDING);
        ProviderDocument alreadyRejected = doc(102L, p, ProviderDocumentStatus.REJECTED);

        when(providers.findById(11L)).thenReturn(Optional.of(p));
        when(providers.save(any(ProviderProfile.class))).thenAnswer(inv -> inv.getArgument(0));
        when(documents.findByProviderIdOrderByCreatedAtDesc(11L))
                .thenReturn(List.of(pendingDoc, alreadyRejected));
        when(wallets.findByProviderId(11L)).thenReturn(Optional.empty());

        var res =
                service.moderateProvider(
                        11L,
                        new ProviderModerationRequest(
                                ProviderVerificationStatus.VERIFIED,
                                "Hồ sơ hợp lệ",
                                new BigDecimal("0.0800")),
                        "admin");

        assertEquals(ProviderVerificationStatus.VERIFIED, res.verificationStatus());
        assertEquals("admin", res.verifiedBy());
        assertNotNull(res.verifiedAt());
        assertEquals(ProviderDocumentStatus.APPROVED, pendingDoc.getStatus());
        assertEquals("Hồ sơ hợp lệ", pendingDoc.getReviewerNote());
        assertEquals(ProviderDocumentStatus.REJECTED, alreadyRejected.getStatus());
        verify(wallets).save(any(ProviderWallet.class));
        verify(audit)
                .record(
                        eq(1L),
                        eq("admin"),
                        any(),
                        eq("PROVIDER_PROFILE"),
                        eq("11"),
                        eq("VERIFIED"));
    }

    @Test
    void moderateProviderRejectedPreservesPerDocumentStatusesAndSavesReviewNote() {
        ProviderProfile p = provider(12L, ProviderVerificationStatus.PENDING_REVIEW);
        ProviderDocument pendingDoc = doc(103L, p, ProviderDocumentStatus.PENDING);
        ProviderDocument approvedDoc = doc(104L, p, ProviderDocumentStatus.APPROVED);

        when(providers.findById(12L)).thenReturn(Optional.of(p));
        when(providers.save(any(ProviderProfile.class))).thenAnswer(inv -> inv.getArgument(0));
        when(documents.findByProviderIdOrderByCreatedAtDesc(12L))
                .thenReturn(List.of(pendingDoc, approvedDoc));

        var res =
                service.moderateProvider(
                        12L,
                        new ProviderModerationRequest(
                                ProviderVerificationStatus.REJECTED,
                                "Cần bổ sung ảnh CCCD rõ nét",
                                null),
                        "admin");

        assertEquals(ProviderVerificationStatus.REJECTED, res.verificationStatus());
        assertEquals("Cần bổ sung ảnh CCCD rõ nét", res.reviewNote());
        assertEquals(ProviderDocumentStatus.PENDING, pendingDoc.getStatus());
        assertEquals(ProviderDocumentStatus.APPROVED, approvedDoc.getStatus());
    }

    @Test
    void moderateProviderSuspendedPausesPublishedListingsOnly() {
        ProviderProfile p = provider(13L, ProviderVerificationStatus.VERIFIED);
        MarketplaceListing published = new MarketplaceListing();
        published.setId(201L);
        published.setProvider(p);
        published.setModerationStatus(ListingModerationStatus.PUBLISHED);
        MarketplaceListing draft = new MarketplaceListing();
        draft.setId(202L);
        draft.setProvider(p);
        draft.setModerationStatus(ListingModerationStatus.DRAFT);

        when(providers.findById(13L)).thenReturn(Optional.of(p));
        when(providers.save(any(ProviderProfile.class))).thenAnswer(inv -> inv.getArgument(0));
        when(listings.findByProviderIdOrderByCreatedAtDesc(13L))
                .thenReturn(List.of(published, draft));
        when(documents.findByProviderIdOrderByCreatedAtDesc(13L)).thenReturn(List.of());

        service.moderateProvider(
                13L,
                new ProviderModerationRequest(
                        ProviderVerificationStatus.SUSPENDED, "Vi phạm SLA", null),
                "admin");

        assertEquals(ListingModerationStatus.PAUSED, published.getModerationStatus());
        assertEquals(ListingModerationStatus.DRAFT, draft.getModerationStatus());
        verify(listings).save(published);
        verify(listings, never()).save(draft);
    }

    @Test
    @SuppressWarnings("unchecked")
    void listAndModerateListingBlocksUnverifiedProviderAndPublishesVerified() {
        ProviderProfile unverified = provider(14L, ProviderVerificationStatus.PENDING_REVIEW);
        MarketplaceListing listing = new MarketplaceListing();
        listing.setId(301L);
        listing.setTitle("Survey LiDAR");
        listing.setProvider(unverified);
        listing.setModerationStatus(ListingModerationStatus.PENDING_REVIEW);

        when(listings.findAll(any(HibernateSpecification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(listing)));
        assertEquals(
                1,
                service.listListings(
                                ListingModerationStatus.PENDING_REVIEW,
                                "lidar",
                                PageRequest.of(0, 10))
                        .content()
                        .size());

        when(listings.findWithDetailsById(301L)).thenReturn(Optional.of(listing));
        SystemException conflict =
                assertThrows(
                        SystemException.class,
                        () ->
                                service.moderateListing(
                                        301L,
                                        new ListingModerationRequest(
                                                ListingModerationStatus.PUBLISHED, "OK", true),
                                        "admin"));
        assertEquals("PROVIDER_NOT_VERIFIED", conflict.getCode());

        unverified.setVerificationStatus(ProviderVerificationStatus.VERIFIED);
        when(listings.save(any(MarketplaceListing.class))).thenAnswer(inv -> inv.getArgument(0));
        var published =
                service.moderateListing(
                        301L,
                        new ListingModerationRequest(
                                ListingModerationStatus.PUBLISHED, "  Approved  ", true),
                        "admin");
        assertEquals(ListingModerationStatus.PUBLISHED, published.moderationStatus());
        assertTrue(published.featured());
    }

    @Test
    @SuppressWarnings("unchecked")
    void listAndProcessPayoutHandlesApproveRejectValidationAndConflict() {
        ProviderProfile p = provider(15L, ProviderVerificationStatus.VERIFIED);
        ProviderWallet wallet = new ProviderWallet();
        wallet.setProvider(p);
        wallet.setAvailableBalanceVnd(new BigDecimal("1000000"));
        wallet.setPendingPayoutVnd(new BigDecimal("500000"));
        wallet.setTotalWithdrawnVnd(BigDecimal.ZERO);

        ProviderPayout pending = new ProviderPayout();
        pending.setId(401L);
        pending.setCode("PO-401");
        pending.setProvider(p);
        pending.setAmountVnd(new BigDecimal("500000"));
        pending.setStatus(PayoutStatus.PENDING);

        when(payouts.findAll(any(HibernateSpecification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(pending)));
        assertEquals(
                1,
                service.listPayouts(PayoutStatus.PENDING, PageRequest.of(0, 10)).content().size());

        when(payouts.findByIdForUpdate(401L)).thenReturn(Optional.of(pending));
        when(wallets.findByProviderIdForUpdate(15L)).thenReturn(Optional.of(wallet));
        when(payouts.save(any(ProviderPayout.class))).thenAnswer(inv -> inv.getArgument(0));

        // Approve without bankTransferRef fails
        assertThrows(
                SystemException.class,
                () ->
                        service.processPayout(
                                401L, new PayoutProcessRequest(true, "   ", "note"), "admin"));

        // Approve with bankTransferRef succeeds
        var paid =
                service.processPayout(
                        401L, new PayoutProcessRequest(true, "UNC-999888", "Đã chuyển"), "admin");
        assertEquals(PayoutStatus.PAID, paid.status());
        assertEquals("UNC-999888", paid.bankTransferRef());
        assertEquals(new BigDecimal("500000"), wallet.getTotalWithdrawnVnd());
        assertEquals(BigDecimal.ZERO, wallet.getPendingPayoutVnd());
        verify(ledger).save(any(WalletTransaction.class));

        // Re-processing already PAID payout fails
        assertThrows(
                SystemException.class,
                () ->
                        service.processPayout(
                                401L, new PayoutProcessRequest(false, null, "no"), "admin"));

        // Reject refunds available balance
        ProviderPayout pending2 = new ProviderPayout();
        pending2.setId(402L);
        pending2.setCode("PO-402");
        pending2.setProvider(p);
        pending2.setAmountVnd(new BigDecimal("300000"));
        pending2.setStatus(PayoutStatus.PENDING);
        wallet.setPendingPayoutVnd(new BigDecimal("200000")); // tests clamp to zero
        when(payouts.findByIdForUpdate(402L)).thenReturn(Optional.of(pending2));

        var rejected =
                service.processPayout(
                        402L, new PayoutProcessRequest(false, null, "Sai STK"), "admin");
        assertEquals(PayoutStatus.REJECTED, rejected.status());
        assertEquals(BigDecimal.ZERO, wallet.getPendingPayoutVnd());
        assertEquals(new BigDecimal("1300000"), wallet.getAvailableBalanceVnd());
    }

    @Test
    @SuppressWarnings("unchecked")
    void listProviderDocumentsResolvesSignedMediaUrlAndHandlesNotFound() {
        ProviderProfile p = provider(20L, ProviderVerificationStatus.PENDING_REVIEW);
        MediaAsset media = new MediaAsset();
        media.setId(77L);
        media.setObjectKey("document/kyc-cert.pdf");
        media.setConfirmed(true);
        media.setDeleted(false);

        ProviderDocument mediaDoc = doc(201L, p, ProviderDocumentStatus.PENDING);
        mediaDoc.setFileUrl(null);
        mediaDoc.setMediaAsset(media);
        mediaDoc.setUpdatedAt(LocalDateTime.of(2026, 11, 20, 10, 0));

        ProviderDocument urlDoc = doc(202L, p, ProviderDocumentStatus.APPROVED);
        urlDoc.setUpdatedAt(LocalDateTime.of(2026, 11, 21, 11, 30));

        ObjectStorageService storage = mock(ObjectStorageService.class);
        when(storage.createSignedDownloadUrl("document/kyc-cert.pdf"))
                .thenReturn("https://storage.local/signed/kyc-cert.pdf?sig=abc");
        ObjectProvider<ObjectStorageService> storageProvider = mock(ObjectProvider.class);
        when(storageProvider.getIfAvailable()).thenReturn(storage);
        mapper.setObjectStorage(storageProvider);

        when(providers.existsById(20L)).thenReturn(true);
        when(documents.findByProviderIdOrderByCreatedAtDesc(20L))
                .thenReturn(List.of(mediaDoc, urlDoc));

        var list = service.listProviderDocuments(20L);
        assertEquals(2, list.size());
        assertEquals(77L, list.get(0).mediaAssetId());
        assertEquals(
                "https://storage.local/signed/kyc-cert.pdf?sig=abc", list.get(0).downloadUrl());
        assertEquals(LocalDateTime.of(2026, 11, 20, 10, 0), list.get(0).updatedAt());
        assertEquals("https://example.com/doc-202.pdf", list.get(1).downloadUrl());
        assertEquals(LocalDateTime.of(2026, 11, 21, 11, 30), list.get(1).updatedAt());

        when(providers.existsById(999L)).thenReturn(false);
        SystemException notFound =
                assertThrows(SystemException.class, () -> service.listProviderDocuments(999L));
        assertEquals("PROVIDER_NOT_FOUND", notFound.getCode());
    }

    @Test
    void moderateProviderDocumentApprovesRejectsAndValidatesNoteAndOwnership() {
        ProviderProfile p = provider(21L, ProviderVerificationStatus.PENDING_REVIEW);
        ProviderDocument d = doc(210L, p, ProviderDocumentStatus.PENDING);

        when(providers.findById(21L)).thenReturn(Optional.of(p));
        when(documents.findByIdAndProviderId(210L, 21L)).thenReturn(Optional.of(d));
        when(documents.save(any(ProviderDocument.class))).thenAnswer(inv -> inv.getArgument(0));

        // Reject without reviewerNote fails
        SystemException noteErr =
                assertThrows(
                        SystemException.class,
                        () ->
                                service.moderateProviderDocument(
                                        21L,
                                        210L,
                                        new ProviderDocumentModerationRequest(
                                                ProviderDocumentStatus.REJECTED, "   "),
                                        "admin"));
        assertEquals("REVIEWER_NOTE_REQUIRED", noteErr.getCode());

        // Reject with reviewerNote succeeds
        var rejected =
                service.moderateProviderDocument(
                        21L,
                        210L,
                        new ProviderDocumentModerationRequest(
                                ProviderDocumentStatus.REJECTED, "Bản scan mờ số hiệu"),
                        "admin");
        assertEquals(ProviderDocumentStatus.REJECTED, rejected.status());
        assertEquals("Bản scan mờ số hiệu", rejected.reviewerNote());

        // Approve succeeds even with optional note
        var approved =
                service.moderateProviderDocument(
                        21L,
                        210L,
                        new ProviderDocumentModerationRequest(
                                ProviderDocumentStatus.APPROVED, "Hợp lệ"),
                        "admin");
        assertEquals(ProviderDocumentStatus.APPROVED, approved.status());
        assertEquals("Hợp lệ", approved.reviewerNote());
        verify(audit, times(2))
                .record(eq(1L), eq("admin"), any(), eq("PROVIDER_DOCUMENT"), eq("210"), any());

        // Missing or cross-provider doc fails
        when(documents.findByIdAndProviderId(999L, 21L)).thenReturn(Optional.empty());
        SystemException docNotFound =
                assertThrows(
                        SystemException.class,
                        () ->
                                service.moderateProviderDocument(
                                        21L,
                                        999L,
                                        new ProviderDocumentModerationRequest(
                                                ProviderDocumentStatus.APPROVED, "OK"),
                                        "admin"));
        assertEquals("DOCUMENT_NOT_FOUND", docNotFound.getCode());

        // Missing provider fails
        when(providers.findById(888L)).thenReturn(Optional.empty());
        SystemException provNotFound =
                assertThrows(
                        SystemException.class,
                        () ->
                                service.moderateProviderDocument(
                                        888L,
                                        210L,
                                        new ProviderDocumentModerationRequest(
                                                ProviderDocumentStatus.APPROVED, "OK"),
                                        "admin"));
        assertEquals("PROVIDER_NOT_FOUND", provNotFound.getCode());
    }

    private static ProviderProfile provider(Long id, ProviderVerificationStatus status) {
        AppUser u = new AppUser();
        u.setId(id + 1000);
        u.setUsername("provider_" + id);
        ProviderProfile p = new ProviderProfile();
        p.setId(id);
        p.setUser(u);
        p.setSlug("sky-team-" + id);
        p.setDisplayName("Sky Team " + id);
        p.setVerificationStatus(status);
        return p;
    }

    private static ProviderDocument doc(Long id, ProviderProfile p, ProviderDocumentStatus status) {
        ProviderDocument d = new ProviderDocument();
        d.setId(id);
        d.setProvider(p);
        d.setDocumentType(ProviderDocumentType.PILOT_CERTIFICATE);
        d.setTitle("Chứng chỉ bay UAV");
        d.setFileUrl("https://example.com/doc-" + id + ".pdf");
        d.setStatus(status);
        return d;
    }
}
