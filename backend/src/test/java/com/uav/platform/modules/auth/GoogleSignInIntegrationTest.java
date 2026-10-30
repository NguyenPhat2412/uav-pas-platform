package com.uav.platform.modules.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.uav.platform.modules.auth.dto.record.GoogleIdentity;
import com.uav.platform.modules.auth.service.GoogleIdTokenService;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserRole;
import com.uav.platform.modules.user.enums.UserStatus;
import com.uav.platform.modules.user.repository.UserRepository;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.UUID;

/** The endpoint is public, CSRF-exempt like /auth/login, and persists a new customer. */
@SpringBootTest(
        properties =
                "spring.datasource.url=jdbc:h2:mem:uav_google_signin;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE")
class GoogleSignInIntegrationTest {
    @Autowired WebApplicationContext context;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder passwords;
    @MockitoBean GoogleIdTokenService google;

    @Test
    void unknownEmailBecomesAVerifiedCustomerWithASession() throws Exception {
        var mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        String local = "g" + UUID.randomUUID().toString().substring(0, 8);
        String email = local + "@example.invalid";
        when(google.isEnabled()).thenReturn(true);
        when(google.verify("id-token"))
                .thenReturn(new GoogleIdentity("sub", email, "Khách Google"));

        mvc.perform(
                        post("/api/v1/auth/google")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"credential\":\"id-token\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value(email));

        AppUser created = users.findByEmail(email).orElseThrow();
        assertEquals(local, created.getUsername());
        assertEquals(UserRole.ROLE_PILOT, created.getRole());
        assertEquals(UserStatus.ACTIVE, created.getStatus());
        assertTrue(created.isEmailVerified());
        assertNull(created.getPasswordHash());

        // The second sign-in finds the same account instead of creating another one.
        mvc.perform(
                        post("/api/v1/auth/google")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"credential\":\"id-token\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.username").value(local));
    }

    @Test
    void preRegisteredUnverifiedAccountLosesItsPassword() throws Exception {
        var mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        AppUser squatted = account(UserRole.ROLE_PILOT, false);
        when(google.isEnabled()).thenReturn(true);
        when(google.verify("id-token"))
                .thenReturn(new GoogleIdentity("sub", squatted.getEmail(), null));

        mvc.perform(
                        post("/api/v1/auth/google")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"credential\":\"id-token\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty());

        AppUser after = users.findById(squatted.getId()).orElseThrow();
        assertTrue(after.isEmailVerified());
        assertNull(after.getPasswordHash());
        mvc.perform(
                        post("/api/v1/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"usernameOrEmail\":\""
                                                + squatted.getEmail()
                                                + "\",\"password\":\"Squatter#2026\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void staffWithout2faIsRejected() throws Exception {
        var mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        AppUser staff = account(UserRole.ROLE_OPERATOR, true);
        when(google.isEnabled()).thenReturn(true);
        when(google.verify("id-token"))
                .thenReturn(new GoogleIdentity("sub", staff.getEmail(), null));

        mvc.perform(
                        post("/api/v1/auth/google")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"credential\":\"id-token\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("GOOGLE_STAFF_REQUIRES_2FA"));
    }

    private AppUser account(UserRole role, boolean emailVerified) {
        String local = "g" + UUID.randomUUID().toString().substring(0, 8);
        AppUser user =
                new AppUser(
                        local,
                        local + "@example.invalid",
                        passwords.encode("Squatter#2026"),
                        null,
                        null,
                        null,
                        null,
                        role,
                        UserStatus.ACTIVE);
        user.setEmailVerified(emailVerified);
        return users.save(user);
    }

    @Test
    void disabledConfigAnswers503() throws Exception {
        var mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        when(google.isEnabled()).thenReturn(false);

        mvc.perform(
                        post("/api/v1/auth/google")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"credential\":\"id-token\"}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("GOOGLE_LOGIN_DISABLED"));
    }
}
