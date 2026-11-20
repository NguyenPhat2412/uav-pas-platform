package com.uav.platform.integration.security;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.uav.platform.entity.billing.Invoice;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.notification.Notification;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.mission.MissionPriority;
import com.uav.platform.enums.mission.MissionStatus;
import com.uav.platform.enums.mission.MissionType;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.repository.billing.InvoiceRepository;
import com.uav.platform.repository.mission.MissionRepository;
import com.uav.platform.repository.notification.NotificationRepository;
import com.uav.platform.repository.user.UserRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@SpringBootTest(
        properties =
                "spring.datasource.url=jdbc:h2:mem:uav_idor_security_it;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE")
@DisplayName("IDOR & Cross-Tenant Resource Isolation Integration Tests")
class IdorAuthorizationIntegrationTest {

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository users;
    @Autowired private MissionRepository missions;
    @Autowired private InvoiceRepository invoices;
    @Autowired private NotificationRepository notifications;
    @Autowired private PasswordEncoder encoder;
    @Autowired private ObjectMapper json;

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    private record Actor(AppUser user, String accessToken) {}

    private Actor createAndLoginPilot(String prefix) throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String username = prefix + "_" + suffix;
        String password = "IdorPass!" + suffix;
        AppUser account =
                new AppUser(
                        username,
                        username + "@example.invalid",
                        encoder.encode(password),
                        null,
                        "IDOR Actor " + prefix,
                        null,
                        UserRole.ROLE_PILOT,
                        UserStatus.ACTIVE);
        account.setEmailVerified(true);
        account = users.save(account);

        MvcResult result =
                mvc.perform(
                                post("/api/v1/auth/login")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                json.writeValueAsString(
                                                        Map.of(
                                                                "usernameOrEmail",
                                                                username,
                                                                "password",
                                                                password))))
                        .andExpect(status().isOk())
                        .andReturn();
        @SuppressWarnings("unchecked")
        Map<String, Object> body =
                json.readValue(result.getResponse().getContentAsString(), Map.class);
        return new Actor(account, (String) body.get("accessToken"));
    }

    private static void assertDeniedOrHidden(int statusCode, String context) {
        assertTrue(
                statusCode == 403 || statusCode == 404,
                context + " expected 403 or 404 but got " + statusCode);
    }

    @Test
    @DisplayName("Mission IDOR: User B cannot read User A's mission by ID or via list endpoint")
    void missionIdor_crossUserAccessIsBlocked() throws Exception {
        Actor userA = createAndLoginPilot("idor_mission_a");
        Actor userB = createAndLoginPilot("idor_mission_b");

        String missionCode = "MSN-IDOR-" + UUID.randomUUID().toString().substring(0, 6);
        Mission mission = new Mission();
        mission.setCode(missionCode);
        mission.setCustomer(userA.user());
        mission.setMissionType(MissionType.AREA_INSPECTION);
        mission.setTitle("Confidential Survey of User A");
        mission.setDescription("Private coordinates");
        mission.setRequestedDate(LocalDate.now().plusDays(3));
        mission.setStartTime(LocalDateTime.now().plusDays(3).withHour(9).withMinute(0));
        mission.setExpectedEndTime(LocalDateTime.now().plusDays(3).withHour(11).withMinute(0));
        mission.setLocationName("Quang Ninh Site A");
        mission.setStatus(MissionStatus.PENDING_CONFIRMATION);
        mission.setPriority(MissionPriority.NORMAL);
        mission = missions.save(mission);

        // Owner A can access their own mission
        mvc.perform(
                        get("/api/v1/missions/" + mission.getId())
                                .header(HttpHeaders.AUTHORIZATION, "Bearer " + userA.accessToken()))
                .andExpect(status().isOk());

        // User B must be denied when requesting User A's mission by ID
        int crossGetStatus =
                mvc.perform(
                                get("/api/v1/missions/" + mission.getId())
                                        .header(
                                                HttpHeaders.AUTHORIZATION,
                                                "Bearer " + userB.accessToken()))
                        .andReturn()
                        .getResponse()
                        .getStatus();
        assertDeniedOrHidden(crossGetStatus, "GET /api/v1/missions/{id} cross-user");

        // User B's mission list must not leak User A's mission code (even if customerId param is
        // forged)
        String listBody =
                mvc.perform(
                                get("/api/v1/missions")
                                        .param("customerId", String.valueOf(userA.user().getId()))
                                        .header(
                                                HttpHeaders.AUTHORIZATION,
                                                "Bearer " + userB.accessToken()))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        assertFalse(
                listBody.contains(missionCode),
                "User B must not see User A's mission when forging customerId filter");
    }

    @Test
    @DisplayName(
            "Billing IDOR: User B cannot read User A's invoice, download receipt PDF, or list it")
    void invoiceIdor_crossUserAccessIsBlocked() throws Exception {
        Actor userA = createAndLoginPilot("idor_inv_a");
        Actor userB = createAndLoginPilot("idor_inv_b");

        String invoiceCode = "INV-IDOR-" + UUID.randomUUID().toString().substring(0, 6);
        Invoice invoice =
                invoices.save(
                        new Invoice(
                                invoiceCode,
                                userA.user(),
                                null,
                                null,
                                new BigDecimal("2500000.00"),
                                LocalDateTime.now().plusDays(7),
                                "Private invoice for User A"));

        // Owner A can access their own invoice
        mvc.perform(
                        get("/api/v1/billing/invoices/" + invoice.getId())
                                .header(HttpHeaders.AUTHORIZATION, "Bearer " + userA.accessToken()))
                .andExpect(status().isOk());

        // User B cannot read User A's invoice by ID
        int crossInvoiceStatus =
                mvc.perform(
                                get("/api/v1/billing/invoices/" + invoice.getId())
                                        .header(
                                                HttpHeaders.AUTHORIZATION,
                                                "Bearer " + userB.accessToken()))
                        .andReturn()
                        .getResponse()
                        .getStatus();
        assertDeniedOrHidden(crossInvoiceStatus, "GET /api/v1/billing/invoices/{id} cross-user");

        // User B cannot download User A's receipt PDF
        int crossReceiptStatus =
                mvc.perform(
                                get("/api/v1/billing/invoices/" + invoice.getId() + "/receipt")
                                        .header(
                                                HttpHeaders.AUTHORIZATION,
                                                "Bearer " + userB.accessToken()))
                        .andReturn()
                        .getResponse()
                        .getStatus();
        assertDeniedOrHidden(
                crossReceiptStatus, "GET /api/v1/billing/invoices/{id}/receipt cross-user");

        // User B's invoice list must not contain User A's invoice
        String listBody =
                mvc.perform(
                                get("/api/v1/billing/invoices")
                                        .header(
                                                HttpHeaders.AUTHORIZATION,
                                                "Bearer " + userB.accessToken()))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        assertFalse(listBody.contains(invoiceCode), "User B must not see User A's invoice");
    }

    @Test
    @DisplayName("Notification IDOR: User B cannot mark User A's notification as read")
    void notificationIdor_crossUserMutationIsBlocked() throws Exception {
        Actor userA = createAndLoginPilot("idor_notif_a");
        Actor userB = createAndLoginPilot("idor_notif_b");

        Notification notif = new Notification();
        notif.setUser(userA.user());
        notif.setTitle("Private Alert A");
        notif.setContent("Sensitive mission update for User A");
        notif.setIsRead(false);
        notif = notifications.save(notif);

        // User B tries to mark User A's notification as read
        int crossMarkStatus =
                mvc.perform(
                                patch("/api/v1/notifications/" + notif.getId() + "/read")
                                        .header(
                                                HttpHeaders.AUTHORIZATION,
                                                "Bearer " + userB.accessToken()))
                        .andReturn()
                        .getResponse()
                        .getStatus();
        assertDeniedOrHidden(crossMarkStatus, "PATCH /api/v1/notifications/{id}/read cross-user");

        // Verify notification state was NOT mutated by User B
        Notification reloaded = notifications.findById(notif.getId()).orElseThrow();
        assertFalse(reloaded.getIsRead(), "User B must not mutate User A's notification state");

        // Owner A can mark their own notification as read
        mvc.perform(
                        patch("/api/v1/notifications/" + notif.getId() + "/read")
                                .header(HttpHeaders.AUTHORIZATION, "Bearer " + userA.accessToken()))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("User Account IDOR: User B cannot inspect or lock User A via /api/v1/users/{id}")
    void userAccountIdor_crossUserAdminActionsBlocked() throws Exception {
        Actor userA = createAndLoginPilot("idor_usr_a");
        Actor userB = createAndLoginPilot("idor_usr_b");

        mvc.perform(
                        get("/api/v1/users/" + userA.user().getId())
                                .header(HttpHeaders.AUTHORIZATION, "Bearer " + userB.accessToken()))
                .andExpect(status().isForbidden());

        mvc.perform(
                        post("/api/v1/users/" + userA.user().getId() + "/lock")
                                .header(HttpHeaders.AUTHORIZATION, "Bearer " + userB.accessToken()))
                .andExpect(status().isForbidden());
    }
}
