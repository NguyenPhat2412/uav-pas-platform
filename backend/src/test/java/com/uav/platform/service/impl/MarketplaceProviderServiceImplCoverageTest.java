package com.uav.platform.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

import com.uav.platform.dao.IEquipmentDao;
import com.uav.platform.dao.IInvoiceDao;
import com.uav.platform.dao.IMarketplaceListingDao;
import com.uav.platform.dao.IMediaAssetDao;
import com.uav.platform.dao.IMissionBidDao;
import com.uav.platform.dao.IMissionDao;
import com.uav.platform.dao.IMissionEventDao;
import com.uav.platform.dao.IProviderDocumentDao;
import com.uav.platform.dao.IProviderPayoutDao;
import com.uav.platform.dao.IProviderPilotDao;
import com.uav.platform.dao.IProviderProfileDao;
import com.uav.platform.dao.IProviderWalletDao;
import com.uav.platform.dao.IServiceOfferingDao;
import com.uav.platform.dao.IUavDao;
import com.uav.platform.dao.IUserDao;
import com.uav.platform.dao.IWalletTransactionDao;
import com.uav.platform.dto.request.MarketplaceListingUpsertRequest;
import com.uav.platform.dto.request.MissionBidCreateRequest;
import com.uav.platform.dto.request.PayoutCreateRequest;
import com.uav.platform.dto.request.ProviderDocumentCreateRequest;
import com.uav.platform.dto.request.ProviderEquipmentCreateRequest;
import com.uav.platform.dto.request.ProviderOnboardingRequest;
import com.uav.platform.dto.request.ProviderOrderActionRequest;
import com.uav.platform.dto.request.ProviderOrderCompleteRequest;
import com.uav.platform.dto.request.ProviderUavCreateRequest;
import com.uav.platform.dto.response.MarketplaceListingResponse;
import com.uav.platform.dto.response.MissionBidResponse;
import com.uav.platform.dto.response.MissionResponse;
import com.uav.platform.dto.response.ProviderEquipmentResponse;
import com.uav.platform.dto.response.ProviderFleetSummaryResponse;
import com.uav.platform.dto.response.ProviderProfileResponse;
import com.uav.platform.dto.response.ProviderWalletResponse;
import com.uav.platform.entity.AppUser;
import com.uav.platform.entity.Equipment;
import com.uav.platform.entity.MarketplaceListing;
import com.uav.platform.entity.Mission;
import com.uav.platform.entity.MissionBid;
import com.uav.platform.entity.ProviderPilot;
import com.uav.platform.entity.ProviderProfile;
import com.uav.platform.entity.ProviderWallet;
import com.uav.platform.entity.ServiceOffering;
import com.uav.platform.entity.Uav;
import com.uav.platform.enums.EquipmentStatus;
import com.uav.platform.enums.EquipmentType;
import com.uav.platform.enums.ListingModerationStatus;
import com.uav.platform.enums.ListingType;
import com.uav.platform.enums.MissionBidStatus;
import com.uav.platform.enums.MissionStatus;
import com.uav.platform.enums.MissionType;
import com.uav.platform.enums.PricingModel;
import com.uav.platform.enums.ProviderDocumentType;
import com.uav.platform.enums.ProviderOrderStatus;
import com.uav.platform.enums.ProviderType;
import com.uav.platform.enums.ProviderVerificationStatus;
import com.uav.platform.enums.UavStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.MarketplaceMapper;
import com.uav.platform.mapper.MissionMapper;
import com.uav.platform.service.AuditLogService;
import com.uav.platform.service.MarketplaceEscrowService;
import com.uav.platform.service.MissionAccessService;
import com.uav.platform.service.MissionResourceService;
import com.uav.platform.service.NotificationService;
import com.uav.platform.service.SimulationService;
import com.uav.platform.service.SystemConfigService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@ExtendWith(MockitoExtension.class)
class MarketplaceProviderServiceImplCoverageTest {

    @Mock private IUserDao users;
    @Mock private IProviderProfileDao providers;
    @Mock private IProviderDocumentDao documents;
    @Mock private IMarketplaceListingDao listings;
    @Mock private IProviderWalletDao wallets;
    @Mock private IProviderPayoutDao payouts;
    @Mock private IWalletTransactionDao ledger;
    @Mock private IMissionBidDao bids;
    @Mock private IServiceOfferingDao serviceOfferings;
    @Mock private IMediaAssetDao mediaAssets;
    @Mock private IUavDao uavs;
    @Mock private IEquipmentDao equipmentRepository;
    @Mock private IMissionDao missions;
    @Mock private IMissionEventDao missionEvents;
    @Mock private IInvoiceDao invoices;
    @Mock private MissionAccessService missionAccess;
    @Mock private MissionResourceService resources;
    @Mock private MarketplaceEscrowService escrowService;
    @Mock private SystemConfigService systemConfig;
    @Mock private AuditLogService audit;
    @Mock private MarketplaceMapper mapper;
    @Mock private MissionMapper missionMapper;
    @Mock private ObjectProvider<NotificationService> notifications;
    @Mock private IProviderPilotDao pilots;
    @Mock private SimulationService simulationService;

    private MarketplaceProviderServiceImpl service;

    @BeforeEach
    void setUp() {
        service =
                new MarketplaceProviderServiceImpl(
                        users,
                        providers,
                        documents,
                        listings,
                        wallets,
                        payouts,
                        ledger,
                        bids,
                        serviceOfferings,
                        mediaAssets,
                        uavs,
                        equipmentRepository,
                        missions,
                        missionEvents,
                        invoices,
                        missionAccess,
                        resources,
                        escrowService,
                        systemConfig,
                        audit,
                        mapper,
                        missionMapper);
        ReflectionTestUtils.setField(service, "notifications", notifications);
        ReflectionTestUtils.setField(service, "pilots", pilots);
        ReflectionTestUtils.setField(service, "simulationService", simulationService);
        // Leave realtime null intentionally in several paths to cover line 161
    }

    private AppUser user(Long id, String username) {
        AppUser u = new AppUser();
        u.setId(id);
        u.setUsername(username);
        return u;
    }

    private ProviderProfile profile(Long id, AppUser owner, ProviderVerificationStatus status) {
        ProviderProfile p = new ProviderProfile();
        p.setId(id);
        p.setUser(owner);
        p.setDisplayName("Fleet " + id);
        p.setProviderType(ProviderType.INDIVIDUAL);
        p.setVerificationStatus(status);
        return p;
    }

    private MarketplaceListingUpsertRequest listingReq(Long catId, Boolean submit) {
        return new MarketplaceListingUpsertRequest(
                catId,
                "Survey Pro",
                "summary",
                "desc",
                ListingType.FLIGHT_SERVICE,
                MissionType.AREA_INSPECTION,
                PricingModel.PER_HOUR,
                new BigDecimal("500000"),
                null,
                null,
                "Ha Noi",
                null,
                "M350",
                "Ortho",
                null,
                12,
                24,
                submit);
    }

    @Test
    void profileDocumentsListingsFleetAndEquipmentCoverMissingBranches() {
        AppUser owner = user(1L, "owner");
        ProviderProfile prof = profile(10L, owner, ProviderVerificationStatus.VERIFIED);
        ProviderProfile suspended = profile(11L, owner, ProviderVerificationStatus.SUSPENDED);

        // findMyProfile found & empty
        when(providers.findByUserUsername("owner")).thenReturn(Optional.of(prof));
        when(documents.findByProviderIdOrderByCreatedAtDesc(10L)).thenReturn(List.of());
        ProviderProfileResponse pr = mock(ProviderProfileResponse.class);
        when(mapper.toProfileResponse(prof, List.of())).thenReturn(pr);
        assertTrue(service.findMyProfile("owner").isPresent());

        // upsertMyProfile / submitForVerification / deleteDocument / createListing suspended guards
        when(users.findByUsername("susp")).thenReturn(Optional.of(owner));
        when(providers.findByUserId(1L)).thenReturn(Optional.of(suspended));
        assertThrows(
                SystemException.class,
                () ->
                        service.upsertMyProfile(
                                new ProviderOnboardingRequest(
                                        "Fleet",
                                        ProviderType.INDIVIDUAL,
                                        null,
                                        null,
                                        null,
                                        "HN",
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        false),
                                "susp"));

        when(providers.findByUserUsername("susp")).thenReturn(Optional.of(suspended));
        assertThrows(SystemException.class, () -> service.submitForVerification("susp"));
        assertThrows(SystemException.class, () -> service.deleteDocument(1L, "susp"));
        assertThrows(
                SystemException.class,
                () -> service.createListing(listingReq(null, false), "susp"));

        // addDocument mediaAsset not found & missing both fileUrl and mediaAssetId
        when(mediaAssets.findById(99L)).thenReturn(Optional.empty());
        assertThrows(
                SystemException.class,
                () ->
                        service.addDocument(
                                new ProviderDocumentCreateRequest(
                                        ProviderDocumentType.IDENTITY_CARD, "ID", "123", null, 99L),
                                "owner"));
        assertThrows(
                SystemException.class,
                () ->
                        service.addDocument(
                                new ProviderDocumentCreateRequest(
                                        ProviderDocumentType.IDENTITY_CARD,
                                        "ID",
                                        "123",
                                        null,
                                        null),
                                "owner"));

        // listMyListings: empty when no profile, filters deleted when present
        when(providers.findByUserUsername("none")).thenReturn(Optional.empty());
        when(users.findByUsername("none")).thenReturn(Optional.empty());
        assertTrue(service.listMyListings("none").isEmpty());
        assertThrows(SystemException.class, () -> service.getMyWallet("none"));

        MarketplaceListing activeL = new MarketplaceListing();
        activeL.setId(50L);
        activeL.setProvider(prof);
        activeL.setModerationStatus(ListingModerationStatus.PUBLISHED);
        MarketplaceListing deletedL = new MarketplaceListing();
        deletedL.setDeleted(true);
        when(listings.findByProviderIdOrderByCreatedAtDesc(10L))
                .thenReturn(List.of(activeL, deletedL));
        MarketplaceListingResponse lr = mock(MarketplaceListingResponse.class);
        when(mapper.toListingResponse(activeL)).thenReturn(lr);
        assertEquals(1, service.listMyListings("owner").size());

        // createListing DRAFT & categoryServiceId found/notFound
        when(serviceOfferings.findById(777L)).thenReturn(Optional.empty());
        assertThrows(
                SystemException.class,
                () -> service.createListing(listingReq(777L, false), "owner"));

        ServiceOffering cat = new ServiceOffering("AREA_INSPECTION", "Inspection", "Desc", 60);
        cat.setId(77L);
        when(serviceOfferings.findById(77L)).thenReturn(Optional.of(cat));
        when(listings.existsBySlug(any())).thenReturn(false);
        when(listings.save(any())).thenReturn(activeL);
        assertSame(lr, service.createListing(listingReq(77L, false), "owner"));

        // updateListing owned vs missing
        when(listings.findWithDetailsById(50L)).thenReturn(Optional.of(activeL));
        assertSame(lr, service.updateListing(50L, listingReq(null, true), "owner"));
        when(listings.findWithDetailsById(51L)).thenReturn(Optional.empty());
        assertThrows(
                SystemException.class,
                () -> service.updateListing(51L, listingReq(null, false), "owner"));

        // toggleListingPause: PUBLISHED->PAUSED, PAUSED->PUBLISHED (verified), PAUSED unverified,
        // DRAFT invalid
        assertSame(lr, service.toggleListingPause(50L, "owner"));
        assertEquals(ListingModerationStatus.PAUSED, activeL.getModerationStatus());
        assertSame(lr, service.toggleListingPause(50L, "owner"));
        assertEquals(ListingModerationStatus.PUBLISHED, activeL.getModerationStatus());

        activeL.setModerationStatus(ListingModerationStatus.PAUSED);
        prof.setVerificationStatus(ProviderVerificationStatus.PENDING_REVIEW);
        assertThrows(SystemException.class, () -> service.toggleListingPause(50L, "owner"));
        prof.setVerificationStatus(ProviderVerificationStatus.VERIFIED);

        activeL.setModerationStatus(ListingModerationStatus.DRAFT);
        assertThrows(SystemException.class, () -> service.toggleListingPause(50L, "owner"));

        // getMyFleet empty & populated
        assertTrue(service.getMyFleet("none").uavs().isEmpty());
        Uav u1 = new Uav("M30", "S1", "DJI");
        u1.setStatus(UavStatus.AVAILABLE);
        Equipment eq1 = new Equipment("Bat", EquipmentType.BATTERY, null, null);
        eq1.setStatus(EquipmentStatus.ACTIVE);
        when(uavs.findByProviderIdOrderByIdDesc(10L)).thenReturn(List.of(u1));
        when(equipmentRepository.findByProviderIdOrderByIdDesc(10L)).thenReturn(List.of(eq1));
        ProviderFleetSummaryResponse fleet = service.getMyFleet("owner");
        assertEquals(1, fleet.uavs().size());
        assertEquals(1, fleet.equipment().size());

        // registerProviderUav duplicate & registerProviderEquipment duplicate + valid
        when(uavs.existsBySerialNumber("DUP-U")).thenReturn(true);
        assertThrows(
                SystemException.class,
                () ->
                        service.registerProviderUav(
                                new ProviderUavCreateRequest("M30", "DUP-U", "DJI"), "owner"));
        when(equipmentRepository.existsBySerialNumber("DUP-E")).thenReturn(true);
        assertThrows(
                SystemException.class,
                () ->
                        service.registerProviderEquipment(
                                new ProviderEquipmentCreateRequest(
                                        "Cam", EquipmentType.CAMERA, "DUP-E", 1),
                                "owner"));
        when(equipmentRepository.existsBySerialNumber("OK-E")).thenReturn(false);
        when(equipmentRepository.save(any())).thenReturn(eq1);
        ProviderEquipmentResponse eqResp = mock(ProviderEquipmentResponse.class);
        when(mapper.toEquipmentResponse(eq1)).thenReturn(eqResp);
        assertSame(
                eqResp,
                service.registerProviderEquipment(
                        new ProviderEquipmentCreateRequest("Cam", EquipmentType.CAMERA, "OK-E", 2),
                        "owner"));
    }

    @Test
    void ordersRfqsBidsWalletPayoutAndOwnershipGuardsCoverRemainingBranches() {
        AppUser owner = user(1L, "owner");
        AppUser pilotUser = user(2L, "pilot");
        AppUser customer = user(3L, "cust");
        ProviderProfile prof = profile(10L, owner, ProviderVerificationStatus.VERIFIED);
        when(providers.findByUserUsername("owner")).thenReturn(Optional.of(prof));

        // Non-owner pilot trying requireOwnedProfile -> FLEET_OWNER_REQUIRED
        ProviderPilot pilotLink = new ProviderPilot();
        pilotLink.setProvider(prof);
        pilotLink.setPilotUser(pilotUser);
        when(providers.findByUserUsername("pilot")).thenReturn(Optional.empty());
        when(users.findByUsername("pilot")).thenReturn(Optional.of(pilotUser));
        when(pilots.findByPilotUserIdAndDeletedFalse(2L)).thenReturn(List.of(pilotLink));
        assertThrows(SystemException.class, () -> service.submitForVerification("pilot"));

        // respondToOrder: closed order & UAV maintenance & notifyUser exception swallowed
        Mission m = new Mission();
        m.setId(100L);
        m.setCode("MIS-100");
        m.setProvider(prof);
        m.setCustomer(customer);
        m.setStatus(MissionStatus.COMPLETED);
        when(missions.findByIdForUpdate(100L)).thenReturn(Optional.of(m));
        assertThrows(
                SystemException.class,
                () ->
                        service.respondToOrder(
                                100L, new ProviderOrderActionRequest(true, null, "ok"), "owner"));

        m.setStatus(MissionStatus.PENDING_CONFIRMATION);
        Uav maint = new Uav("M30", "S-M", "DJI");
        maint.setId(5L);
        maint.setProvider(prof);
        maint.setStatus(UavStatus.MAINTENANCE);
        when(resources.lockUav(5L)).thenReturn(maint);
        assertThrows(
                SystemException.class,
                () ->
                        service.respondToOrder(
                                100L, new ProviderOrderActionRequest(true, 5L, "ok"), "owner"));

        // Accept order where NotificationService throws -> swallowed, realtime null -> returns
        // safely
        NotificationService notifSvc = mock(NotificationService.class);
        when(notifications.getIfAvailable()).thenReturn(notifSvc);
        doThrow(new RuntimeException("notif boom")).when(notifSvc).sendNotification(any());
        when(resources.lockOperator(1L)).thenReturn(owner);
        when(missions.save(m)).thenReturn(m);
        MissionResponse mResp = mock(MissionResponse.class);
        when(missionMapper.toResponse(m)).thenReturn(mResp);
        assertSame(
                mResp,
                service.respondToOrder(
                        100L, new ProviderOrderActionRequest(true, null, "ok"), "owner"));

        // startOrder: wrong status, no available UAV, and simulationService throwing exception
        m.setStatus(MissionStatus.DRAFT);
        assertThrows(SystemException.class, () -> service.startOrder(100L, "owner"));

        m.setStatus(MissionStatus.CONFIRMED);
        when(uavs.findByProviderIdOrderByIdDesc(10L)).thenReturn(List.of());
        assertThrows(SystemException.class, () -> service.startOrder(100L, "owner"));

        Uav readyUav = new Uav("M350", "S-OK", "DJI");
        readyUav.setId(6L);
        readyUav.setProvider(prof);
        readyUav.setStatus(UavStatus.AVAILABLE);
        m.setUav(readyUav);
        when(resources.lockUav(6L)).thenReturn(readyUav);
        doThrow(new RuntimeException("sim failed"))
                .when(simulationService)
                .rehearseMission(any(), any(), any(), any(), any());
        assertSame(mResp, service.startOrder(100L, "owner"));

        // completeOrder: blank note, wrong status, simulationService.stop throwing
        assertThrows(
                SystemException.class,
                () ->
                        service.completeOrder(
                                100L, new ProviderOrderCompleteRequest("   ", null), "owner"));
        m.setStatus(MissionStatus.DRAFT);
        assertThrows(
                SystemException.class,
                () ->
                        service.completeOrder(
                                100L, new ProviderOrderCompleteRequest("Done", null), "owner"));
        m.setStatus(MissionStatus.IN_PROGRESS);
        doThrow(new RuntimeException("already stopped")).when(simulationService).stop(6L, "owner");
        assertSame(
                mResp,
                service.completeOrder(
                        100L, new ProviderOrderCompleteRequest("Done", "Good"), "owner"));

        // RFQ disabled -> listOpenRfqs empty & submitRfqBid conflict
        when(users.findByUsername("owner")).thenReturn(Optional.of(owner));
        when(systemConfig.valueOrDefault(eq("marketplace.rfq_enabled"), anyString()))
                .thenReturn("false");
        assertTrue(service.listOpenRfqs("owner").isEmpty());
        assertThrows(
                SystemException.class,
                () ->
                        service.submitRfqBid(
                                100L,
                                new MissionBidCreateRequest(
                                        new BigDecimal("200000"), 12, "plan", "M350"),
                                "owner"));

        // RFQ enabled error branches: closed, self-bid, already accepted
        when(systemConfig.valueOrDefault(eq("marketplace.rfq_enabled"), anyString()))
                .thenReturn("true");
        m.setStatus(MissionStatus.COMPLETED);
        assertThrows(
                SystemException.class,
                () ->
                        service.submitRfqBid(
                                100L,
                                new MissionBidCreateRequest(
                                        new BigDecimal("200000"), 12, "plan", "M350"),
                                "owner"));

        m.setStatus(MissionStatus.DRAFT);
        m.setProviderResponseStatus(ProviderOrderStatus.OPEN_RFQ);
        m.setCustomer(owner);
        assertThrows(
                SystemException.class,
                () ->
                        service.submitRfqBid(
                                100L,
                                new MissionBidCreateRequest(
                                        new BigDecimal("200000"), 12, "plan", "M350"),
                                "owner"));

        m.setCustomer(customer);
        MissionBid acceptedBid = new MissionBid();
        acceptedBid.setId(70L);
        acceptedBid.setMission(m);
        acceptedBid.setProvider(prof);
        acceptedBid.setStatus(MissionBidStatus.ACCEPTED);
        when(bids.findByMissionIdAndProviderId(100L, 10L)).thenReturn(Optional.of(acceptedBid));
        assertThrows(
                SystemException.class,
                () ->
                        service.submitRfqBid(
                                100L,
                                new MissionBidCreateRequest(
                                        new BigDecimal("200000"), 12, "plan", "M350"),
                                "owner"));

        // listMyBids & listBidsForMission
        when(bids.findByProviderIdOrderByCreatedAtDesc(10L)).thenReturn(List.of(acceptedBid));
        MissionBidResponse bidResp = mock(MissionBidResponse.class);
        when(mapper.toBidResponse(acceptedBid)).thenReturn(bidResp);
        assertEquals(1, service.listMyBids("owner").size());
        assertTrue(service.listMyBids("none").isEmpty());

        Authentication custAuth = mock(Authentication.class);
        when(custAuth.getName()).thenReturn("cust");
        when(missionAccess.accessible(100L, custAuth)).thenReturn(m);
        when(bids.findByMissionIdOrderByProposedPriceVndAscCreatedAtAsc(100L))
                .thenReturn(List.of(acceptedBid));
        assertEquals(1, service.listBidsForMission(100L, custAuth).size());

        // acceptMissionBid: non-owner denied, closed RFQ, non-pending bid, unverified provider,
        // winning + rejecting other pending bid
        Authentication otherAuth = mock(Authentication.class);
        when(otherAuth.getName()).thenReturn("other");
        when(missionAccess.accessibleForUpdate(100L, otherAuth)).thenReturn(m);
        when(missionAccess.hasAuthority(otherAuth, "USER_MANAGE")).thenReturn(false);
        assertThrows(
                AccessDeniedException.class, () -> service.acceptMissionBid(100L, 70L, otherAuth));

        when(missionAccess.accessibleForUpdate(100L, custAuth)).thenReturn(m);
        m.setProviderResponseStatus(ProviderOrderStatus.ACCEPTED);
        assertThrows(SystemException.class, () -> service.acceptMissionBid(100L, 70L, custAuth));
        m.setProviderResponseStatus(ProviderOrderStatus.OPEN_RFQ);

        when(bids.findById(70L)).thenReturn(Optional.of(acceptedBid));
        assertThrows(SystemException.class, () -> service.acceptMissionBid(100L, 70L, custAuth));

        MissionBid winBid = new MissionBid();
        winBid.setId(71L);
        winBid.setMission(m);
        winBid.setProvider(prof);
        winBid.setStatus(MissionBidStatus.PENDING);
        winBid.setProposedPriceVnd(new BigDecimal("300000"));
        MissionBid loseBid = new MissionBid();
        loseBid.setId(72L);
        loseBid.setMission(m);
        loseBid.setProvider(prof);
        loseBid.setStatus(MissionBidStatus.PENDING);

        prof.setVerificationStatus(ProviderVerificationStatus.PENDING_REVIEW);
        when(bids.findById(71L)).thenReturn(Optional.of(winBid));
        assertThrows(SystemException.class, () -> service.acceptMissionBid(100L, 71L, custAuth));
        prof.setVerificationStatus(ProviderVerificationStatus.VERIFIED);

        when(bids.findByMissionIdOrderByProposedPriceVndAscCreatedAtAsc(100L))
                .thenReturn(List.of(winBid, loseBid));
        assertSame(mResp, service.acceptMissionBid(100L, 71L, custAuth));
        assertEquals(MissionBidStatus.REJECTED, loseBid.getStatus());

        // getMyWallet when wallet missing falls back to empty wallet
        when(wallets.findByProviderId(10L)).thenReturn(Optional.empty());
        when(payouts.findByProviderIdOrderByCreatedAtDesc(10L)).thenReturn(List.of());
        when(escrowService.effectivePlatformFeeRate(10L)).thenReturn(new BigDecimal("0.10"));
        ProviderWalletResponse walletResp = service.getMyWallet("owner");
        assertTrue(walletResp.recentTransactions().isEmpty());

        // requestPayout: missing bank info, auto-create wallet, exceeds max, insufficient balance,
        // unverified
        assertThrows(
                SystemException.class,
                () ->
                        service.requestPayout(
                                new PayoutCreateRequest(new BigDecimal("200000"), null), "owner"));

        prof.setBankName("VCB");
        prof.setBankAccountNumber("12345678");
        prof.setBankAccountHolder("OWNER");
        ProviderWallet wallet = new ProviderWallet();
        wallet.setProvider(prof);
        wallet.setAvailableBalanceVnd(new BigDecimal("150000"));
        when(wallets.findByProviderIdForUpdate(10L)).thenReturn(Optional.of(wallet));

        assertThrows(
                SystemException.class,
                () ->
                        service.requestPayout(
                                new PayoutCreateRequest(new BigDecimal("999999999"), null),
                                "owner"));
        assertThrows(
                SystemException.class,
                () ->
                        service.requestPayout(
                                new PayoutCreateRequest(new BigDecimal("200000"), null), "owner"));

        // Unverified profile cannot request payout
        prof.setVerificationStatus(ProviderVerificationStatus.PENDING_REVIEW);
        assertThrows(
                SystemException.class,
                () ->
                        service.requestPayout(
                                new PayoutCreateRequest(new BigDecimal("100000"), null), "owner"));
    }
}
