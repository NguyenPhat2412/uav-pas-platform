package com.uav.platform.integration.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.repository.user.UserRepository;

import jakarta.servlet.http.Cookie;

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

import java.util.Map;
import java.util.UUID;

@SpringBootTest(
        properties =
                "spring.datasource.url=jdbc:h2:mem:uav_security_chain_it;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE")
@DisplayName("Security Filter Chain, RBAC, CSRF, Headers & Token Revocation Integration Tests")
class SecurityFilterChainIntegrationTest {

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository users;
    @Autowired private PasswordEncoder encoder;
    @Autowired private ObjectMapper json;

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    private record LoginSession(String accessToken, String refreshToken, Cookie[] cookies) {}

    private LoginSession createAndLogin(UserRole role) throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String username = "sec_" + role.name().toLowerCase() + "_" + suffix;
        String password = "SecPass!" + suffix;
        AppUser account =
                new AppUser(
                        username,
                        username + "@example.invalid",
                        encoder.encode(password),
                        null,
                        "Security Test " + role.name(),
                        null,
                        role,
                        UserStatus.ACTIVE);
        account.setEmailVerified(true);
        users.save(account);

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
        return new LoginSession(
                (String) body.get("accessToken"),
                (String) body.get("refreshToken"),
                result.getResponse().getCookies());
    }

    @Test
    @DisplayName(
            "Public endpoints are accessible without auth while protected endpoints return 401")
    void publicVsProtectedEndpoints() throws Exception {
        // Public endpoints must not return 401
        int healthStatus =
                mvc.perform(get(ApiRoutes.Health.LIVENESS)).andReturn().getResponse().getStatus();
        assertNotEquals(401, healthStatus);

        int siteInfoStatus =
                mvc.perform(get("/api/v1/public/site-info")).andReturn().getResponse().getStatus();
        assertNotEquals(401, siteInfoStatus);

        // Protected endpoints must reject anonymous requests with 401
        mvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/users/profile")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/users")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/audit-logs")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/missions")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName(
            "RBAC matrix blocks non-admin roles from privileged admin endpoints while allowing ROLE_ADMIN")
    void rbacAccessMatrix_enforcesRoleBoundaries() throws Exception {
        LoginSession pilot = createAndLogin(UserRole.ROLE_PILOT);
        LoginSession admin = createAndLogin(UserRole.ROLE_ADMIN);

        // Pilot can access own profile and /auth/me
        mvc.perform(
                        get("/api/v1/auth/me")
                                .header(HttpHeaders.AUTHORIZATION, "Bearer " + pilot.accessToken()))
                .andExpect(status().isOk());
        mvc.perform(
                        get("/api/v1/users/profile")
                                .header(HttpHeaders.AUTHORIZATION, "Bearer " + pilot.accessToken()))
                .andExpect(status().isOk());

        // Pilot must be forbidden from admin user list, audit logs, and admin support summary
        mvc.perform(
                        get("/api/v1/users")
                                .header(HttpHeaders.AUTHORIZATION, "Bearer " + pilot.accessToken()))
                .andExpect(status().isForbidden());
        mvc.perform(
                        get("/api/v1/audit-logs")
                                .header(HttpHeaders.AUTHORIZATION, "Bearer " + pilot.accessToken()))
                .andExpect(status().isForbidden());
        mvc.perform(
                        get("/api/v1/admin/support/summary")
                                .header(HttpHeaders.AUTHORIZATION, "Bearer " + pilot.accessToken()))
                .andExpect(status().isForbidden());

        // Admin is allowed on privileged endpoints
        mvc.perform(
                        get("/api/v1/users")
                                .header(HttpHeaders.AUTHORIZATION, "Bearer " + admin.accessToken()))
                .andExpect(status().isOk());
        mvc.perform(
                        get("/api/v1/audit-logs")
                                .header(HttpHeaders.AUTHORIZATION, "Bearer " + admin.accessToken()))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName(
            "Bearer requests bypass CSRF while cookie-based state mutations require X-XSRF-TOKEN")
    void bearerExemptFromCsrf_cookieRequiresCsrf() throws Exception {
        LoginSession pilot = createAndLogin(UserRole.ROLE_PILOT);

        MvcResult profileResult =
                mvc.perform(
                                get("/api/v1/users/profile")
                                        .header(
                                                HttpHeaders.AUTHORIZATION,
                                                "Bearer " + pilot.accessToken()))
                        .andExpect(status().isOk())
                        .andReturn();
        @SuppressWarnings("unchecked")
        Map<String, Object> profile =
                json.readValue(profileResult.getResponse().getContentAsString(), Map.class);

        String patchBody =
                json.writeValueAsString(
                        Map.of(
                                "fullName",
                                "Security Verified User",
                                "phoneNumber",
                                "09" + String.format("%08d", System.nanoTime() % 100_000_000L),
                                "expectedRevision",
                                profile.get("revision")));

        // Cookie mutation without X-XSRF-TOKEN must be rejected (403)
        mvc.perform(
                        patch("/api/v1/users/profile")
                                .cookie(pilot.cookies())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(patchBody))
                .andExpect(status().isForbidden());

        // Bearer mutation without CSRF header must succeed (200)
        mvc.perform(
                        patch("/api/v1/users/profile")
                                .header(HttpHeaders.AUTHORIZATION, "Bearer " + pilot.accessToken())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(patchBody))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Responses include default security headers and reject untrusted CORS origins")
    void securityHeadersAndUntrustedCorsOrigin() throws Exception {
        LoginSession pilot = createAndLogin(UserRole.ROLE_PILOT);

        mvc.perform(
                        get("/api/v1/auth/me")
                                .header(HttpHeaders.AUTHORIZATION, "Bearer " + pilot.accessToken()))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"));

        MvcResult preflight =
                mvc.perform(
                                options("/api/v1/users/profile")
                                        .header(HttpHeaders.ORIGIN, "https://evil.attacker.invalid")
                                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET"))
                        .andReturn();
        assertNull(preflight.getResponse().getHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
    }

    @Test
    @DisplayName("Logout immediately revokes the Bearer JWT so subsequent /auth/me fails with 401")
    void logout_revokesBearerTokenImmediately() throws Exception {
        LoginSession pilot = createAndLogin(UserRole.ROLE_PILOT);

        mvc.perform(
                        get("/api/v1/auth/me")
                                .header(HttpHeaders.AUTHORIZATION, "Bearer " + pilot.accessToken()))
                .andExpect(status().isOk());

        mvc.perform(
                        post("/api/v1/auth/logout")
                                .header(HttpHeaders.AUTHORIZATION, "Bearer " + pilot.accessToken())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsString(
                                                Map.of("refreshToken", pilot.refreshToken()))))
                .andExpect(status().isOk());

        // Reusing the logged-out JWT must be rejected with 401
        int afterLogout =
                mvc.perform(
                                get("/api/v1/auth/me")
                                        .header(
                                                HttpHeaders.AUTHORIZATION,
                                                "Bearer " + pilot.accessToken()))
                        .andReturn()
                        .getResponse()
                        .getStatus();
        assertEquals(401, afterLogout);
    }
}
