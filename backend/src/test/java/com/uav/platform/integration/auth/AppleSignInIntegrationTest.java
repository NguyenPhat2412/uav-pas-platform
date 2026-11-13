package com.uav.platform.integration.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.uav.platform.dto.record.auth.AppleIdentity;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.auth.AppleIdTokenService;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.List;
import java.util.UUID;

/** Verifies /api/v1/auth/apple public CSRF-exempt access, sub persistence, and self-service deletion. */
@SpringBootTest(
        properties =
                "spring.datasource.url=jdbc:h2:mem:uav_apple_signin;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE")
class AppleSignInIntegrationTest {
    @Autowired WebApplicationContext context;
    @Autowired UserRepository users;
    @MockitoBean AppleIdTokenService apple;

    @Test
    void appleSignInCreatesCustomerReauthenticatesBySubAndAllowsSelfDeletion() throws Exception {
        var mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String appleSub = "001999." + suffix;
        String email = "apple." + suffix + "@privaterelay.appleid.com";

        when(apple.isEnabled()).thenReturn(true);
        when(apple.verify("apple-token-1", "nonce-1"))
                .thenReturn(new AppleIdentity(appleSub, email, true));

        mvc.perform(
                        post("/api/v1/auth/apple")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"credential\":\"apple-token-1\",\"fullName\":\"Khách Apple\",\"nonce\":\"nonce-1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value(email));

        AppUser created = users.findByAppleSub(appleSub).orElseThrow();
        assertEquals("Khách Apple", created.getFullName());
        assertEquals(UserRole.ROLE_PILOT, created.getRole());
        assertEquals(UserStatus.ACTIVE, created.getStatus());
        assertTrue(created.isEmailVerified());
        assertNull(created.getPasswordHash());

        // Subsequent Apple login omits email in token -> still resolves via apple_sub!
        when(apple.verify("apple-token-2", null))
                .thenReturn(new AppleIdentity(appleSub, null, false));

        mvc.perform(
                        post("/api/v1/auth/apple")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"credential\":\"apple-token-2\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.username").value(created.getUsername()));

        // Authenticated Apple social-only user reads deletion policy and deletes own account
        var principal =
                new UsernamePasswordAuthenticationToken(created.getUsername(), null, List.of());

        mvc.perform(get("/api/v1/users/profile/deletion-policy").with(authentication(principal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(true))
                .andExpect(jsonPath("$.eligible").value(true))
                .andExpect(jsonPath("$.hasPassword").value(false))
                .andExpect(jsonPath("$.requirePassword").value(false))
                .andExpect(jsonPath("$.confirmationPhrase").value("XOA TAI KHOAN"));

        mvc.perform(
                        post("/api/v1/users/profile/delete")
                                .with(authentication(principal))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"confirmationPhrase\":\"xoa tai khoan\",\"reason\":\"Đóng tài khoản thử nghiệm\"}"))
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.message").value("Tài khoản của bạn đã được xoá thành công."));

        AppUser anonymized = users.findById(created.getId()).orElseThrow();
        assertEquals(UserStatus.INACTIVE, anonymized.getStatus());
        assertTrue(anonymized.isManualLocked());
        assertNull(anonymized.getAppleSub());
        assertNotNull(anonymized.getDeletedAt());
        assertEquals("Đóng tài khoản thử nghiệm", anonymized.getDeletionReason());
    }
}
