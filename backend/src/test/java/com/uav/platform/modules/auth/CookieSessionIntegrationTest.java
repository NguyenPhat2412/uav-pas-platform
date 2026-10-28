package com.uav.platform.modules.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserRole;
import com.uav.platform.modules.user.enums.UserStatus;
import com.uav.platform.modules.user.repository.UserRepository;

import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import tools.jackson.databind.ObjectMapper;

import java.util.*;

@SpringBootTest(
        properties =
                "spring.datasource.url=jdbc:h2:mem:uav_cookie_contract;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE")
class CookieSessionIntegrationTest {
    @Autowired WebApplicationContext context;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder encoder;
    @Autowired ObjectMapper json;

    @Test
    void browserCookieProfileRequiresMatchingCsrfAndRefreshLogoutKeepTheirContract()
            throws Exception {
        var mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        String name = "cookie_" + UUID.randomUUID().toString().substring(0, 8),
                password = UUID.randomUUID().toString();
        users.save(
                new AppUser(
                        name,
                        name + "@example.invalid",
                        encoder.encode(password),
                        null,
                        UserStatus.ACTIVE));
        var login =
                mvc.perform(
                                post("/api/v1/auth/login")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                json.writeValueAsString(
                                                        Map.of(
                                                                "usernameOrEmail",
                                                                name,
                                                                "password",
                                                                password))))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse();
        Cookie[] cookies = login.getCookies();
        assertTrue(
                Arrays.stream(cookies)
                        .anyMatch(c -> c.getName().equals("uav_access_token") && c.isHttpOnly()));
        assertTrue(
                Arrays.stream(cookies)
                        .anyMatch(c -> c.getName().equals("uav_refresh_token") && c.isHttpOnly()));
        Cookie csrf =
                Arrays.stream(cookies)
                        .filter(c -> c.getName().equals("XSRF-TOKEN"))
                        .findFirst()
                        .orElseThrow();
        var profile =
                mvc.perform(get("/api/v1/users/profile").cookie(cookies))
                        .andExpect(status().isOk())
                        .andReturn();
        var values = json.readValue(profile.getResponse().getContentAsString(), Map.class);
        String body =
                json.writeValueAsString(
                        Map.of(
                                "fullName",
                                "Khách kiểm thử",
                                "phoneNumber",
                                "09" + String.format("%08d", System.nanoTime() % 100_000_000L),
                                "expectedRevision",
                                values.get("revision")));
        mvc.perform(
                        patch("/api/v1/users/profile")
                                .cookie(cookies)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(body))
                .andExpect(status().isForbidden());
        mvc.perform(
                        patch("/api/v1/users/profile")
                                .cookie(cookies)
                                .header("X-XSRF-TOKEN", "mismatch")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(body))
                .andExpect(status().isForbidden());
        mvc.perform(
                        patch("/api/v1/users/profile")
                                .cookie(cookies)
                                .header("X-XSRF-TOKEN", csrf.getValue())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(body))
                .andExpect(status().isOk());
        var refreshed =
                mvc.perform(
                                post("/api/v1/auth/refresh")
                                        .cookie(cookies)
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content("{}"))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getCookies();
        var me =
                mvc.perform(get("/api/v1/auth/me").cookie(refreshed))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse();
        Cookie refreshedCsrf = Optional.ofNullable(me.getCookie("XSRF-TOKEN")).orElse(csrf);
        Cookie[] refreshedAuth =
                Arrays.stream(refreshed)
                        .filter(c -> !c.getName().equals("XSRF-TOKEN"))
                        .toArray(Cookie[]::new);
        var logout =
                mvc.perform(
                                post("/api/v1/auth/logout")
                                        .cookie(refreshedAuth)
                                        .cookie(refreshedCsrf)
                                        .header("X-XSRF-TOKEN", refreshedCsrf.getValue())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content("{}"))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse();
        assertTrue(
                Arrays.stream(logout.getCookies())
                        .filter(c -> c.getName().startsWith("uav_"))
                        .allMatch(c -> c.getMaxAge() == 0));
        mvc.perform(get("/api/v1/auth/me").cookie(refreshed)).andExpect(status().isUnauthorized());
    }

    @Test
    void repositoryInsertNormalizesExplicitNullDefaultsOutsideServiceFactory() {
        String name = "defaults_" + UUID.randomUUID().toString().substring(0, 8);
        AppUser user =
                new AppUser(
                        name,
                        name + "@example.invalid",
                        "hash",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null);
        user.setRole(null);
        user.setStatus(null);
        assertNull(user.getRole());
        assertNull(user.getStatus());

        AppUser saved = users.saveAndFlush(user);
        try {
            AppUser loaded = users.findById(saved.getId()).orElseThrow();
            assertEquals(UserRole.ROLE_PILOT, loaded.getRole());
            assertEquals(UserStatus.ACTIVE, loaded.getStatus());
            assertNotNull(loaded.getCreatedAt());
            assertNotNull(loaded.getUpdatedAt());
        } finally {
            users.delete(saved);
        }
    }
}
