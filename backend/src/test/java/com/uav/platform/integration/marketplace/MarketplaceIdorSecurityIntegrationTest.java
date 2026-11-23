package com.uav.platform.integration.marketplace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.dao.mission.IServiceOfferingDao;
import com.uav.platform.dao.user.IUserDao;
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

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Adversarial IDOR & authorization security test suite covering:
 * 1. Customer A vs Customer B isolation across Projects, Subscriptions, Orders, and Live Tracking
 * 2. Fleet A vs Fleet B isolation across Order Respond/Assign/Start/Complete & Fleet CRUD
 * 3. Control Engineer (Pilot) isolation: only sees/starts/completes orders assigned to self
 * 4. /api/v1/admin/marketplace/* 403 enforcement against Customers, Fleet Owners, and Pilots
 * 5. Deep recursive JSON audit verifying zero providerId/slug/displayName leaks on Public & Customer APIs
 */
@SpringBootTest(
        properties =
                "spring.datasource.url=jdbc:h2:mem:uav_idor_security;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE")
class MarketplaceIdorSecurityIntegrationTest {

    private static final Set<String> FORBIDDEN_NON_NULL_KEYS_FOR_CUSTOMER =
            Set.of(
                    "providerId",
                    "providerSlug",
                    "providerDisplayName",
                    "operatorName",
                    "uavSerialNumber");

    @Autowired WebApplicationContext context;
    @Autowired IUserDao users;
    @Autowired IServiceOfferingDao serviceOfferings;
    @Autowired MarketplaceProviderService providerService;
    @Autowired MarketplaceProviderFleetService fleetService;
    @Autowired MarketplaceAdminService adminService;

    final ObjectMapper json = new ObjectMapper().findAndRegisterModules();
    MockMvc mvc;

    @BeforeEach
    void setupMvc() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @Test
    void enforcesStrictIdorIsolationRoleGuardsAndZeroProviderIdentityLeakage() throws Exception {
        String tag = suffix();
        AppUser admin = createUser("sec_admin_" + tag, "Quản trị Sec", UserRole.ROLE_ADMIN);
        AppUser customerA = createUser("sec_cust_a_" + tag, "Khách A", UserRole.ROLE_PILOT);
        AppUser customerB = createUser("sec_cust_b_" + tag, "Khách B", UserRole.ROLE_PILOT);
        AppUser fleetOwnerA = createUser("sec_fleet_a_" + tag, "Chủ Đội A", UserRole.ROLE_PILOT);
        AppUser fleetOwnerB = createUser("sec_fleet_b_" + tag, "Chủ Đội B", UserRole.ROLE_PILOT);
        AppUser pilotB1 =
                createUser("sec_pilot_b1_" + tag, "Kỹ sư Nội Bộ B1", UserRole.ROLE_OPERATOR);
        AppUser pilotB2 =
                createUser("sec_pilot_b2_" + tag, "Kỹ sư Nội Bộ B2", UserRole.ROLE_OPERATOR);

        var authAdmin = authFor(admin);
        var authCustomerA = authFor(customerA);
        var authCustomerB = authFor(customerB);
        var authFleetA = authFor(fleetOwnerA);
        var authFleetB = authFor(fleetOwnerB);
        var authPilotB1 = authFor(pilotB1);

        String secretFleetBName = "Đội Bay Bí Mật Sao Mai " + tag;
        String secretUavB1Serial = "SN-SECRET-B1-" + tag.toUpperCase();

        // Provision Fleet A and Fleet B
        var profileA =
                providerService.upsertMyProfile(
                        new ProviderOnboardingRequest(
                                "Đội Bay Đối Thủ A " + tag,
                                ProviderType.COMPANY,
                                "010111222",
                                "GP-SECA-01",
                                "Đội bay A — minh hoạ",
                                "Hà Nội",
                                200,
                                "0901112223",
                                "ACB",
                                "111222333",
                                "FLEET A",
                                true),
                        fleetOwnerA.getUsername());
        adminService.moderateProvider(
                profileA.id(),
                new ProviderModerationRequest(ProviderVerificationStatus.VERIFIED, "OK", null),
                admin.getUsername());
        var uavA1 =
                providerService.registerProviderUav(
                        new ProviderUavCreateRequest("Mavic 3 Survey", "SN-SECA-" + tag, "DJI"),
                        fleetOwnerA.getUsername());

        var profileB =
                providerService.upsertMyProfile(
                        new ProviderOnboardingRequest(
                                secretFleetBName,
                                ProviderType.COMPANY,
                                "030999888",
                                "GP-SECB-01",
                                "Đội bay B — minh hoạ",
                                "Khánh Hòa",
                                200,
                                "0909998887",
                                "Vietcombank",
                                "999888777",
                                "FLEET B",
                                true),
                        fleetOwnerB.getUsername());
        var verifiedProfileB =
                adminService.moderateProvider(
                        profileB.id(),
                        new ProviderModerationRequest(
                                ProviderVerificationStatus.VERIFIED, "OK", null),
                        admin.getUsername());
        var uavB1 =
                providerService.registerProviderUav(
                        new ProviderUavCreateRequest(
                                "Matrice 350 Survey — minh hoạ", secretUavB1Serial, "DJI"),
                        fleetOwnerB.getUsername());
        var uavB2 =
                providerService.registerProviderUav(
                        new ProviderUavCreateRequest(
                                "Mavic 3 Enterprise — minh hoạ",
                                "SN-SECRET-B2-" + tag.toUpperCase(),
                                "DJI"),
                        fleetOwnerB.getUsername());

        var pilotRowB1 =
                fleetService.createPilot(
                        new ProviderPilotUpsertRequest(
                                pilotB1.getId(),
                                pilotB1.getId(),
                                pilotB1.getFullName(),
                                pilotB1.getEmail(),
                                "0909000111",
                                "CC-SECB1",
                                "Khảo sát 2D",
                                ProviderPilotStatus.AVAILABLE,
                                uavB1.id()),
                        fleetOwnerB.getUsername());
        var pilotRowB2 =
                fleetService.createPilot(
                        new ProviderPilotUpsertRequest(
                                pilotB2.getId(),
                                pilotB2.getId(),
                                pilotB2.getFullName(),
                                pilotB2.getEmail(),
                                "0909000222",
                                "CC-SECB2",
                                "Khảo sát 3D",
                                ProviderPilotStatus.AVAILABLE,
                                uavB2.id()),
                        fleetOwnerB.getUsername());

        ServiceOffering template =
                serviceOfferings.save(
                        new ServiceOffering(
                                "SEC_SURVEY_" + tag.toUpperCase(),
                                "Khảo sát bản đồ an ninh phân quyền",
                                "Dịch vụ kiểm thử phân quyền — minh hoạ",
                                90));
        var draftListingB =
                fleetService.createListingFromTemplate(
                        new CreateListingFromTemplateRequest(
                                template.getId(),
                                "Gói khảo sát khu đô thị biển — minh hoạ",
                                "Khánh Hòa",
                                180,
                                new BigDecimal("600000"),
                                PricingModel.PER_HECTARE,
                                new BigDecimal("2"),
                                48,
                                24,
                                null,
                                null,
                                null,
                                true),
                        fleetOwnerB.getUsername());
        var publishedListingB =
                adminService.moderateListing(
                        draftListingB.id(),
                        new ListingModerationRequest(ListingModerationStatus.PUBLISHED, "OK", true),
                        admin.getUsername());

        // Customer B creates Project B and 2 Subscriptions (creating missionB1 and missionB2)
        long projectBId =
                json.readTree(
                                mvc.perform(
                                                post("/api/v1/projects")
                                                        .with(authentication(authCustomerB))
                                                        .with(csrf())
                                                        .contentType(MediaType.APPLICATION_JSON)
                                                        .content(
                                                                json.writeValueAsString(
                                                                        Map.of(
                                                                                "name",
                                                                                "Dự án Riêng Tư Khách B — minh hoạ",
                                                                                "province",
                                                                                "Khánh Hòa",
                                                                                "note",
                                                                                "Bí mật kinh doanh B"))))
                                        .andExpect(status().isCreated())
                                        .andReturn()
                                        .getResponse()
                                        .getContentAsString())
                        .get("id")
                        .asLong();

        JsonNode subB1Node =
                json.readTree(
                        mvc.perform(
                                        post("/api/v1/projects/" + projectBId + "/subscriptions")
                                                .with(authentication(authCustomerB))
                                                .with(csrf())
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(
                                                        json.writeValueAsString(
                                                                Map.of(
                                                                        "listingId",
                                                                        publishedListingB.id(),
                                                                        "scheduleType",
                                                                        "WEEKLY",
                                                                        "startDate",
                                                                        LocalDate.now()
                                                                                .plusDays(2)
                                                                                .toString(),
                                                                        "units",
                                                                        3))))
                                .andExpect(status().isCreated())
                                .andReturn()
                                .getResponse()
                                .getContentAsString());
        long subB1Id = subB1Node.get("id").asLong();
        long missionB1Id = subB1Node.get("firstMissionId").asLong();

        JsonNode subB2Node =
                json.readTree(
                        mvc.perform(
                                        post("/api/v1/projects/" + projectBId + "/subscriptions")
                                                .with(authentication(authCustomerB))
                                                .with(csrf())
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(
                                                        json.writeValueAsString(
                                                                Map.of(
                                                                        "listingId",
                                                                        publishedListingB.id(),
                                                                        "scheduleType",
                                                                        "ONCE",
                                                                        "startDate",
                                                                        LocalDate.now()
                                                                                .plusDays(3)
                                                                                .toString(),
                                                                        "units",
                                                                        2))))
                                .andExpect(status().isCreated())
                                .andReturn()
                                .getResponse()
                                .getContentAsString());
        long missionB2Id = subB2Node.get("firstMissionId").asLong();

        // =========================================================================
        // 1. CUSTOMER A vs CUSTOMER B IDOR CHECKS (must all return 403 Forbidden)
        // =========================================================================
        mvc.perform(get("/api/v1/projects/" + projectBId).with(authentication(authCustomerA)))
                .andExpect(status().isForbidden());
        mvc.perform(
                        patch("/api/v1/projects/" + projectBId)
                                .with(authentication(authCustomerA))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"Hack Project B\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(
                        delete("/api/v1/projects/" + projectBId)
                                .with(authentication(authCustomerA))
                                .with(csrf()))
                .andExpect(status().isForbidden());
        mvc.perform(
                        get("/api/v1/projects/" + projectBId + "/subscriptions")
                                .with(authentication(authCustomerA)))
                .andExpect(status().isForbidden());
        mvc.perform(
                        post("/api/v1/projects/" + projectBId + "/subscriptions")
                                .with(authentication(authCustomerA))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsString(
                                                Map.of(
                                                        "listingId",
                                                        publishedListingB.id(),
                                                        "scheduleType",
                                                        "ONCE",
                                                        "startDate",
                                                        LocalDate.now().plusDays(2).toString(),
                                                        "units",
                                                        2))))
                .andExpect(status().isForbidden());
        mvc.perform(
                        patch("/api/v1/projects/" + projectBId + "/subscriptions/" + subB1Id)
                                .with(authentication(authCustomerA))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"status\":\"PAUSED\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(
                        delete("/api/v1/projects/" + projectBId + "/subscriptions/" + subB1Id)
                                .with(authentication(authCustomerA))
                                .with(csrf()))
                .andExpect(status().isForbidden());

        // Customer A cannot read/cancel/review/track Customer B's order
        mvc.perform(get("/api/v1/missions/" + missionB1Id).with(authentication(authCustomerA)))
                .andExpect(status().isForbidden());
        mvc.perform(
                        get("/api/v1/missions/" + missionB1Id + "/timeline")
                                .with(authentication(authCustomerA)))
                .andExpect(status().isForbidden());
        mvc.perform(
                        get("/api/v1/missions/" + missionB1Id + "/inspection-report")
                                .with(authentication(authCustomerA)))
                .andExpect(status().isForbidden());
        mvc.perform(
                        get("/api/v1/orders/" + missionB1Id + "/tracking")
                                .with(authentication(authCustomerA)))
                .andExpect(status().isForbidden());
        mvc.perform(
                        post("/api/v1/missions/" + missionB1Id + "/cancel")
                                .with(authentication(authCustomerA))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"reason\":\"IDOR cancel\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(
                        put("/api/v1/missions/" + missionB1Id + "/review")
                                .with(authentication(authCustomerA))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"rating\":1,\"comment\":\"IDOR fake review\"}"))
                .andExpect(status().isForbidden());

        // Customer A list endpoints return 0 items of Customer B
        JsonNode custAProjects =
                json.readTree(
                        mvc.perform(get("/api/v1/projects").with(authentication(authCustomerA)))
                                .andExpect(status().isOk())
                                .andReturn()
                                .getResponse()
                                .getContentAsString());
        assertEquals(0, custAProjects.path("totalElements").asInt());
        JsonNode custAMissions =
                json.readTree(
                        mvc.perform(get("/api/v1/missions").with(authentication(authCustomerA)))
                                .andExpect(status().isOk())
                                .andReturn()
                                .getResponse()
                                .getContentAsString());
        assertEquals(0, custAMissions.path("totalElements").asInt());

        // =========================================================================
        // 2. /api/v1/admin/marketplace/* REJECTS CUSTOMER, FLEET, AND PILOT (403)
        // =========================================================================
        for (var nonAdminAuth : List.of(authCustomerA, authFleetA, authPilotB1)) {
            mvc.perform(
                            get("/api/v1/admin/marketplace/providers")
                                    .with(authentication(nonAdminAuth)))
                    .andExpect(status().isForbidden());
            mvc.perform(
                            post("/api/v1/admin/marketplace/providers/"
                                            + profileA.id()
                                            + "/moderate")
                                    .with(authentication(nonAdminAuth))
                                    .with(csrf())
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content("{\"status\":\"VERIFIED\",\"reviewNote\":\"hack\"}"))
                    .andExpect(status().isForbidden());
            mvc.perform(
                            get("/api/v1/admin/marketplace/listings")
                                    .with(authentication(nonAdminAuth)))
                    .andExpect(status().isForbidden());
            mvc.perform(
                            get("/api/v1/admin/marketplace/dispatch")
                                    .with(authentication(nonAdminAuth)))
                    .andExpect(status().isForbidden());
            mvc.perform(
                            post("/api/v1/admin/marketplace/dispatch/" + missionB1Id)
                                    .with(authentication(nonAdminAuth))
                                    .with(csrf())
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content("{\"providerId\":" + profileA.id() + "}"))
                    .andExpect(status().isForbidden());
            mvc.perform(
                            post("/api/v1/admin/marketplace/dispatch/" + missionB1Id + "/auto")
                                    .with(authentication(nonAdminAuth))
                                    .with(csrf()))
                    .andExpect(status().isForbidden());
            mvc.perform(
                            post("/api/v1/admin/marketplace/dispatch/auto")
                                    .with(authentication(nonAdminAuth))
                                    .with(csrf()))
                    .andExpect(status().isForbidden());
            mvc.perform(get("/api/v1/admin/marketplace/stats").with(authentication(nonAdminAuth)))
                    .andExpect(status().isForbidden());
            mvc.perform(get("/api/v1/admin/marketplace/payouts").with(authentication(nonAdminAuth)))
                    .andExpect(status().isForbidden());
        }

        // Dispatch both missionB1 and missionB2 to Fleet B via Admin
        mvc.perform(
                        post("/api/v1/admin/marketplace/dispatch/" + missionB1Id)
                                .with(authentication(authAdmin))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsString(
                                                Map.of(
                                                        "providerId",
                                                        verifiedProfileB.id(),
                                                        "note",
                                                        "Giao đơn 1 cho Đội B"))))
                .andExpect(status().isOk());
        mvc.perform(
                        post("/api/v1/admin/marketplace/dispatch/" + missionB2Id)
                                .with(authentication(authAdmin))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsString(
                                                Map.of(
                                                        "providerId",
                                                        verifiedProfileB.id(),
                                                        "note",
                                                        "Giao đơn 2 cho Đội B"))))
                .andExpect(status().isOk());

        // =========================================================================
        // 3. FLEET A vs FLEET B IDOR CHECKS (must all return 403 Forbidden)
        // =========================================================================
        mvc.perform(
                        get("/api/v1/marketplace/provider/orders/" + missionB1Id)
                                .with(authentication(authFleetA)))
                .andExpect(status().isForbidden());
        mvc.perform(
                        post("/api/v1/marketplace/provider/orders/" + missionB1Id + "/respond")
                                .with(authentication(authFleetA))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"accept\":true,\"reason\":\"Fleet A cướp đơn\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(
                        post("/api/v1/marketplace/provider/orders/" + missionB1Id + "/assign")
                                .with(authentication(authFleetA))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"uavId\":" + uavA1.id() + "}"))
                .andExpect(status().isForbidden());
        mvc.perform(
                        post("/api/v1/marketplace/provider/orders/" + missionB1Id + "/start")
                                .with(authentication(authFleetA))
                                .with(csrf()))
                .andExpect(status().isForbidden());
        mvc.perform(
                        post("/api/v1/marketplace/provider/orders/" + missionB1Id + "/complete")
                                .with(authentication(authFleetA))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"completionNote\":\"Fleet A hoàn thành giả\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(
                        patch("/api/v1/marketplace/provider/fleet/uavs/" + uavB1.id())
                                .with(authentication(authFleetA))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"status\":\"MAINTENANCE\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(
                        delete("/api/v1/marketplace/provider/fleet/uavs/" + uavB1.id())
                                .with(authentication(authFleetA))
                                .with(csrf()))
                .andExpect(status().isForbidden());
        mvc.perform(
                        delete("/api/v1/marketplace/provider/pilots/" + pilotRowB1.id())
                                .with(authentication(authFleetA))
                                .with(csrf()))
                .andExpect(status().isForbidden());
        mvc.perform(
                        delete("/api/v1/marketplace/provider/listings/" + publishedListingB.id())
                                .with(authentication(authFleetA))
                                .with(csrf()))
                .andExpect(status().isForbidden());

        // =========================================================================
        // 4. CONTROL ENGINEER (PILOT B1 vs PILOT B2) ISOLATION CHECKS
        // =========================================================================
        // Empty body `{}` on /respond, /assign, /complete MUST check authorization (403) BEFORE
        // schema validation (400), while valid owner sending `{}` still receives 400
        mvc.perform(
                        post("/api/v1/marketplace/provider/orders/" + missionB1Id + "/respond")
                                .with(authentication(authFleetA))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{}"))
                .andExpect(status().isForbidden());
        mvc.perform(
                        post("/api/v1/marketplace/provider/orders/" + missionB1Id + "/respond")
                                .with(authentication(authPilotB1))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{}"))
                .andExpect(status().isForbidden());
        mvc.perform(
                        post("/api/v1/marketplace/provider/orders/" + missionB1Id + "/respond")
                                .with(authentication(authFleetB))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{}"))
                .andExpect(status().isBadRequest());

        // Fleet B accepts both orders; assigns missionB1 -> Pilot B1, missionB2 -> Pilot B2
        mvc.perform(
                        post("/api/v1/marketplace/provider/orders/" + missionB1Id + "/assign")
                                .with(authentication(authFleetB))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsString(
                                                Map.of(
                                                        "pilotId",
                                                        pilotRowB1.id(),
                                                        "uavId",
                                                        uavB1.id(),
                                                        "note",
                                                        "Giao cho B1"))))
                .andExpect(status().isOk());
        mvc.perform(
                        post("/api/v1/marketplace/provider/orders/" + missionB2Id + "/assign")
                                .with(authentication(authFleetB))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsString(
                                                Map.of(
                                                        "pilotId",
                                                        pilotRowB2.id(),
                                                        "uavId",
                                                        uavB2.id(),
                                                        "note",
                                                        "Giao cho B2"))))
                .andExpect(status().isOk());

        // Pilot B1 sees ONLY missionB1 in both /marketplace/provider/orders and /missions
        JsonNode pilotB1ProviderOrders =
                json.readTree(
                        mvc.perform(
                                        get("/api/v1/marketplace/provider/orders")
                                                .with(authentication(authPilotB1)))
                                .andExpect(status().isOk())
                                .andReturn()
                                .getResponse()
                                .getContentAsString());
        assertEquals(1, pilotB1ProviderOrders.size());
        assertEquals(missionB1Id, pilotB1ProviderOrders.get(0).get("id").asLong());

        JsonNode pilotB1Missions =
                json.readTree(
                        mvc.perform(get("/api/v1/missions").with(authentication(authPilotB1)))
                                .andExpect(status().isOk())
                                .andReturn()
                                .getResponse()
                                .getContentAsString());
        assertEquals(1, pilotB1Missions.path("totalElements").asInt());
        assertEquals(missionB1Id, pilotB1Missions.path("content").get(0).get("id").asLong());

        // Pilot B1 CANNOT view/track/start/complete Pilot B2's order (403)
        mvc.perform(
                        get("/api/v1/marketplace/provider/orders/" + missionB2Id)
                                .with(authentication(authPilotB1)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/missions/" + missionB2Id).with(authentication(authPilotB1)))
                .andExpect(status().isForbidden());
        mvc.perform(
                        get("/api/v1/orders/" + missionB2Id + "/tracking")
                                .with(authentication(authPilotB1)))
                .andExpect(status().isForbidden());
        mvc.perform(
                        post("/api/v1/marketplace/provider/orders/" + missionB2Id + "/start")
                                .with(authentication(authPilotB1))
                                .with(csrf()))
                .andExpect(status().isForbidden());
        mvc.perform(
                        post("/api/v1/marketplace/provider/orders/" + missionB2Id + "/complete")
                                .with(authentication(authPilotB1))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"completionNote\":\"B1 hoàn thành đơn của B2\"}"))
                .andExpect(status().isForbidden());

        // Pilot B1 CANNOT perform fleet-owner-only actions (respond, assign, delete UAV)
        mvc.perform(
                        post("/api/v1/marketplace/provider/orders/" + missionB1Id + "/respond")
                                .with(authentication(authPilotB1))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"accept\":false,\"reason\":\"Kỹ sư tự ý từ chối\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(
                        post("/api/v1/marketplace/provider/orders/" + missionB1Id + "/assign")
                                .with(authentication(authPilotB1))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"uavId\":" + uavB2.id() + "}"))
                .andExpect(status().isForbidden());
        mvc.perform(
                        delete("/api/v1/marketplace/provider/fleet/uavs/" + uavB1.id())
                                .with(authentication(authPilotB1))
                                .with(csrf()))
                .andExpect(status().isForbidden());

        // Pilot B1 CAN start and complete their own assigned missionB1 (200)
        mvc.perform(
                        post("/api/v1/marketplace/provider/orders/" + missionB1Id + "/start")
                                .with(authentication(authPilotB1))
                                .with(csrf()))
                .andExpect(status().isOk());
        mvc.perform(
                        post("/api/v1/marketplace/provider/orders/" + missionB1Id + "/complete")
                                .with(authentication(authPilotB1))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"completionNote\":\"Kỹ sư B1 hoàn thành bàn giao\"}"))
                .andExpect(status().isOk());

        // Customer B reviews missionB1 so public listing detail ALSO contains nested reviews[]
        mvc.perform(
                        put("/api/v1/missions/" + missionB1Id + "/review")
                                .with(authentication(authCustomerB))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"rating\":5,\"comment\":\"Bàn giao tốt\"}"))
                .andExpect(status().isOk());

        // =========================================================================
        // 5. DEEP RECURSIVE JSON AUDIT: ZERO PROVIDER IDENTITY LEAKAGE ON PUBLIC
        //    AND CUSTOMER ENDPOINTS (including nested objects & arrays)
        // =========================================================================
        mvc.perform(get("/api/v1/public/marketplace/providers/" + verifiedProfileB.slug()))
                .andExpect(status().isNotFound());

        List<String> forbiddenSecrets =
                List.of(
                        secretFleetBName,
                        verifiedProfileB.slug(),
                        pilotB1.getFullName(),
                        pilotB1.getUsername(),
                        fleetOwnerB.getUsername(),
                        secretUavB1Serial);

        List<String> payloadsToAudit = new ArrayList<>();
        payloadsToAudit.add(
                mvc.perform(get("/api/v1/public/marketplace/listings?q=khu+đô+thị+biển"))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString());
        payloadsToAudit.add(
                mvc.perform(get("/api/v1/public/marketplace/listings/" + publishedListingB.slug()))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString());
        payloadsToAudit.add(
                mvc.perform(get("/api/v1/missions").with(authentication(authCustomerB)))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString());
        payloadsToAudit.add(
                mvc.perform(
                                get("/api/v1/missions/" + missionB1Id)
                                        .with(authentication(authCustomerB)))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString());
        payloadsToAudit.add(
                mvc.perform(
                                get("/api/v1/missions/" + missionB1Id + "/timeline")
                                        .with(authentication(authCustomerB)))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString());
        payloadsToAudit.add(
                mvc.perform(
                                get("/api/v1/missions/" + missionB1Id + "/inspection-report")
                                        .with(authentication(authCustomerB)))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString());
        payloadsToAudit.add(
                mvc.perform(
                                post("/api/v1/missions/" + missionB2Id + "/cancel")
                                        .with(authentication(authCustomerB))
                                        .with(csrf())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content("{\"reason\":\"Huỷ đơn 2 trước khi bay\"}"))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString());

        for (String payload : payloadsToAudit) {
            JsonNode tree = json.readTree(payload);
            assertZeroIdentityLeakRecursive(tree, forbiddenSecrets, "$");
        }
    }

    private static void assertZeroIdentityLeakRecursive(
            JsonNode node, List<String> forbiddenSubstrings, String path) {
        if (node == null || node.isNull() || node.isMissingNode()) {
            return;
        }
        if (node.isObject()) {
            Iterator<Map.Entry<String, JsonNode>> fields = node.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> entry = fields.next();
                String key = entry.getKey();
                JsonNode val = entry.getValue();
                String childPath = path + "." + key;
                if (FORBIDDEN_NON_NULL_KEYS_FOR_CUSTOMER.contains(key)) {
                    assertTrue(
                            val == null || val.isNull(),
                            "Expected null for anonymized key at "
                                    + childPath
                                    + " but got: "
                                    + val);
                }
                assertZeroIdentityLeakRecursive(val, forbiddenSubstrings, childPath);
            }
        } else if (node.isArray()) {
            for (int i = 0; i < node.size(); i++) {
                assertZeroIdentityLeakRecursive(
                        node.get(i), forbiddenSubstrings, path + "[" + i + "]");
            }
        } else if (node.isTextual()) {
            String text = node.asText();
            for (String secret : forbiddenSubstrings) {
                assertFalse(
                        text.toLowerCase().contains(secret.toLowerCase()),
                        "Leaked fleet/pilot secret '" + secret + "' at " + path + ": " + text);
            }
        }
    }

    private AppUser createUser(String username, String fullName, UserRole role) {
        AppUser u = new AppUser();
        u.setUsername(username);
        u.setEmail(username + "@uav.local");
        u.setFullName(fullName);
        u.setPasswordHash("hashed");
        u.setRole(role);
        u.setStatus(UserStatus.ACTIVE);
        return users.save(u);
    }

    private static UsernamePasswordAuthenticationToken authFor(AppUser user) {
        List<SimpleGrantedAuthority> authorities =
                switch (user.getRole()) {
                    case ROLE_ADMIN ->
                            List.of(
                                    new SimpleGrantedAuthority("ROLE_ADMIN"),
                                    new SimpleGrantedAuthority("MARKETPLACE_MODERATE"),
                                    new SimpleGrantedAuthority("PAYOUT_MANAGE"),
                                    new SimpleGrantedAuthority("MISSION_VIEW_ALL"),
                                    new SimpleGrantedAuthority("MISSION_VIEW"),
                                    new SimpleGrantedAuthority("MISSION_CREATE"),
                                    new SimpleGrantedAuthority("MISSION_UPDATE"),
                                    new SimpleGrantedAuthority("MISSION_CANCEL"));
                    case ROLE_OPERATOR ->
                            List.of(
                                    new SimpleGrantedAuthority("ROLE_OPERATOR"),
                                    new SimpleGrantedAuthority("MISSION_VIEW"),
                                    new SimpleGrantedAuthority("MISSION_START"),
                                    new SimpleGrantedAuthority("MISSION_COMPLETE"),
                                    new SimpleGrantedAuthority("MISSION_STATUS_UPDATE"));
                    default ->
                            List.of(
                                    new SimpleGrantedAuthority(user.getRole().name()),
                                    new SimpleGrantedAuthority("MISSION_VIEW"),
                                    new SimpleGrantedAuthority("MISSION_CREATE"),
                                    new SimpleGrantedAuthority("MISSION_UPDATE"),
                                    new SimpleGrantedAuthority("MISSION_CANCEL"),
                                    new SimpleGrantedAuthority("MISSION_TIMELINE_VIEW"));
                };
        return UsernamePasswordAuthenticationToken.authenticated(
                user.getUsername(), null, authorities);
    }

    private static String suffix() {
        return UUID.randomUUID().toString().substring(0, 6);
    }
}
