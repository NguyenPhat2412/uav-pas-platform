package com.uav.platform.integration.marketplace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.dao.mission.IServiceOfferingDao;
import com.uav.platform.dao.user.IUserDao;
import com.uav.platform.dto.record.realtime.RealtimeSessionPrincipal;
import com.uav.platform.dto.request.marketplace.admin.ListingModerationRequest;
import com.uav.platform.dto.request.marketplace.admin.ProviderModerationRequest;
import com.uav.platform.dto.request.marketplace.provider.CreateListingFromTemplateRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderOnboardingRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderPilotUpsertRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderUavCreateRequest;
import com.uav.platform.entity.mission.ServiceOffering;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.marketplace.ListingModerationStatus;
import com.uav.platform.enums.marketplace.PricingModel;
import com.uav.platform.enums.marketplace.ProviderPilotStatus;
import com.uav.platform.enums.marketplace.ProviderType;
import com.uav.platform.enums.marketplace.ProviderVerificationStatus;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.service.marketplace.admin.MarketplaceAdminService;
import com.uav.platform.service.marketplace.provider.MarketplaceProviderFleetService;
import com.uav.platform.service.marketplace.provider.MarketplaceProviderService;
import com.uav.platform.transport.websocket.RealtimeEventBroadcaster;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * End-to-end HTTP controller integration test covering the complete Shopee-style mediated order
 * lifecycle: Project -> Subscription -> Admin Dispatch -> Fleet Decline & Re-queue -> Auto Dispatch
 * -> Respond -> Assign Pilot & UAV -> Start Simulation -> Live Tracking -> Complete -> Customer
 * Review -> Rating Sync, plus Pre-Flight Customer Cancellation and live WebSocket ORDER_UPDATED
 * recipient isolation.
 */
@SpringBootTest(
        properties =
                "spring.datasource.url=jdbc:h2:mem:uav_e2e_order_flow;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE")
class MarketplaceOrderFlowEndToEndIntegrationTest {

    @Autowired WebApplicationContext context;
    @Autowired IUserDao users;
    @Autowired IServiceOfferingDao serviceOfferings;
    @Autowired MarketplaceProviderService providerService;
    @Autowired MarketplaceProviderFleetService fleetService;
    @Autowired MarketplaceAdminService adminService;
    @Autowired RealtimeEventBroadcaster realtimeBroadcaster;

    final ObjectMapper json = new ObjectMapper().findAndRegisterModules();
    MockMvc mvc;

    @BeforeEach
    void setupMvc() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @Test
    void fullHttpOrderLifecycleWithDeclineRequeueCancelSimulationTrackingReviewAndWsIsolation()
            throws Exception {
        AppUser admin = createUser("e2e_admin_" + suffix(), UserRole.ROLE_ADMIN);
        AppUser fleetOwnerA = createUser("e2e_fleet_a_" + suffix(), UserRole.ROLE_PILOT);
        AppUser fleetOwnerB = createUser("e2e_fleet_b_" + suffix(), UserRole.ROLE_PILOT);
        AppUser pilotB = createUser("e2e_pilot_b_" + suffix(), UserRole.ROLE_OPERATOR);
        AppUser customer = createUser("e2e_buyer_" + suffix(), UserRole.ROLE_PILOT);
        AppUser stranger = createUser("e2e_stranger_" + suffix(), UserRole.ROLE_PILOT);

        var adminAuth = authToken(admin);
        var fleetAuthA = authToken(fleetOwnerA);
        var fleetAuthB = authToken(fleetOwnerB);
        var customerAuth = authToken(customer);

        // Register live mock WebSocket sessions to verify real ORDER_UPDATED broadcasts
        WebSocketSession customerWs = openWs("e2e-ws-customer");
        WebSocketSession fleetBWs = openWs("e2e-ws-fleet-b");
        WebSocketSession pilotBWs = openWs("e2e-ws-pilot-b");
        WebSocketSession strangerWs = openWs("e2e-ws-stranger");
        WebSocketSession adminWs = openWs("e2e-ws-admin");
        try {
            realtimeBroadcaster.register(
                    customerWs,
                    new RealtimeSessionPrincipal(
                            customer.getId(), customer.getUsername(), false, false, false, null));
            realtimeBroadcaster.register(
                    fleetBWs,
                    new RealtimeSessionPrincipal(
                            fleetOwnerB.getId(),
                            fleetOwnerB.getUsername(),
                            false,
                            false,
                            false,
                            null));
            realtimeBroadcaster.register(
                    pilotBWs,
                    new RealtimeSessionPrincipal(
                            pilotB.getId(), pilotB.getUsername(), false, false, false, null));
            realtimeBroadcaster.register(
                    strangerWs,
                    new RealtimeSessionPrincipal(
                            stranger.getId(), stranger.getUsername(), false, false, false, null));
            realtimeBroadcaster.register(
                    adminWs,
                    new RealtimeSessionPrincipal(
                            admin.getId(), admin.getUsername(), false, false, true, null));

            // Seed 2 verified fleets (Fleet A in Da Nang, Fleet B in HCMC with 2 UAVs + pilot)
            var profileA =
                    providerService.upsertMyProfile(
                            new ProviderOnboardingRequest(
                                    "Đội bay Miền Trung — minh hoạ",
                                    ProviderType.COMPANY,
                                    "0400112233",
                                    "GP-A-01",
                                    "Đội bay khảo sát khu vực miền Trung — minh hoạ",
                                    "Đà Nẵng",
                                    200,
                                    "0905001122",
                                    "ACB",
                                    "100200300",
                                    "DOI BAY A",
                                    true),
                            fleetOwnerA.getUsername());
            adminService.moderateProvider(
                    profileA.id(),
                    new ProviderModerationRequest(ProviderVerificationStatus.VERIFIED, "OK", null),
                    admin.getUsername());
            providerService.registerProviderUav(
                    new ProviderUavCreateRequest("Mavic 3 Survey", "SN-A-" + suffix(), "DJI"),
                    fleetOwnerA.getUsername());

            var profileB =
                    providerService.upsertMyProfile(
                            new ProviderOnboardingRequest(
                                    "Đội bay Nam Trung Bộ — minh hoạ",
                                    ProviderType.COMPANY,
                                    "0319887766",
                                    "GP-B-01",
                                    "Đội bay khảo sát khu vực Khánh Hòa — minh hoạ",
                                    "Khánh Hòa",
                                    180,
                                    "0909887766",
                                    "Vietcombank",
                                    "0071009988",
                                    "DOI BAY B",
                                    true),
                            fleetOwnerB.getUsername());
            adminService.moderateProvider(
                    profileB.id(),
                    new ProviderModerationRequest(ProviderVerificationStatus.VERIFIED, "OK", null),
                    admin.getUsername());
            var uavB1 =
                    providerService.registerProviderUav(
                            new ProviderUavCreateRequest(
                                    "Matrice 350 Survey — minh hoạ", "SN-B1-" + suffix(), "DJI"),
                            fleetOwnerB.getUsername());
            providerService.registerProviderUav(
                    new ProviderUavCreateRequest(
                            "Mavic 3 Enterprise — minh hoạ", "SN-B2-" + suffix(), "DJI"),
                    fleetOwnerB.getUsername());
            var pilotRecord =
                    fleetService.createPilot(
                            new ProviderPilotUpsertRequest(
                                    pilotB.getId(),
                                    pilotB.getId(),
                                    "Kỹ sư Điều khiển B1 — minh hoạ",
                                    pilotB.getEmail(),
                                    "0909111222",
                                    "CC-B1-2026",
                                    "Khảo sát bản đồ 2D/3D",
                                    ProviderPilotStatus.AVAILABLE,
                                    uavB1.id()),
                            fleetOwnerB.getUsername());

            ServiceOffering template =
                    serviceOfferings.save(
                            new ServiceOffering(
                                    "E2E_SURVEY_" + suffix().toUpperCase(),
                                    "Khảo sát bản đồ khu công nghiệp",
                                    "Gói khảo sát định kỳ theo dự án — minh hoạ",
                                    90));
            var createdListing =
                    fleetService.createListingFromTemplate(
                            new CreateListingFromTemplateRequest(
                                    template.getId(),
                                    null,
                                    "Khánh Hòa",
                                    180,
                                    new BigDecimal("500000"),
                                    PricingModel.PER_HECTARE,
                                    new BigDecimal("4"),
                                    48,
                                    24,
                                    null,
                                    null,
                                    null,
                                    true),
                            fleetOwnerB.getUsername());
            assertFalse(createdListing.title().contains("(minh hoạ)"));
            var publishedListing =
                    adminService.moderateListing(
                            createdListing.id(),
                            new ListingModerationRequest(
                                    ListingModerationStatus.PUBLISHED, "OK", true),
                            admin.getUsername());

            // 1. Customer creates Project via HTTP POST /api/v1/projects
            String projectResp =
                    mvc.perform(
                                    post("/api/v1/projects")
                                            .with(authentication(customerAuth))
                                            .with(csrf())
                                            .contentType(MediaType.APPLICATION_JSON)
                                            .content(
                                                    json.writeValueAsString(
                                                            Map.of(
                                                                    "name",
                                                                    "Dự án Khu Đô Thị Biển Nha Trang — minh hoạ",
                                                                    "province",
                                                                    "Khánh Hòa",
                                                                    "areaGeoJson",
                                                                    "{\"type\":\"Polygon\",\"coordinates\":[[[109.19,12.23],[109.20,12.23],[109.20,12.25],[109.19,12.25],[109.19,12.23]]]}",
                                                                    "note",
                                                                    "Theo dõi tiến độ san lấp"))))
                            .andExpect(status().isCreated())
                            .andExpect(jsonPath("$.customerUsername").value(customer.getUsername()))
                            .andReturn()
                            .getResponse()
                            .getContentAsString();
            long projectId = json.readTree(projectResp).get("id").asLong();

            // 2. Customer subscribes listing for Project -> creates first Mission in
            // PENDING_DISPATCH
            String subResp =
                    mvc.perform(
                                    post("/api/v1/projects/" + projectId + "/subscriptions")
                                            .with(authentication(customerAuth))
                                            .with(csrf())
                                            .contentType(MediaType.APPLICATION_JSON)
                                            .content(
                                                    json.writeValueAsString(
                                                            Map.of(
                                                                    "listingId",
                                                                    publishedListing.id(),
                                                                    "scheduleType",
                                                                    "WEEKLY",
                                                                    "startDate",
                                                                    LocalDate.now()
                                                                            .plusDays(2)
                                                                            .toString(),
                                                                    "units",
                                                                    6))))
                            .andExpect(status().isCreated())
                            .andExpect(jsonPath("$.estimatedTotalVnd").value(3000000))
                            .andReturn()
                            .getResponse()
                            .getContentAsString();
            long missionId = json.readTree(subResp).get("firstMissionId").asLong();
            assertTrue(missionId > 0);

            mvc.perform(get("/api/v1/orders/summary").with(authentication(customerAuth)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.pending").value(1))
                    .andExpect(jsonPath("$.scheduled").value(0));

            // 3. Branch A — Admin manually dispatches to Fleet A -> Fleet A declines -> returns to
            // PENDING_DISPATCH
            mvc.perform(
                            post("/api/v1/admin/marketplace/dispatch/" + missionId)
                                    .with(authentication(adminAuth))
                                    .with(csrf())
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            json.writeValueAsString(
                                                    Map.of(
                                                            "providerId",
                                                            profileA.id(),
                                                            "note",
                                                            "Giao thử đội bay A"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.providerResponseStatus").value("PENDING_PROVIDER"));

            mvc.perform(
                            post("/api/v1/marketplace/provider/orders/" + missionId + "/respond")
                                    .with(authentication(fleetAuthA))
                                    .with(csrf())
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            json.writeValueAsString(
                                                    Map.of(
                                                            "accept",
                                                            false,
                                                            "reason",
                                                            "Đội bay đang bảo trì định kỳ"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.providerResponseStatus").value("PENDING_DISPATCH"));

            // Verify order is back in Admin PENDING_DISPATCH queue
            String queueJson =
                    mvc.perform(
                                    get("/api/v1/admin/marketplace/dispatch")
                                            .with(authentication(adminAuth)))
                            .andExpect(status().isOk())
                            .andReturn()
                            .getResponse()
                            .getContentAsString();
            boolean foundInQueue = false;
            for (JsonNode item : json.readTree(queueJson).get("content")) {
                if (item.path("mission").path("id").asLong() == missionId) {
                    foundInQueue = true;
                    break;
                }
            }
            assertTrue(foundInQueue);

            // 4. Branch B — Admin auto-dispatches -> selects Fleet B (closest to HCMC & 2 UAVs)
            String autoDispatched =
                    mvc.perform(
                                    post("/api/v1/admin/marketplace/dispatch/"
                                                    + missionId
                                                    + "/auto")
                                            .with(authentication(adminAuth))
                                            .with(csrf()))
                            .andExpect(status().isOk())
                            .andExpect(
                                    jsonPath("$.providerResponseStatus").value("PENDING_PROVIDER"))
                            .andReturn()
                            .getResponse()
                            .getContentAsString();
            assertEquals(
                    profileB.id().longValue(),
                    json.readTree(autoDispatched).get("providerId").asLong());

            // Customer view of mission MUST anonymize fleet identity
            String customerView =
                    mvc.perform(
                                    get("/api/v1/missions/" + missionId)
                                            .with(authentication(customerAuth)))
                            .andExpect(status().isOk())
                            .andReturn()
                            .getResponse()
                            .getContentAsString();
            JsonNode customerMissionNode = json.readTree(customerView);
            assertTrue(customerMissionNode.get("providerDisplayName").isNull());
            assertTrue(customerMissionNode.get("providerId").isNull());

            // 5. Fleet B accepts, assigns Pilot B + UAV B1, and starts simulation
            mvc.perform(
                            post("/api/v1/marketplace/provider/orders/" + missionId + "/respond")
                                    .with(authentication(fleetAuthB))
                                    .with(csrf())
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            json.writeValueAsString(
                                                    Map.of(
                                                            "accept",
                                                            true,
                                                            "reason",
                                                            "Xác nhận lịch bay dự án"))))
                    .andExpect(status().isOk());

            mvc.perform(
                            post("/api/v1/marketplace/provider/orders/" + missionId + "/assign")
                                    .with(authentication(fleetAuthB))
                                    .with(csrf())
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            json.writeValueAsString(
                                                    Map.of(
                                                            "pilotId",
                                                            pilotRecord.id(),
                                                            "uavId",
                                                            uavB1.id(),
                                                            "note",
                                                            "Phân công tổ bay khảo sát số 1"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.assignedUavId").value(uavB1.id()))
                    .andExpect(jsonPath("$.assignedOperatorId").value(pilotB.getId()));

            mvc.perform(
                            post("/api/v1/marketplace/provider/orders/" + missionId + "/start")
                                    .with(authentication(fleetAuthB))
                                    .with(csrf()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                    .andExpect(jsonPath("$.statusGroup").value("IN_FLIGHT"));

            // Customer cannot cancel once IN_PROGRESS
            mvc.perform(
                            post("/api/v1/missions/" + missionId + "/cancel")
                                    .with(authentication(customerAuth))
                                    .with(csrf())
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content("{\"reason\":\"Đổi ý khi đang bay\"}"))
                    .andExpect(status().is4xxClientError());

            // 6. Customer tracks live simulated flight via GET /api/v1/orders/{id}/tracking
            mvc.perform(
                            get("/api/v1/orders/" + missionId + "/tracking")
                                    .with(authentication(customerAuth)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.missionId").value(missionId))
                    .andExpect(jsonPath("$.statusGroup").value("IN_FLIGHT"))
                    .andExpect(jsonPath("$.position.latitude").isNumber())
                    .andExpect(jsonPath("$.battery").isNumber())
                    .andExpect(jsonPath("$.link.lossPct").isNumber());

            // 7. Fleet B completes order -> Customer summary shows delivered=1, toReview=1
            mvc.perform(
                            post("/api/v1/marketplace/provider/orders/" + missionId + "/complete")
                                    .with(authentication(fleetAuthB))
                                    .with(csrf())
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            "{\"completionNote\":\"Đã tải bình đồ GeoTIFF — minh hoạ\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("COMPLETED"))
                    .andExpect(jsonPath("$.statusGroup").value("TO_REVIEW"));

            // Inspection report for customer hides fleet pilot & UAV serial and has zero RTK
            String customerReportJson =
                    mvc.perform(
                                    get("/api/v1/missions/" + missionId + "/inspection-report")
                                            .with(authentication(customerAuth)))
                            .andExpect(status().isOk())
                            .andReturn()
                            .getResponse()
                            .getContentAsString();
            assertFalse(customerReportJson.contains("RTK"));
            JsonNode customerReport = json.readTree(customerReportJson);
            assertTrue(customerReport.path("operatorName").isNull());
            assertTrue(customerReport.path("uavSerialNumber").isNull());

            // Admin inspection report retains full operatorName & uavSerialNumber
            mvc.perform(
                            get("/api/v1/missions/" + missionId + "/inspection-report")
                                    .with(authentication(adminAuth)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.uavSerialNumber").value(uavB1.serialNumber()));

            mvc.perform(get("/api/v1/orders/summary").with(authentication(customerAuth)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.inFlight").value(0))
                    .andExpect(jsonPath("$.delivered").value(1))
                    .andExpect(jsonPath("$.toReview").value(1));

            // 8. Customer submits 5-star review -> updates both listing & fleet providerBadge
            mvc.perform(
                            put("/api/v1/missions/" + missionId + "/review")
                                    .with(authentication(customerAuth))
                                    .with(csrf())
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            json.writeValueAsString(
                                                    Map.of(
                                                            "rating",
                                                            5,
                                                            "comment",
                                                            "Dữ liệu rõ nét, đúng tiến độ dự án"))))
                    .andExpect(status().isOk());

            mvc.perform(get("/api/v1/orders/summary").with(authentication(customerAuth)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.toReview").value(0));

            String publicDetail =
                    mvc.perform(
                                    get(
                                            "/api/v1/public/marketplace/listings/"
                                                    + publishedListing.slug()))
                            .andExpect(status().isOk())
                            .andExpect(jsonPath("$.listing.providerBadge.verified").value(true))
                            .andExpect(jsonPath("$.listing.providerBadge.reviewCount").value(1))
                            .andExpect(jsonPath("$.listing.providerBadge.ratingAvg").value(5.0))
                            .andReturn()
                            .getResponse()
                            .getContentAsString();
            JsonNode publicNode = json.readTree(publicDetail).path("listing");
            assertTrue(
                    publicNode.path("providerDisplayName").isNull()
                            || publicNode.path("providerDisplayName").isMissingNode());
            assertNull(publicNode.path("providerSlug").textValue());

            // 9. Branch C — Customer creates 2nd order and cancels BEFORE IN_FLIGHT
            String subResp2 =
                    mvc.perform(
                                    post("/api/v1/projects/" + projectId + "/subscriptions")
                                            .with(authentication(customerAuth))
                                            .with(csrf())
                                            .contentType(MediaType.APPLICATION_JSON)
                                            .content(
                                                    json.writeValueAsString(
                                                            Map.of(
                                                                    "listingId",
                                                                    publishedListing.id(),
                                                                    "scheduleType",
                                                                    "ONCE",
                                                                    "startDate",
                                                                    LocalDate.now()
                                                                            .plusDays(4)
                                                                            .toString(),
                                                                    "units",
                                                                    4))))
                            .andExpect(status().isCreated())
                            .andReturn()
                            .getResponse()
                            .getContentAsString();
            long missionId2 = json.readTree(subResp2).get("firstMissionId").asLong();

            mvc.perform(
                            post("/api/v1/missions/" + missionId2 + "/cancel")
                                    .with(authentication(customerAuth))
                                    .with(csrf())
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content("{\"reason\":\"Dời lịch thi công khu đất\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("CANCELLED"));

            // Now no active orders remain -> project soft-delete succeeds with 204
            mvc.perform(
                            delete("/api/v1/projects/" + projectId)
                                    .with(authentication(customerAuth))
                                    .with(csrf()))
                    .andExpect(status().isNoContent());

            // 10. Verify WebSocket ORDER_UPDATED isolation across the entire flow:
            // Customer, Fleet B, Pilot B, and Admin received frames; Stranger received ZERO!
            ArgumentCaptor<TextMessage> customerFrames = ArgumentCaptor.forClass(TextMessage.class);
            verify(customerWs, atLeastOnce()).sendMessage(customerFrames.capture());
            verify(fleetBWs, atLeastOnce()).sendMessage(any(TextMessage.class));
            verify(pilotBWs, atLeastOnce()).sendMessage(any(TextMessage.class));
            verify(adminWs, atLeastOnce()).sendMessage(any(TextMessage.class));
            verify(strangerWs, never()).sendMessage(any(TextMessage.class));
            assertNotNull(customerFrames.getValue());
        } finally {
            realtimeBroadcaster.unregister(customerWs.getId());
            realtimeBroadcaster.unregister(fleetBWs.getId());
            realtimeBroadcaster.unregister(pilotBWs.getId());
            realtimeBroadcaster.unregister(strangerWs.getId());
            realtimeBroadcaster.unregister(adminWs.getId());
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
        List<SimpleGrantedAuthority> authorities =
                user.getRole() == UserRole.ROLE_ADMIN
                        ? List.of(
                                new SimpleGrantedAuthority("ROLE_ADMIN"),
                                new SimpleGrantedAuthority("MARKETPLACE_MODERATE"),
                                new SimpleGrantedAuthority("MISSION_VIEW_ALL"),
                                new SimpleGrantedAuthority("MISSION_VIEW"),
                                new SimpleGrantedAuthority("MISSION_CREATE"),
                                new SimpleGrantedAuthority("MISSION_UPDATE"),
                                new SimpleGrantedAuthority("MISSION_CANCEL"))
                        : List.of(
                                new SimpleGrantedAuthority(user.getRole().name()),
                                new SimpleGrantedAuthority("MISSION_VIEW"),
                                new SimpleGrantedAuthority("MISSION_CREATE"),
                                new SimpleGrantedAuthority("MISSION_UPDATE"),
                                new SimpleGrantedAuthority("MISSION_CANCEL"));
        return UsernamePasswordAuthenticationToken.authenticated(
                user.getUsername(), null, authorities);
    }

    private static WebSocketSession openWs(String id) {
        WebSocketSession ws = mock(WebSocketSession.class);
        when(ws.getId()).thenReturn(id);
        when(ws.isOpen()).thenReturn(true);
        return ws;
    }

    private static String suffix() {
        return UUID.randomUUID().toString().substring(0, 6);
    }
}
