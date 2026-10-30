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
