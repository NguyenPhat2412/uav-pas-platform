package com.uav.platform.integration.marketplace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.request.marketplace.admin.ListingModerationRequest;
import com.uav.platform.dto.request.marketplace.admin.ProviderModerationRequest;
import com.uav.platform.dto.request.marketplace.catalog.MissionBidCreateRequest;
import com.uav.platform.dto.request.marketplace.escrow.PayoutCreateRequest;
import com.uav.platform.dto.request.marketplace.escrow.PayoutProcessRequest;
import com.uav.platform.dto.request.marketplace.provider.MarketplaceListingUpsertRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderDocumentCreateRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderOnboardingRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderOrderActionRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderOrderCompleteRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderUavCreateRequest;
import com.uav.platform.dto.request.mission.flightplan.MissionReviewUpsertRequest;
import com.uav.platform.dto.request.mission.lifecycle.MissionCreateRequest;
import com.uav.platform.dto.request.settings.UpdateConfigurationRequest;
import com.uav.platform.entity.billing.Invoice;
import com.uav.platform.entity.media.MediaAsset;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.billing.InvoiceStatus;
import com.uav.platform.enums.marketplace.EscrowStatus;
import com.uav.platform.enums.marketplace.ListingModerationStatus;
import com.uav.platform.enums.marketplace.ListingType;
import com.uav.platform.enums.marketplace.PayoutStatus;
import com.uav.platform.enums.marketplace.PricingModel;
import com.uav.platform.enums.marketplace.ProviderDocumentType;
import com.uav.platform.enums.marketplace.ProviderType;
import com.uav.platform.enums.marketplace.ProviderVerificationStatus;
import com.uav.platform.enums.marketplace.WalletTransactionType;
import com.uav.platform.enums.media.MediaType;
import com.uav.platform.enums.mission.MissionPriority;
import com.uav.platform.enums.mission.MissionStatus;
import com.uav.platform.enums.mission.MissionType;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.billing.InvoiceRepository;
import com.uav.platform.repository.media.MediaAssetRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.marketplace.admin.MarketplaceAdminService;
import com.uav.platform.service.marketplace.catalog.MarketplaceCatalogService;
import com.uav.platform.service.marketplace.escrow.MarketplaceEscrowService;
import com.uav.platform.service.marketplace.provider.MarketplaceProviderService;
import com.uav.platform.service.mission.flightplan.MissionExtendedWorkflowService;
import com.uav.platform.service.mission.lifecycle.MissionLifecycleService;
import com.uav.platform.service.settings.SystemConfigService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@SpringBootTest(
        properties =
                "spring.datasource.url=jdbc:h2:mem:uav_marketplace;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE")
class MarketplacePlatformIntegrationTest {

    @Autowired WebApplicationContext context;
    @Autowired UserRepository users;
    @Autowired InvoiceRepository invoices;
    @Autowired MediaAssetRepository mediaAssets;
    @Autowired SystemConfigService systemConfig;
    @Autowired MarketplaceCatalogService catalogService;
    @Autowired MarketplaceProviderService providerService;
    @Autowired MarketplaceAdminService adminService;
    @Autowired MarketplaceEscrowService escrowService;
    @Autowired MissionLifecycleService missionLifecycle;
    @Autowired MissionExtendedWorkflowService extendedWorkflow;

    MockMvc mvc;

    @BeforeEach
    void setupMvc() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @Test
    void fullTwoSidedMarketplaceBookingEscrowReviewAndPayoutLifecycle() throws Exception {
        AppUser admin = createUser("mkt_admin_" + suffix(), UserRole.ROLE_ADMIN);
        AppUser seller = createUser("mkt_seller_" + suffix(), UserRole.ROLE_PILOT);
        AppUser rivalSeller = createUser("mkt_rival_" + suffix(), UserRole.ROLE_PILOT);
        AppUser buyer = createUser("mkt_buyer_" + suffix(), UserRole.ROLE_PILOT);

        // 1. Seller onboarding + KYC submission -> Admin approves
        var profile =
                providerService.upsertMyProfile(
                        new ProviderOnboardingRequest(
                                "SkyMap Survey Vietnam",
                                ProviderType.COMPANY,
                                "0109988776",
                                "CAAV-VN-2026-889",
                                "Đơn vị khảo sát địa hình RTK & LiDAR chuyên nghiệp.",
                                "TP. Hồ Chí Minh",
                                250,
                                "0909123456",
                                "Vietcombank",
                                "0071009988776",
                                "CONG TY TNHH SKYMAP",
                                true),
                        seller.getUsername());
        assertEquals(ProviderVerificationStatus.PENDING_REVIEW, profile.verificationStatus());

        providerService.addDocument(
                new ProviderDocumentCreateRequest(
                        ProviderDocumentType.PILOT_CERTIFICATE,
                        "Chứng chỉ điều khiển UAV hạng A",
                        "CAAV-889",
                        "https://example.com/kyc/pilot-cert.pdf",
                        null),
                seller.getUsername());

        var verified =
                adminService.moderateProvider(
                        profile.id(),
                        new ProviderModerationRequest(
                                ProviderVerificationStatus.VERIFIED,
                                "Hồ sơ pháp lý & giấy phép bay hợp lệ.",
                                new BigDecimal("0.1000")),
                        admin.getUsername());
        assertEquals(ProviderVerificationStatus.VERIFIED, verified.verificationStatus());

        // Rival provider setup to verify strict 3P fleet tenant isolation
        var rivalProfile =
                providerService.upsertMyProfile(
                        new ProviderOnboardingRequest(
                                "Rival Drone Team",
                                ProviderType.INDIVIDUAL,
                                "079099001122",
                                "CAAV-999",
                                "Đối tác khác",
                                "Hà Nội",
                                100,
                                "0912000111",
                                "ACB",
                                "12345678",
                                "NGUYEN VAN B",
                                true),
                        rivalSeller.getUsername());
        adminService.moderateProvider(
                rivalProfile.id(),
                new ProviderModerationRequest(
                        ProviderVerificationStatus.VERIFIED, "OK", new BigDecimal("0.1000")),
                admin.getUsername());
        var rivalUav =
                providerService.registerProviderUav(
                        new ProviderUavCreateRequest("Matrice 350", "SN-RIVAL-" + suffix(), "DJI"),
                        rivalSeller.getUsername());

        // 2. Seller registers 3P UAV + creates Marketplace Listing -> Admin publishes
        var sellerUav =
                providerService.registerProviderUav(
                        new ProviderUavCreateRequest(
                                "DJI Matrice 350 RTK", "SN-SKYMAP-" + suffix(), "DJI"),
                        seller.getUsername());

        var draftListing =
                providerService.createListing(
                        new MarketplaceListingUpsertRequest(
                                null,
                                "Khảo sát bản đồ địa hình RTK LiDAR độ chính xác cao",
                                "Đo vẽ bình đồ 1/500 & mô hình DEM/DSM trọn gói có phi công",
                                "Bao gồm xin phép bay, trạm base RTK và xử lý dữ liệu chuẩn VN-2000.",
                                ListingType.FLIGHT_SERVICE,
                                MissionType.DATA_COLLECTION,
                                PricingModel.PER_HECTARE,
                                new BigDecimal("500000"),
                                new BigDecimal("10"),
                                BigDecimal.ZERO,
                                "TP. Hồ Chí Minh",
                                250,
                                "DJI Matrice 350 RTK + Zenmuse L2 LiDAR",
                                "GeoTIFF, LAS Point Cloud, Báo cáo trắc địa PDF",
                                null,
                                24,
                                48,
                                true),
                        seller.getUsername());
        assertEquals(ListingModerationStatus.PENDING_REVIEW, draftListing.moderationStatus());

        var published =
                adminService.moderateListing(
                        draftListing.id(),
                        new ListingModerationRequest(
                                ListingModerationStatus.PUBLISHED, "Đủ điều kiện xuất bản", true),
                        admin.getUsername());
        assertEquals(ListingModerationStatus.PUBLISHED, published.moderationStatus());

        // Public unauthenticated HTTP access check
        mvc.perform(
                        get(ApiRoutes.Marketplace.PUBLIC_BASE
                                        + ApiRoutes.Marketplace.PUBLIC_LISTINGS)
                                .param("keyword", "LiDAR"))
                .andExpect(status().isOk());

        var detail = catalogService.getPublicListingBySlug(published.slug());
        assertEquals(published.id(), detail.listing().id());

        // 3. Self-booking guard: Seller cannot book their own listing
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        LocalDateTime start = tomorrow.atTime(8, 0);
        LocalDateTime end = tomorrow.atTime(12, 0);
        SystemException selfErr =
                assertThrows(
                        SystemException.class,
                        () ->
                                missionLifecycle.create(
                                        new MissionCreateRequest(
                                                MissionType.DATA_COLLECTION,
                                                "Tự đặt đơn",
                                                "Test",
                                                tomorrow,
                                                start,
                                                end,
                                                "Khu công nghiệp Hiệp Phước",
                                                new BigDecimal("10.6350"),
                                                new BigDecimal("106.7420"),
                                                null,
                                                MissionPriority.NORMAL,
                                                null,
                                                null,
                                                published.id(),
                                                new BigDecimal("20"),
                                                false),
                                        seller.getUsername()));
        assertEquals("SELF_BOOKING_FORBIDDEN", selfErr.getCode());

        // 4. Buyer books 20 hectares @ 500,000 VND/ha = 10,000,000 VND
        var bookedMission =
                missionLifecycle.create(
                        new MissionCreateRequest(
                                MissionType.DATA_COLLECTION,
                                "Khảo sát 20ha Khu đô thị Nam Sài Gòn",
                                "Cần bình đồ trực giao GSD 2cm",
                                tomorrow,
                                start,
                                end,
                                "Nhà Bè, TP.HCM",
                                new BigDecimal("10.6800"),
                                new BigDecimal("106.7200"),
                                null,
                                MissionPriority.HIGH,
                                "Bàn giao hệ tọa độ VN-2000",
                                null,
                                published.id(),
                                new BigDecimal("20"),
                                false),
                        buyer.getUsername());
        assertEquals(0, new BigDecimal("10000000").compareTo(bookedMission.quotedSubtotalVnd()));
        assertEquals(profile.id(), bookedMission.providerId());

        var buyerAuth = authToken(buyer);
        missionLifecycle.submit(bookedMission.id(), buyerAuth);

        // Tenant isolation check: Seller cannot assign Rival's UAV!
        SystemException crossTenantErr =
                assertThrows(
                        SystemException.class,
                        () ->
                                providerService.respondToOrder(
                                        bookedMission.id(),
                                        new ProviderOrderActionRequest(
                                                true, rivalUav.id(), "Thử gán UAV người khác"),
                                        seller.getUsername()));
        assertEquals("PROVIDER_UAV_MISMATCH", crossTenantErr.getCode());

        // Seller accepts with their own UAV -> Escrow Invoice issued
        var acceptedOrder =
                providerService.respondToOrder(
                        bookedMission.id(),
                        new ProviderOrderActionRequest(
                                true, sellerUav.id(), "Đội bay sẵn sàng cất cánh đúng lịch."),
                        seller.getUsername());
        assertEquals(MissionStatus.READY, acceptedOrder.status());

        List<Invoice> missionInvoices = invoices.findByMissionIdOrderByIdDesc(bookedMission.id());
        assertEquals(1, missionInvoices.size());
        Invoice escrowInvoice = missionInvoices.get(0);
        assertEquals(0, new BigDecimal("10000000").compareTo(escrowInvoice.getAmount()));
        assertEquals(EscrowStatus.UNFUNDED, escrowInvoice.getEscrowStatus());

        // 5. Buyer funds Escrow -> Seller executes & completes -> Buyer reviews & accepts
        // deliverables
        escrowInvoice.setStatus(InvoiceStatus.PAID);
        escrowInvoice.setPaidAt(LocalDateTime.now());
        invoices.saveAndFlush(escrowInvoice);
        escrowService.onInvoicePaid(escrowInvoice.getId());

        var heldWallet = providerService.getMyWallet(seller.getUsername());
        assertEquals(0, new BigDecimal("9000000").compareTo(heldWallet.escrowHeldVnd()));
        assertEquals(0, BigDecimal.ZERO.compareTo(heldWallet.availableBalanceVnd()));

        providerService.startOrder(bookedMission.id(), seller.getUsername());
        var completedOrder =
                providerService.completeOrder(
                        bookedMission.id(),
                        new ProviderOrderCompleteRequest(
                                "Đã tải lên bình đồ GeoTIFF + đám mây điểm LAS đầy đủ.",
                                "Thiết bị hoạt động hoàn hảo."),
                        seller.getUsername());
        assertEquals(MissionStatus.COMPLETED, completedOrder.status());

        extendedWorkflow.upsertReview(
                bookedMission.id(),
                new MissionReviewUpsertRequest(
                        5, 5, 5, true, "Dữ liệu cực kỳ sắc nét, bàn giao trước hạn!"),
                buyerAuth);

        // Verify Escrow Released: 10,000,000 gross -> 1,000,000 platform fee -> 9,000,000 available
        var releasedWallet = providerService.getMyWallet(seller.getUsername());
        assertEquals(0, BigDecimal.ZERO.compareTo(releasedWallet.escrowHeldVnd()));
        assertEquals(0, new BigDecimal("9000000").compareTo(releasedWallet.availableBalanceVnd()));
        assertEquals(0, new BigDecimal("9000000").compareTo(releasedWallet.totalEarnedVnd()));

        var refreshedDetail = catalogService.getPublicListingBySlug(published.slug());
        assertEquals(0, new BigDecimal("5.00").compareTo(refreshedDetail.listing().ratingAvg()));
        assertEquals(1, refreshedDetail.listing().reviewCount());

        // 6. Seller requests Payout of 5,000,000 -> Admin settles payout
        var payout =
                providerService.requestPayout(
                        new PayoutCreateRequest(new BigDecimal("5000000"), "Rút doanh thu đợt 1"),
                        seller.getUsername());
        assertEquals(PayoutStatus.PENDING, payout.status());

        var processedPayout =
                adminService.processPayout(
                        payout.id(),
                        new PayoutProcessRequest(true, "VCB-UNC-20261115-001", "Đã chuyển khoản"),
                        admin.getUsername());
        assertEquals(PayoutStatus.PAID, processedPayout.status());

        var finalWallet = providerService.getMyWallet(seller.getUsername());
        assertEquals(0, new BigDecimal("4000000").compareTo(finalWallet.availableBalanceVnd()));
        assertEquals(0, new BigDecimal("5000000").compareTo(finalWallet.totalWithdrawnVnd()));
        assertEquals(0, BigDecimal.ZERO.compareTo(finalWallet.pendingPayoutVnd()));

        // 7. Open RFQ Bidding Flow
        var rfqMission =
                missionLifecycle.create(
                        new MissionCreateRequest(
                                MissionType.AREA_INSPECTION,
                                "Tìm đối tác kiểm tra nhiệt đường dây 110kV",
                                "Tuyến dài 15km, cần camera nhiệt bức xạ",
                                tomorrow.plusDays(2),
                                start.plusDays(2),
                                end.plusDays(2),
                                "Đồng Nai",
                                new BigDecimal("10.9500"),
                                new BigDecimal("106.8200"),
                                null,
                                MissionPriority.HIGH,
                                null,
                                null,
                                null,
                                null,
                                true),
                        buyer.getUsername());
        missionLifecycle.submit(rfqMission.id(), buyerAuth);
        assertTrue(
                providerService.listOpenRfqs(seller.getUsername()).stream()
                        .anyMatch(m -> m.id().equals(rfqMission.id())));

        var bid =
                providerService.submitRfqBid(
                        rfqMission.id(),
                        new MissionBidCreateRequest(
                                new BigDecimal("7500000"),
                                36,
                                "Sử dụng DJI M350 RTK + Zenmuse H20T chụp ảnh nhiệt toàn tuyến.",
                                "DJI Matrice 350 RTK + H20T"),
                        seller.getUsername());

        var awarded = providerService.acceptMissionBid(rfqMission.id(), bid.id(), buyerAuth);
        assertEquals(MissionStatus.CONFIRMED, awarded.status());
        assertEquals(profile.id(), awarded.providerId());
        assertEquals(0, new BigDecimal("7500000").compareTo(awarded.quotedSubtotalVnd()));
    }

    @Test
    void dynamicSettingsSecurityDisputeAndRefundEdgeCases() {
        AppUser admin = createUser("edge_admin_" + suffix(), UserRole.ROLE_ADMIN);
        AppUser seller = createUser("edge_seller_" + suffix(), UserRole.ROLE_PILOT);
        AppUser otherUser = createUser("edge_other_" + suffix(), UserRole.ROLE_PILOT);
        AppUser buyer = createUser("edge_buyer_" + suffix(), UserRole.ROLE_PILOT);
        var adminAuth = authToken(admin);
        var buyerAuth = authToken(buyer);

        try {
            // 1. Dynamic default radius & public site-info exposure
            systemConfig.update(
                    "marketplace.default_service_radius_km",
                    new UpdateConfigurationRequest("175", null),
                    adminAuth);
            assertEquals(
                    "175",
                    systemConfig
                            .publicSiteInfo()
                            .settings()
                            .get("marketplace.default_service_radius_km"));

            var profile =
                    providerService.upsertMyProfile(
                            new ProviderOnboardingRequest(
                                    "AeroGuard Partner " + suffix(),
                                    ProviderType.COMPANY,
                                    "0319998887",
                                    "CAAV-EDGE-01",
                                    "Đơn vị bay kiểm định an toàn",
                                    "Đà Nẵng",
                                    null,
                                    "0905111222",
                                    "Techcombank",
                                    "1903888999001",
                                    "CONG TY AEROGUARD",
                                    true),
                            seller.getUsername());
            assertEquals(175, profile.serviceRadiusKm());

            // 2. Security: reject javascript: XSS URL and cross-user MediaAsset IDOR
            SystemException xssDocErr =
                    assertThrows(
                            SystemException.class,
                            () ->
                                    providerService.addDocument(
                                            new ProviderDocumentCreateRequest(
                                                    ProviderDocumentType.BUSINESS_LICENSE,
                                                    "Giấy phép",
                                                    "GP-01",
                                                    "javascript:alert(document.cookie)",
                                                    null),
                                            seller.getUsername()));
            assertEquals("INVALID_EXTERNAL_URL", xssDocErr.getCode());

            MediaAsset foreignMedia = new MediaAsset();
            foreignMedia.setOriginalName("secret.pdf");
            foreignMedia.setObjectKey("private/" + UUID.randomUUID() + ".pdf");
            foreignMedia.setContentType("application/pdf");
            foreignMedia.setSize(1024L);
            foreignMedia.setType(MediaType.DOCUMENT);
            foreignMedia.setUploadedBy(otherUser.getUsername());
            foreignMedia.setStorageProvider("LOCAL");
            foreignMedia.setConfirmed(true);
            MediaAsset savedForeign = mediaAssets.save(foreignMedia);

            SystemException idorErr =
                    assertThrows(
                            SystemException.class,
                            () ->
                                    providerService.addDocument(
                                            new ProviderDocumentCreateRequest(
                                                    ProviderDocumentType.PILOT_CERTIFICATE,
                                                    "CCCD",
                                                    "001",
                                                    null,
                                                    savedForeign.getId()),
                                            seller.getUsername()));
            assertEquals("MEDIA_ACCESS_DENIED", idorErr.getCode());

            adminService.moderateProvider(
                    profile.id(),
                    new ProviderModerationRequest(
                            ProviderVerificationStatus.VERIFIED, "OK", new BigDecimal("0.1000")),
                    admin.getUsername());

            SystemException xssListingErr =
                    assertThrows(
                            SystemException.class,
                            () ->
                                    providerService.createListing(
                                            new MarketplaceListingUpsertRequest(
                                                    null,
                                                    "Dịch vụ bay kiểm tra cầu cảng",
                                                    null,
                                                    null,
                                                    ListingType.FLIGHT_SERVICE,
                                                    MissionType.AREA_INSPECTION,
                                                    PricingModel.PER_PACKAGE,
                                                    new BigDecimal("4000000"),
                                                    BigDecimal.ONE,
                                                    BigDecimal.ZERO,
                                                    "Đà Nẵng",
                                                    null,
                                                    null,
                                                    null,
                                                    "data:text/html,<script>alert(1)</script>",
                                                    12,
                                                    24,
                                                    true),
                                            seller.getUsername()));
            assertEquals("INVALID_EXTERNAL_URL", xssListingErr.getCode());

            var listing =
                    providerService.createListing(
                            new MarketplaceListingUpsertRequest(
                                    null,
                                    "Dịch vụ bay kiểm tra cầu cảng chuyên sâu",
                                    "Kiểm tra kết cấu nhịp cầu bằng camera zoom 200x",
                                    null,
                                    ListingType.FLIGHT_SERVICE,
                                    MissionType.AREA_INSPECTION,
                                    PricingModel.PER_PACKAGE,
                                    new BigDecimal("4000000"),
                                    BigDecimal.ONE,
                                    BigDecimal.ZERO,
                                    "Đà Nẵng",
                                    null,
                                    null,
                                    null,
                                    "https://images.example.com/bridge-inspection.jpg",
                                    12,
                                    24,
                                    true),
                            seller.getUsername());
            assertEquals(175, listing.serviceRadiusKm());
            var pubListing =
                    adminService.moderateListing(
                            listing.id(),
                            new ListingModerationRequest(
                                    ListingModerationStatus.PUBLISHED, "Approved", false),
                            admin.getUsername());

            // 3. Dynamic require_escrow_before_start + Dispute -> Release + Lock after Release
            systemConfig.update(
                    "marketplace.require_escrow_before_start",
                    new UpdateConfigurationRequest("true", null),
                    adminAuth);

            LocalDate tomorrow = LocalDate.now().plusDays(1);
            LocalDateTime start = tomorrow.atTime(9, 0);
            LocalDateTime end = tomorrow.atTime(11, 0);

            var m1 =
                    missionLifecycle.create(
                            new MissionCreateRequest(
                                    MissionType.AREA_INSPECTION,
                                    "Kiểm tra cầu Thuận Phước",
                                    "Quét toàn bộ trụ tháp",
                                    tomorrow,
                                    start,
                                    end,
                                    "Đà Nẵng",
                                    new BigDecimal("16.0950"),
                                    new BigDecimal("108.2210"),
                                    null,
                                    MissionPriority.NORMAL,
                                    null,
                                    null,
                                    pubListing.id(),
                                    BigDecimal.ONE,
                                    false),
                            buyer.getUsername());
            missionLifecycle.submit(m1.id(), buyerAuth);
            // Invoice is issued immediately on submit for fixed-price marketplace booking!
            List<Invoice> m1Invoices = invoices.findByMissionIdOrderByIdDesc(m1.id());
            assertEquals(1, m1Invoices.size());

            providerService.respondToOrder(
                    m1.id(),
                    new ProviderOrderActionRequest(true, null, "Nhận đơn"),
                    seller.getUsername());

            SystemException unpaidStartErr =
                    assertThrows(
                            SystemException.class,
                            () -> providerService.startOrder(m1.id(), seller.getUsername()));
            assertEquals("ESCROW_FUNDING_REQUIRED", unpaidStartErr.getCode());

            Invoice inv1 = m1Invoices.get(0);
            inv1.setStatus(InvoiceStatus.PAID);
            inv1.setPaidAt(LocalDateTime.now());
            invoices.saveAndFlush(inv1);
            escrowService.onInvoicePaid(inv1.getId());

            providerService.startOrder(m1.id(), seller.getUsername());
            providerService.completeOrder(
                    m1.id(),
                    new ProviderOrderCompleteRequest("Bàn giao đợt 1", "Tốt"),
                    seller.getUsername());

            // Buyer rejects deliverables -> DISPUTED (funds stay locked, not released!)
            extendedWorkflow.upsertReview(
                    m1.id(),
                    new MissionReviewUpsertRequest(
                            2, 2, 3, false, "Thiếu góc chụp mố cầu phía Đông, đề nghị bổ sung."),
                    buyerAuth);
            Invoice disputed = invoices.findById(inv1.getId()).orElseThrow();
            assertEquals(EscrowStatus.DISPUTED, disputed.getEscrowStatus());
            assertEquals(
                    0,
                    new BigDecimal("3600000")
                            .compareTo(
                                    providerService
                                            .getMyWallet(seller.getUsername())
                                            .escrowHeldVnd()));

            // Buyer accepts after supplement -> DISPUTED -> RELEASED
            extendedWorkflow.upsertReview(
                    m1.id(),
                    new MissionReviewUpsertRequest(
                            5, 5, 4, true, "Đã nhận đủ ảnh bổ sung đạt chuẩn."),
                    buyerAuth);
            Invoice released = invoices.findById(inv1.getId()).orElseThrow();
            assertEquals(EscrowStatus.RELEASED, released.getEscrowStatus());

            // Cannot revoke acceptance once Escrow is RELEASED
            SystemException revokeErr =
                    assertThrows(
                            SystemException.class,
                            () ->
                                    extendedWorkflow.upsertReview(
                                            m1.id(),
                                            new MissionReviewUpsertRequest(
                                                    1, 1, 1, false, "Thử rút lại"),
                                            buyerAuth));
            assertEquals("ESCROW_ALREADY_RELEASED", revokeErr.getCode());

            // 4. Dynamic min_payout_vnd enforcement
            systemConfig.update(
                    "marketplace.min_payout_vnd",
                    new UpdateConfigurationRequest("500000", null),
                    adminAuth);
            SystemException minPayoutErr =
                    assertThrows(
                            SystemException.class,
                            () ->
                                    providerService.requestPayout(
                                            new PayoutCreateRequest(
                                                    new BigDecimal("200000"), "Rút dưới hạn mức"),
                                            seller.getUsername()));
            assertEquals("PAYOUT_BELOW_MINIMUM", minPayoutErr.getCode());

            // 5. Escrow Refund when funded mission is cancelled before completion
            var m2 =
                    missionLifecycle.create(
                            new MissionCreateRequest(
                                    MissionType.AREA_INSPECTION,
                                    "Đơn kiểm tra hủy trước khi bay",
                                    "Kiểm tra luồng hoàn Escrow",
                                    tomorrow.plusDays(1),
                                    start.plusDays(1),
                                    end.plusDays(1),
                                    "Đà Nẵng",
                                    new BigDecimal("16.0800"),
                                    new BigDecimal("108.2200"),
                                    null,
                                    MissionPriority.NORMAL,
                                    null,
                                    null,
                                    pubListing.id(),
                                    BigDecimal.ONE,
                                    false),
                            buyer.getUsername());
            missionLifecycle.submit(m2.id(), buyerAuth);
            Invoice inv2 = invoices.findByMissionIdOrderByIdDesc(m2.id()).get(0);
            inv2.setStatus(InvoiceStatus.PAID);
            inv2.setPaidAt(LocalDateTime.now());
            invoices.saveAndFlush(inv2);
            escrowService.onInvoicePaid(inv2.getId());
            assertEquals(
                    0,
                    new BigDecimal("3600000")
                            .compareTo(
                                    providerService
                                            .getMyWallet(seller.getUsername())
                                            .escrowHeldVnd()));

            missionLifecycle.cancel(m2.id(), "Thay đổi kế hoạch công trường", buyerAuth);
            Invoice refunded = invoices.findById(inv2.getId()).orElseThrow();
            assertEquals(EscrowStatus.REFUNDED, refunded.getEscrowStatus());
            var walletAfterRefund = providerService.getMyWallet(seller.getUsername());
            assertEquals(0, BigDecimal.ZERO.compareTo(walletAfterRefund.escrowHeldVnd()));
            assertTrue(
                    walletAfterRefund.recentTransactions().stream()
                            .anyMatch(
                                    t ->
                                            t.transactionType()
                                                    == WalletTransactionType.ESCROW_REFUND));

            // 6. Dynamic rfq_enabled toggle blocks new Open RFQ
            systemConfig.update(
                    "marketplace.rfq_enabled",
                    new UpdateConfigurationRequest("false", null),
                    adminAuth);
            SystemException rfqDisabledErr =
                    assertThrows(
                            SystemException.class,
                            () ->
                                    missionLifecycle.create(
                                            new MissionCreateRequest(
                                                    MissionType.AREA_INSPECTION,
                                                    "RFQ khi đóng",
                                                    "Test",
                                                    tomorrow.plusDays(2),
                                                    start.plusDays(2),
                                                    end.plusDays(2),
                                                    "Đà Nẵng",
                                                    new BigDecimal("16.0700"),
                                                    new BigDecimal("108.2100"),
                                                    null,
                                                    MissionPriority.NORMAL,
                                                    null,
                                                    null,
                                                    null,
                                                    null,
                                                    true),
                                            buyer.getUsername()));
            assertEquals("RFQ_DISABLED", rfqDisabledErr.getCode());
        } finally {
            systemConfig.update(
                    "marketplace.default_service_radius_km",
                    new UpdateConfigurationRequest("100", null),
                    adminAuth);
            systemConfig.update(
                    "marketplace.require_escrow_before_start",
                    new UpdateConfigurationRequest("false", null),
                    adminAuth);
            systemConfig.update(
                    "marketplace.min_payout_vnd",
                    new UpdateConfigurationRequest("100000", null),
                    adminAuth);
            systemConfig.update(
                    "marketplace.rfq_enabled",
                    new UpdateConfigurationRequest("true", null),
                    adminAuth);
        }
    }

    private AppUser createUser(String username, UserRole role) {
        AppUser u = new AppUser();
        u.setUsername(username);
        u.setEmail(username + "@uav.local");
        u.setFullName("User " + username);
        u.setPasswordHash("hashed");
        u.setRole(role);
        u.setStatus(UserStatus.ACTIVE);
        return users.save(u);
    }

    private static UsernamePasswordAuthenticationToken authToken(AppUser user) {
        return UsernamePasswordAuthenticationToken.authenticated(
                user.getUsername(),
                null,
                List.of(new SimpleGrantedAuthority(user.getRole().name())));
    }

    private static String suffix() {
        return UUID.randomUUID().toString().substring(0, 6);
    }
}
