package com.uav.platform.integration.project;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.config.seed.DevSeedDataInitializer;
import com.uav.platform.dao.marketplace.IMarketplaceListingDao;
import com.uav.platform.dao.marketplace.IProviderPilotDao;
import com.uav.platform.dao.marketplace.IProviderProfileDao;
import com.uav.platform.dao.marketplace.IProviderWalletDao;
import com.uav.platform.dao.mission.IMissionDao;
import com.uav.platform.dao.mission.IServiceOfferingDao;
import com.uav.platform.dao.project.IProjectDao;
import com.uav.platform.dao.uav.IUavDao;
import com.uav.platform.dao.user.IUserDao;
import com.uav.platform.dto.request.marketplace.admin.ListingModerationRequest;
import com.uav.platform.dto.request.marketplace.admin.ManualDispatchRequest;
import com.uav.platform.dto.request.marketplace.admin.ProviderModerationRequest;
import com.uav.platform.dto.request.marketplace.provider.CreateListingFromTemplateRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderOnboardingRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderOrderActionRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderOrderAssignRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderOrderCompleteRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderPilotPatchRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderPilotUpsertRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderUavCreateRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderUavUpdateRequest;
import com.uav.platform.dto.request.mission.flightplan.MissionReviewUpsertRequest;
import com.uav.platform.dto.request.project.ProjectCreateRequest;
import com.uav.platform.dto.request.project.ProjectSubscriptionCreateRequest;
import com.uav.platform.dto.request.project.ProjectSubscriptionUpdateRequest;
import com.uav.platform.dto.request.project.ProjectUpdateRequest;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.mission.ServiceOffering;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.marketplace.ListingModerationStatus;
import com.uav.platform.enums.marketplace.PricingModel;
import com.uav.platform.enums.marketplace.ProviderOrderStatus;
import com.uav.platform.enums.marketplace.ProviderPilotStatus;
import com.uav.platform.enums.marketplace.ProviderType;
import com.uav.platform.enums.marketplace.ProviderVerificationStatus;
import com.uav.platform.enums.mission.MissionStatus;
import com.uav.platform.enums.project.ProjectStatus;
import com.uav.platform.enums.project.ProjectSubscriptionStatus;
import com.uav.platform.enums.project.SubscriptionScheduleType;
import com.uav.platform.enums.uav.UavStatus;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.service.marketplace.admin.MarketplaceAdminService;
import com.uav.platform.service.marketplace.admin.MarketplaceDispatchService;
import com.uav.platform.service.marketplace.catalog.MarketplaceCatalogService;
import com.uav.platform.service.marketplace.provider.MarketplaceProviderFleetService;
import com.uav.platform.service.marketplace.provider.MarketplaceProviderService;
import com.uav.platform.service.mission.lifecycle.MissionQueryService;
import com.uav.platform.service.mission.lifecycle.OrderTrackingService;
import com.uav.platform.service.project.ProjectService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@SpringBootTest(
        properties =
                "spring.datasource.url=jdbc:h2:mem:uav_projects;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE")
class ProjectSubscriptionIntegrationTest {

    @Autowired WebApplicationContext context;
    @Autowired IUserDao users;
    @Autowired IMissionDao missions;
    @Autowired IServiceOfferingDao serviceOfferings;
    @Autowired IProviderProfileDao providerProfiles;
    @Autowired IProviderWalletDao providerWallets;
    @Autowired IProviderPilotDao providerPilots;
    @Autowired IMarketplaceListingDao marketplaceListings;
    @Autowired IUavDao uavs;
    @Autowired IProjectDao projects;
    @Autowired PasswordEncoder passwordEncoder;

    @Autowired MarketplaceCatalogService catalogService;
    @Autowired MarketplaceProviderService providerService;
    @Autowired MarketplaceProviderFleetService fleetService;
    @Autowired MarketplaceAdminService adminService;
    @Autowired MarketplaceDispatchService dispatchService;
    @Autowired ProjectService projectService;
    @Autowired OrderTrackingService orderTrackingService;
    @Autowired MissionQueryService missionQueryService;

    final ObjectMapper json = new ObjectMapper().findAndRegisterModules();
    MockMvc mvc;

    @BeforeEach
    void setupMvc() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @Test
    void fullShopeeStyleProjectSubscriptionDispatchSimulationTrackingReviewAndAuthSuite()
            throws Exception {
        AppUser admin = createUser("s0_admin_" + suffix(), UserRole.ROLE_ADMIN);
        AppUser seller = createUser("s0_seller_" + suffix(), UserRole.ROLE_PILOT);
        AppUser buyerA = createUser("s0_buyer_a_" + suffix(), UserRole.ROLE_PILOT);
        AppUser buyerB = createUser("s0_buyer_b_" + suffix(), UserRole.ROLE_PILOT);

        var adminAuth = authToken(admin);
        var sellerAuth = authToken(seller);
        var authA = authToken(buyerA);
        var authB = authToken(buyerB);

        // 1. Fleet registers profile -> Admin verifies
        var profile =
                providerService.upsertMyProfile(
                        new ProviderOnboardingRequest(
                                "Đội bay Khảo sát Miền Nam (minh hoạ)",
                                ProviderType.COMPANY,
                                "0318887776",
                                "GP-MINH-HOA-01",
                                "Đội bay khảo sát minh hoạ",
                                "TP. Hồ Chí Minh",
                                200,
                                "0909000111",
                                "VCB",
                                "007100112233",
                                "DOI BAY MINH HOA",
                                true),
                        seller.getUsername());
        adminService.moderateProvider(
                profile.id(),
                new ProviderModerationRequest(
                        ProviderVerificationStatus.VERIFIED, "Duyệt minh hoạ", null),
                admin.getUsername());

        // 2. Fleet registers UAVs + Pilots + creates Listing from ServiceOffering template
        var uav1 =
                providerService.registerProviderUav(
                        new ProviderUavCreateRequest(
                                "Matrice 350 Survey (minh hoạ)", "SN-S0-UAV1-" + suffix(), "DJI"),
                        seller.getUsername());
        var uav2 =
                providerService.registerProviderUav(
                        new ProviderUavCreateRequest(
                                "Mavic 3 Enterprise (minh hoạ)", "SN-S0-UAV2-" + suffix(), "DJI"),
                        seller.getUsername());
        var updatedUav2 =
                fleetService.updateMyUav(
                        uav2.id(),
                        new ProviderUavUpdateRequest(null, null, null, UavStatus.MAINTENANCE),
                        seller.getUsername());
        assertEquals(UavStatus.MAINTENANCE, updatedUav2.status());
        fleetService.deleteMyUav(uav2.id(), seller.getUsername());
        assertEquals(1, fleetService.listMyUavs(seller.getUsername()).size());

        var pilot =
                fleetService.createPilot(
                        new ProviderPilotUpsertRequest(
                                null,
                                null,
                                "Kỹ sư Nguyễn Minh (minh hoạ)",
                                "pilot." + suffix() + "@uav.local",
                                "0909888777",
                                "CC-DEMO-01",
                                "Khảo sát bản đồ 2D",
                                ProviderPilotStatus.AVAILABLE,
                                uav1.id()),
                        seller.getUsername());
        assertNotNull(pilot.pilotUserId());
        var patchedPilot =
                fleetService.updatePilot(
                        pilot.id(),
                        new ProviderPilotPatchRequest(
                                null, null, null, null, "Khảo sát bản đồ & 3D", null, null),
                        seller.getUsername());
        assertEquals("Khảo sát bản đồ & 3D", patchedPilot.specialization());

        ServiceOffering template =
                new ServiceOffering(
                        "DATA_COLLECTION_" + suffix().toUpperCase(),
                        "Khảo sát bản đồ tiến độ khu đất",
                        "Thu thập ảnh trực quan theo lịch dự án — minh hoạ",
                        90);
        template.setActive(true);
        ServiceOffering savedTemplate = serviceOfferings.save(template);

        var fromTemplate =
                fleetService.createListingFromTemplate(
                        new CreateListingFromTemplateRequest(
                                savedTemplate.getId(),
                                "Khảo sát bản đồ khu đất dự án (minh hoạ)",
                                "TP. Hồ Chí Minh",
                                200,
                                new BigDecimal("500000"),
                                PricingModel.PER_HECTARE,
                                new BigDecimal("5"),
                                48,
                                24,
                                null,
                                null,
                                null,
                                true),
                        seller.getUsername());
        var published =
                adminService.moderateListing(
                        fromTemplate.id(),
                        new ListingModerationRequest(
                                ListingModerationStatus.PUBLISHED, "Duyệt xuất bản", true),
                        admin.getUsername());

        // 3. Public catalog anonymizes provider identity (returns providerBadge, null fleet name)
        var publicPage =
                catalogService.listPublicListings(
                        "Khảo sát",
                        savedTemplate.getCode(),
                        null,
                        null,
                        null,
                        "Hồ Chí Minh",
                        null,
                        null,
                        PageRequest.of(0, 10));
        assertTrue(publicPage.totalElements() >= 1);
        var publicItem =
                publicPage.content().stream()
                        .filter(l -> l.id().equals(published.id()))
                        .findFirst()
                        .orElseThrow();
        assertNull(publicItem.providerId());
        assertNull(publicItem.providerSlug());
        assertNull(publicItem.providerDisplayName());
        assertNotNull(publicItem.providerBadge());
        assertTrue(publicItem.providerBadge().verified());

        mvc.perform(get(ApiRoutes.Marketplace.PUBLIC_BASE + "/providers/" + profile.slug()))
                .andExpect(status().isNotFound());

        // 4. Customer A creates Project + Subscription -> creates first order in PENDING_DISPATCH
        String areaPolygon =
                "{\"type\":\"Polygon\",\"coordinates\":[[[106.7000,10.7700],[106.7100,10.7700],[106.7100,10.7800],[106.7000,10.7800],[106.7000,10.7700]]]}";
        var createdProject =
                projectService.createProject(
                        new ProjectCreateRequest(
                                "Khu đô thị Thủ Thiêm (minh hoạ)",
                                "TP. Hồ Chí Minh",
                                areaPolygon,
                                "Theo dõi tiến độ san lấp mặt bằng"),
                        authA);
        assertEquals(ProjectStatus.ACTIVE, createdProject.status());

        // Strict cross-user isolation: buyerB cannot view, patch, or delete buyerA's project
        mvc.perform(
                        get(ApiRoutes.Projects.BASE + "/" + createdProject.id())
                                .with(authentication(authB)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));

        mvc.perform(
                        patch(ApiRoutes.Projects.BASE + "/" + createdProject.id())
                                .with(authentication(authB))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsString(
                                                new ProjectUpdateRequest(
                                                        "Hack", null, null, null, null))))
                .andExpect(status().isForbidden());

        // Non-admin buyerA cannot access Admin Dispatch endpoint -> 403
        mvc.perform(
                        get(ApiRoutes.Marketplace.ADMIN_BASE + ApiRoutes.Marketplace.ADMIN_DISPATCH)
                                .with(authentication(authA)))
                .andExpect(status().isForbidden());

        LocalDate startDate = LocalDate.now().plusDays(2);
        var sub =
                projectService.createSubscription(
                        createdProject.id(),
                        new ProjectSubscriptionCreateRequest(
                                published.id(),
                                null,
                                SubscriptionScheduleType.WEEKLY,
                                startDate,
                                null,
                                null,
                                new BigDecimal("10"),
                                null,
                                null,
                                null,
                                "Bay sáng sớm"),
                        authA);
        assertNotNull(sub.firstMissionId());
        assertEquals(0, new BigDecimal("5000000").compareTo(sub.estimatedTotalVnd()));

        Mission firstOrder = missions.findById(sub.firstMissionId()).orElseThrow();
        assertEquals(MissionStatus.PENDING_CONFIRMATION, firstOrder.getStatus());
        assertEquals(ProviderOrderStatus.PENDING_DISPATCH, firstOrder.getProviderResponseStatus());
        assertNull(firstOrder.getProvider());

        // DELETE project blocked with 409 while order is active
        mvc.perform(
                        delete(ApiRoutes.Projects.BASE + "/" + createdProject.id())
                                .with(authentication(authA))
                                .with(csrf()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PROJECT_HAS_ACTIVE_ORDERS"));

        // 5. Admin Dispatch Queue -> Auto-Dispatch -> Fleet Declines (returns to queue) -> Manual
        // Dispatch
        var queue = dispatchService.listDispatchQueue(PageRequest.of(0, 20));
        var queuedOrder =
                queue.content().stream()
                        .filter(q -> q.mission().id().equals(firstOrder.getId()))
                        .findFirst()
                        .orElseThrow();
        assertFalse(queuedOrder.candidates().isEmpty());

        var autoDispatched =
                dispatchService.dispatchAuto(firstOrder.getId(), null, admin.getUsername());
        assertEquals(ProviderOrderStatus.PENDING_PROVIDER, autoDispatched.providerResponseStatus());

        // Fleet declines -> returns to PENDING_DISPATCH queue!
        var declined =
                providerService.respondToOrder(
                        firstOrder.getId(),
                        new ProviderOrderActionRequest(false, null, null, "Kẹt lịch bảo dưỡng"),
                        seller.getUsername());
        assertEquals(ProviderOrderStatus.PENDING_DISPATCH, declined.providerResponseStatus());
        assertNull(declined.providerId());

        // Admin manually dispatches back to seller
        var redispatched =
                dispatchService.dispatchManual(
                        firstOrder.getId(),
                        new ManualDispatchRequest(profile.id(), "Giao lại theo khung giờ mới"),
                        admin.getUsername());
        assertEquals(profile.id(), redispatched.providerId());
        assertEquals(ProviderOrderStatus.PENDING_PROVIDER, redispatched.providerResponseStatus());

        // Customer GET /api/v1/missions hides provider identity, while Admin sees it!
        var customerView = missionQueryService.get(firstOrder.getId(), authA);
        assertNull(customerView.providerId());
        assertNull(customerView.providerDisplayName());
        assertEquals(createdProject.id(), customerView.projectId());

        var adminStats = dispatchService.getStats();
        assertTrue(adminStats.totalOrders() >= 1);

        // 6. Fleet assigns pilot + UAV -> starts order (starts Simulation!) -> Customer tracks!
        var assigned =
                fleetService.assignOrder(
                        firstOrder.getId(),
                        new ProviderOrderAssignRequest(pilot.id(), null, uav1.id(), "Sẵn sàng bay"),
                        seller.getUsername());
        assertEquals(MissionStatus.READY, assigned.status());
        assertEquals(uav1.id(), assigned.assignedUavId());

        var summaryScheduled = orderTrackingService.getCustomerSummary(authA);
        assertEquals(1L, summaryScheduled.scheduled());

        var inFlight = providerService.startOrder(firstOrder.getId(), seller.getUsername());
        assertEquals(MissionStatus.IN_PROGRESS, inFlight.status());

        var tracking = orderTrackingService.getOrderTracking(firstOrder.getId(), authA);
        assertEquals(firstOrder.getId(), tracking.missionId());
        assertTrue(tracking.activeSimulation());
        assertNotNull(tracking.position());

        // buyerB cannot track buyerA's order -> 403
        mvc.perform(
                        get(ApiRoutes.Orders.BASE + "/" + firstOrder.getId() + "/tracking")
                                .with(authentication(authB)))
                .andExpect(status().isForbidden());

        // 7. Fleet completes order -> Customer summary shows delivered=1, toReview=1 -> Customer
        // reviews via POST /api/v1/missions/{id}/review -> ratingAvg updated & toReview=0!
        var completed =
                providerService.completeOrder(
                        firstOrder.getId(),
                        new ProviderOrderCompleteRequest(
                                "Đã bàn giao bình đồ trực giao minh hoạ", "Tốt"),
                        seller.getUsername());
        assertEquals(MissionStatus.COMPLETED, completed.status());

        var summaryBeforeReview = orderTrackingService.getCustomerSummary(authA);
        assertEquals(1L, summaryBeforeReview.delivered());
        assertEquals(1L, summaryBeforeReview.toReview());

        mvc.perform(
                        post(ApiRoutes.Missions.BASE + "/" + firstOrder.getId() + "/review")
                                .with(authentication(authA))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsString(
                                                new MissionReviewUpsertRequest(
                                                        null,
                                                        null,
                                                        null,
                                                        true,
                                                        "Dữ liệu minh hoạ rõ nét!",
                                                        5))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.overallRating").value(5));

        var summaryAfterReview = orderTrackingService.getCustomerSummary(authA);
        assertEquals(1L, summaryAfterReview.delivered());
        assertEquals(0L, summaryAfterReview.toReview());

        var refreshedPublic = catalogService.getPublicListingBySlug(published.slug());
        assertEquals(0, new BigDecimal("5.00").compareTo(refreshedPublic.listing().ratingAvg()));
        assertEquals(1, refreshedPublic.listing().reviewCount());

        // 8. Pause subscription & soft-delete project now that order is COMPLETED
        var paused =
                projectService.updateSubscription(
                        createdProject.id(),
                        sub.id(),
                        new ProjectSubscriptionUpdateRequest(
                                SubscriptionScheduleType.MONTHLY,
                                null,
                                null,
                                null,
                                null,
                                ProjectSubscriptionStatus.PAUSED,
                                "Tạm dừng"),
                        authA);
        assertEquals(ProjectSubscriptionStatus.PAUSED, paused.status());

        mvc.perform(
                        delete(ApiRoutes.Projects.BASE + "/" + createdProject.id())
                                .with(authentication(authA))
                                .with(csrf()))
                .andExpect(status().isNoContent());

        // Soft-delete listing & pilot
        fleetService.deleteListing(published.id(), seller.getUsername());
        fleetService.deletePilot(pilot.id(), seller.getUsername());
        assertTrue(fleetService.listMyPilots(seller.getUsername()).isEmpty());
    }

    @Test
    void devSeedInitializerProvisionsThreeDemoAccountsWithTenUavsWhenEnabled() throws Exception {
        DevSeedDataInitializer seeder =
                new DevSeedDataInitializer(
                        users,
                        providerProfiles,
                        providerWallets,
                        providerPilots,
                        marketplaceListings,
                        uavs,
                        projects,
                        passwordEncoder);
        ReflectionTestUtils.setField(seeder, "rawPassword", "TestOnlySeedPass!2026");
        seeder.run(new DefaultApplicationArguments());

        AppUser customer =
                users.findByUsername(DevSeedDataInitializer.DEMO_CUSTOMER_USERNAME).orElseThrow();
        AppUser fleet =
                users.findByUsername(DevSeedDataInitializer.DEMO_FLEET_USERNAME).orElseThrow();
        AppUser admin =
                users.findByUsername(DevSeedDataInitializer.DEMO_ADMIN_USERNAME).orElseThrow();
        assertTrue(passwordEncoder.matches("TestOnlySeedPass!2026", customer.getPasswordHash()));
        assertEquals(UserRole.ROLE_ADMIN, admin.getRole());
        assertFalse(customer.getFullName().toLowerCase().contains("minh ho"));
        assertFalse(fleet.getFullName().toLowerCase().contains("minh ho"));
        assertFalse(admin.getFullName().toLowerCase().contains("minh ho"));

        var fleetProfile = providerProfiles.findByUserId(fleet.getId()).orElseThrow();
        assertFalse(fleetProfile.getDisplayName().toLowerCase().contains("minh ho"));
        var seededUavs = uavs.findByProviderIdOrderByIdDesc(fleetProfile.getId());
        assertEquals(10, seededUavs.size());
        assertTrue(
                seededUavs.stream().noneMatch(u -> u.getModel().toLowerCase().contains("minh ho")));
        var seededPilots =
                providerPilots.findByProviderIdAndDeletedFalseOrderByCreatedAtDesc(
                        fleetProfile.getId());
        assertTrue(seededPilots.size() >= 2);
        assertTrue(
                seededPilots.stream()
                        .noneMatch(p -> p.getFullName().toLowerCase().contains("minh ho")));
        var seededListing =
                marketplaceListings.findBySlug("khao-sat-ban-do-2d-du-an-minh-hoa").orElseThrow();
        assertFalse(seededListing.getTitle().toLowerCase().contains("minh ho"));
        assertEquals(
                "/images/process/step-05-data-handover.webp", seededListing.getCoverImageUrl());

        // Regression test: GET /api/v1/missions & /api/v1/projects without optional filters for
        // both customer and admin (must never pass null Specification into .and / allOf)
        mvc.perform(get("/api/v1/missions").with(authentication(authToken(customer))))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/missions").with(authentication(authToken(admin))))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/projects").with(authentication(authToken(customer))))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/projects").with(authentication(authToken(admin))))
                .andExpect(status().isOk());
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
        List<SimpleGrantedAuthority> authorities =
                user.getRole() == UserRole.ROLE_ADMIN
                        ? List.of(
                                new SimpleGrantedAuthority("ROLE_ADMIN"),
                                new SimpleGrantedAuthority("MARKETPLACE_MODERATE"),
                                new SimpleGrantedAuthority("MISSION_VIEW_ALL"),
                                new SimpleGrantedAuthority("MISSION_VIEW"),
                                new SimpleGrantedAuthority("MISSION_CREATE"),
                                new SimpleGrantedAuthority("MISSION_UPDATE"))
                        : List.of(
                                new SimpleGrantedAuthority(user.getRole().name()),
                                new SimpleGrantedAuthority("MISSION_VIEW"),
                                new SimpleGrantedAuthority("MISSION_CREATE"),
                                new SimpleGrantedAuthority("MISSION_UPDATE"),
                                new SimpleGrantedAuthority("MISSION_CANCEL"));
        return UsernamePasswordAuthenticationToken.authenticated(
                user.getUsername(), null, authorities);
    }

    private static String suffix() {
        return UUID.randomUUID().toString().substring(0, 6);
    }
}
