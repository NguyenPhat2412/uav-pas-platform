package com.uav.platform.integration.marketplace;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.dao.marketplace.IProviderProfileDao;
import com.uav.platform.dao.mission.IMissionDao;
import com.uav.platform.dao.user.IUserDao;
import com.uav.platform.dto.request.marketplace.admin.ProviderModerationRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderOnboardingRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderPilotUpsertRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderUavCreateRequest;
import com.uav.platform.dto.response.marketplace.provider.ProviderPilotResponse;
import com.uav.platform.dto.response.marketplace.provider.ProviderProfileResponse;
import com.uav.platform.dto.response.marketplace.provider.ProviderUavResponse;
import com.uav.platform.entity.marketplace.ProviderProfile;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.marketplace.ProviderOrderStatus;
import com.uav.platform.enums.marketplace.ProviderPilotStatus;
import com.uav.platform.enums.marketplace.ProviderType;
import com.uav.platform.enums.marketplace.ProviderVerificationStatus;
import com.uav.platform.enums.mission.MissionPriority;
import com.uav.platform.enums.mission.MissionStatus;
import com.uav.platform.enums.mission.MissionType;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * HTTP-level integration tests verifying 409 UAV_TIME_CONFLICT, 409 OPERATOR_TIME_CONFLICT, 409
 * UAV_IN_USE, adjacent time slots, terminal status exclusions, and 403 authorization checks.
 */
@SpringBootTest(
        properties =
                "spring.datasource.url=jdbc:h2:mem:uav_assign_conflict;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE")
class MarketplaceAssignConflictIntegrationTest {

    @Autowired WebApplicationContext context;
    @Autowired IUserDao users;
    @Autowired IProviderProfileDao providers;
    @Autowired IMissionDao missions;
    @Autowired MarketplaceProviderService providerService;
    @Autowired MarketplaceProviderFleetService fleetService;
    @Autowired MarketplaceAdminService adminService;

    final ObjectMapper json = new ObjectMapper().findAndRegisterModules();
    MockMvc mvc;

    private AppUser admin;
    private AppUser customer;
    private AppUser fleetOwner;
    private AppUser otherFleetOwner;
    private ProviderProfile fleetProfile;
    private ProviderUavResponse uav1;
    private ProviderUavResponse uav2;
    private ProviderPilotResponse pilot1;
    private ProviderPilotResponse pilot2;

    @BeforeEach
    void setup() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();

        admin = createUser("cf_admin", UserRole.ROLE_ADMIN);
        customer = createUser("cf_cust", UserRole.ROLE_PILOT);
        fleetOwner = createUser("cf_fleet", UserRole.ROLE_PILOT);
        otherFleetOwner = createUser("cf_other", UserRole.ROLE_PILOT);

        ProviderProfileResponse p1 = onboardAndVerify(fleetOwner, "Đội bay Conflict A");
        onboardAndVerify(otherFleetOwner, "Đội bay Conflict B");
        fleetProfile = providers.findById(p1.id()).orElseThrow();

        uav1 =
                providerService.registerProviderUav(
                        new ProviderUavCreateRequest("CF-UAV-01-" + suffix(), "Matrice 350", "DJI"),
                        fleetOwner.getUsername());
        uav2 =
                providerService.registerProviderUav(
                        new ProviderUavCreateRequest("CF-UAV-02-" + suffix(), "Mavic 3E", "DJI"),
                        fleetOwner.getUsername());

        AppUser pilotUser1 = createUser("cf_pilot1", UserRole.ROLE_OPERATOR);
        AppUser pilotUser2 = createUser("cf_pilot2", UserRole.ROLE_OPERATOR);
        pilot1 =
                fleetService.createPilot(
                        new ProviderPilotUpsertRequest(
                                pilotUser1.getId(),
                                null,
                                "Kỹ sư CF 1",
                                pilotUser1.getEmail(),
                                "0901112221",
                                "LIC-CF-01",
                                "Khảo sát",
                                ProviderPilotStatus.AVAILABLE,
                                uav1.id()),
                        fleetOwner.getUsername());
        pilot2 =
                fleetService.createPilot(
                        new ProviderPilotUpsertRequest(
                                pilotUser2.getId(),
                                null,
                                "Kỹ sư CF 2",
                                pilotUser2.getEmail(),
                                "0901112222",
                                "LIC-CF-02",
                                "Nhiệt",
                                ProviderPilotStatus.AVAILABLE,
                                uav2.id()),
                        fleetOwner.getUsername());
    }

    @Test
    void assignAndStartEnforceUavOperatorTimeConflictsAdjacentSlotsTerminalExclusionsAnd403()
            throws Exception {
        var fleetAuth = authToken(fleetOwner);
        var otherFleetAuth = authToken(otherFleetOwner);
        var customerAuth = authToken(customer);

        Mission orderA = createProviderOrder(9, 11, MissionStatus.CONFIRMED);
        Mission orderB = createProviderOrder(10, 12, MissionStatus.CONFIRMED);

        // 1. Customer & other fleet owner get 403 on assign
        mvc.perform(
                        post("/api/v1/marketplace/provider/orders/" + orderA.getId() + "/assign")
                                .with(authentication(customerAuth))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json.writeValueAsString(Map.of("uavId", uav1.id()))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("PROVIDER_PROFILE_REQUIRED"));

        mvc.perform(
                        post("/api/v1/marketplace/provider/orders/" + orderA.getId() + "/assign")
                                .with(authentication(otherFleetAuth))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json.writeValueAsString(Map.of("uavId", uav1.id()))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ORDER_ACCESS_DENIED"));

        // 2. Assign order A (9:00-11:00) with uav1 + pilot1 -> 200
        mvc.perform(
                        post("/api/v1/marketplace/provider/orders/" + orderA.getId() + "/assign")
                                .with(authentication(fleetAuth))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsString(
                                                Map.of(
                                                        "uavId",
                                                        uav1.id(),
                                                        "pilotId",
                                                        pilot1.id()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("READY"));

        // 3. Overlapping order B (10:00-12:00) with same uav1 + different pilot2 -> 409
        // UAV_TIME_CONFLICT
        mvc.perform(
                        post("/api/v1/marketplace/provider/orders/" + orderB.getId() + "/assign")
                                .with(authentication(fleetAuth))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsString(
                                                Map.of(
                                                        "uavId",
                                                        uav1.id(),
                                                        "pilotId",
                                                        pilot2.id()))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("UAV_TIME_CONFLICT"));

        // 4. Overlapping order B (10:00-12:00) with different uav2 + same pilot1 -> 409
        // OPERATOR_TIME_CONFLICT
        mvc.perform(
                        post("/api/v1/marketplace/provider/orders/" + orderB.getId() + "/assign")
                                .with(authentication(fleetAuth))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsString(
                                                Map.of(
                                                        "uavId",
                                                        uav2.id(),
                                                        "pilotId",
                                                        pilot1.id()))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("OPERATOR_TIME_CONFLICT"));

        // 5. Adjacent order C (11:00-13:00, touching edge at 11:00) with same uav1 + same pilot1 ->
        // 200
        Mission orderC = createProviderOrder(11, 13, MissionStatus.CONFIRMED);
        mvc.perform(
                        post("/api/v1/marketplace/provider/orders/" + orderC.getId() + "/assign")
                                .with(authentication(fleetAuth))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsString(
                                                Map.of(
                                                        "uavId",
                                                        uav1.id(),
                                                        "pilotId",
                                                        pilot1.id()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("READY"));

        // 6. Start order A -> 200 IN_PROGRESS, then starting order C while A is IN_PROGRESS -> 409
        // UAV_IN_USE
        mvc.perform(
                        post("/api/v1/marketplace/provider/orders/" + orderA.getId() + "/start")
                                .with(authentication(fleetAuth))
                                .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));

        mvc.perform(
                        post("/api/v1/marketplace/provider/orders/" + orderC.getId() + "/start")
                                .with(authentication(fleetAuth))
                                .with(csrf()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("UAV_IN_USE"));

        // 7. Once order A is COMPLETED, order B (10:00-12:00) with uav1 is still blocked by C
        // (11-13);
        // cancelling C unblocks B (10:00-12:00) -> 200
        Mission loadedA = missions.findById(orderA.getId()).orElseThrow();
        loadedA.setStatus(MissionStatus.COMPLETED);
        missions.save(loadedA);
        Mission loadedC = missions.findById(orderC.getId()).orElseThrow();
        loadedC.setStatus(MissionStatus.CANCELLED);
        missions.save(loadedC);

        mvc.perform(
                        post("/api/v1/marketplace/provider/orders/" + orderB.getId() + "/assign")
                                .with(authentication(fleetAuth))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsString(
                                                Map.of(
                                                        "uavId",
                                                        uav1.id(),
                                                        "pilotId",
                                                        pilot1.id()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("READY"));

        // 8. Order D (10:00-12:00, no UAV assigned) auto-picks free uav2 instead of uav1 booked by
        // B
        Mission orderD = createProviderOrder(10, 12, MissionStatus.CONFIRMED);
        mvc.perform(
                        post("/api/v1/marketplace/provider/orders/" + orderD.getId() + "/start")
                                .with(authentication(fleetAuth))
                                .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.assignedUavId").value(uav2.id()));

        // 9. Order E (10:00-12:00, no UAV assigned) when uav1 is booked by B and uav2 is IN_USE ->
        // 409 NO_UAV_AVAILABLE
        Mission orderE = createProviderOrder(10, 12, MissionStatus.CONFIRMED);
        mvc.perform(
                        post("/api/v1/marketplace/provider/orders/" + orderE.getId() + "/start")
                                .with(authentication(fleetAuth))
                                .with(csrf()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("NO_UAV_AVAILABLE"));

        // 10. Two overlapping responds without specified pilot -> second gets 409
        // OPERATOR_TIME_CONFLICT
        Mission resp1 = createProviderOrder(14, 16, MissionStatus.PENDING_CONFIRMATION);
        Mission resp2 = createProviderOrder(15, 17, MissionStatus.PENDING_CONFIRMATION);
        Mission respAdjacent = createProviderOrder(16, 18, MissionStatus.PENDING_CONFIRMATION);

        mvc.perform(
                        post("/api/v1/marketplace/provider/orders/" + resp1.getId() + "/respond")
                                .with(authentication(fleetAuth))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"accept\":true,\"reason\":\"Nhận 14-16\"}"))
                .andExpect(status().isOk());

        mvc.perform(
                        post("/api/v1/marketplace/provider/orders/" + resp2.getId() + "/respond")
                                .with(authentication(fleetAuth))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"accept\":true,\"reason\":\"Nhận 15-17\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("OPERATOR_TIME_CONFLICT"));

        mvc.perform(
                        post("/api/v1/marketplace/provider/orders/"
                                        + respAdjacent.getId()
                                        + "/respond")
                                .with(authentication(fleetAuth))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"accept\":true,\"reason\":\"Nhận 16-18 chạm mép\"}"))
                .andExpect(status().isOk());
    }

    private String suffix() {
        return UUID.randomUUID().toString().substring(0, 6);
    }

    private AppUser createUser(String prefix, UserRole role) {
        String id = suffix();
        AppUser u =
                new AppUser(
                        prefix + "_" + id,
                        prefix + "_" + id + "@example.test",
                        "hash",
                        prefix + " " + id,
                        UserStatus.ACTIVE);
        u.setRole(role);
        return users.save(u);
    }

    private UsernamePasswordAuthenticationToken authToken(AppUser user) {
        return new UsernamePasswordAuthenticationToken(
                user.getUsername(),
                "N/A",
                List.of(new SimpleGrantedAuthority(user.getRole().name())));
    }

    private ProviderProfileResponse onboardAndVerify(AppUser owner, String name) {
        ProviderProfileResponse created =
                providerService.upsertMyProfile(
                        new ProviderOnboardingRequest(
                                name,
                                ProviderType.COMPANY,
                                "0109997777",
                                "GP-CF-01",
                                "Đội bay kiểm thử",
                                "TP. Hồ Chí Minh",
                                120,
                                "0909000222",
                                "Vietcombank",
                                "0071000022222",
                                "TEST FLEET",
                                true),
                        owner.getUsername());
        return adminService.moderateProvider(
                created.id(),
                new ProviderModerationRequest(
                        ProviderVerificationStatus.VERIFIED, "Duyệt tự động", null),
                admin.getUsername());
    }

    private Mission createProviderOrder(int startHour, int endHour, MissionStatus status) {
        LocalDate day = LocalDate.now().plusDays(4);
        LocalDateTime start = day.atTime(startHour, 0);
        LocalDateTime end = day.atTime(endHour, 0);
        Mission m = new Mission();
        m.setCode("MSN-CF-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        m.setTitle("Đơn kiểm thử " + startHour + "h-" + endHour + "h");
        m.setMissionType(MissionType.AREA_INSPECTION);
        m.setPriority(MissionPriority.NORMAL);
        m.setStatus(status);
        m.setCustomer(customer);
        m.setProvider(fleetProfile);
        m.setProviderResponseStatus(ProviderOrderStatus.PENDING_PROVIDER);
        m.setRequestedDate(day);
        m.setStartTime(start);
        m.setExpectedEndTime(end);
        m.setLocationName("TP. Hồ Chí Minh");
        m.setLatitude(new java.math.BigDecimal("10.7769"));
        m.setLongitude(new java.math.BigDecimal("106.7009"));
        return missions.save(m);
    }
}
