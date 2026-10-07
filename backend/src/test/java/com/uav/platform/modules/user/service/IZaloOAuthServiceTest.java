package com.uav.platform.modules.user.service;

import com.uav.platform.modules.user.common.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.modules.user.config.response.ZaloUserProfile;
import com.uav.platform.modules.user.service.impl.IZaloOAuthService;
import com.uav.platform.common.constant.CoreConstants;
import com.uav.platform.error.SystemException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IZaloOAuthServiceTest {

    @Mock
    private RestTemplate restTemplate;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
    }

    @Test
    void getAuthorizationUrl_WhenNotConfigured_ReturnsLocalCallbackWithMockCode() {
        ZaloOAuthService service = new IZaloOAuthService("", "", "http://localhost:3000/auth/zalo/callback", restTemplate, objectMapper);
        String url = service.getAuthorizationUrl();

        assertTrue(url.contains("http://localhost:3000/auth/zalo/callback"));
        assertTrue(url.contains("code=mock_zalo_code"));
    }

    @Test
    void getAuthorizationUrl_WhenConfigured_ReturnsZaloPermissionUrl() {
        ZaloOAuthService service = new IZaloOAuthService("123456789", "secret", "http://localhost:3000/auth/zalo/callback", restTemplate, objectMapper);
        String url = service.getAuthorizationUrl();

        assertTrue(url.startsWith("https://oauth.zaloapp.com/v4/permission"));
        assertTrue(url.contains("app_id=123456789"));
        assertTrue(url.contains("redirect_uri="));
    }

    @Test
    void authenticateWithZalo_WhenMockCode_ReturnsMockProfile() {
        ZaloOAuthService service = new IZaloOAuthService("123456789", "secret", "http://localhost:3000/auth/zalo/callback", restTemplate, objectMapper);
        ZaloUserProfile profile = service.authenticateWithZalo("mock_test_code");

        assertNotNull(profile);
        assertTrue(profile.id().startsWith("mock_zalo_"));
        assertEquals("Zalo Test User", profile.fullName());
        assertNotNull(profile.avatarUrl());
    }

    @Test
    void authenticateWithZalo_WhenUnconfigured_ReturnsMockProfile() {
        ZaloOAuthService service = new IZaloOAuthService("", "", "http://localhost:3000/auth/zalo/callback", restTemplate, objectMapper);
        ZaloUserProfile profile = service.authenticateWithZalo("any_code_123");

        assertNotNull(profile);
        assertTrue(profile.id().startsWith("mock_zalo_"));
        assertEquals("Zalo Test User", profile.name());
    }

    @Test
    void authenticateWithZalo_BlankCode_ThrowsBadRequest() {
        ZaloOAuthService service = new IZaloOAuthService("", "", "http://localhost:3000/auth/zalo/callback", restTemplate, objectMapper);

        SystemException ex1 = assertThrows(SystemException.class, () -> service.authenticateWithZalo(""));
        assertEquals(400, ex1.getStatus().value());

        SystemException ex2 = assertThrows(SystemException.class, () -> service.authenticateWithZalo(null));
        assertEquals(400, ex2.getStatus().value());
    }

    @Test
    void authenticateWithZalo_LiveApiSuccess_ReturnsUserProfile() {
        ZaloOAuthService service = new IZaloOAuthService("123456789", "secret", "http://localhost:3000/auth/zalo/callback", restTemplate, objectMapper);

        String tokenJson = "{\"access_token\":\"valid_access_token\",\"expires_in\":3600}";
        when(restTemplate.postForEntity(contains("access_token"), any(HttpEntity.class), eq(String.class)))
                .thenReturn(new ResponseEntity<>(tokenJson, HttpStatus.OK));

        String profileJson = "{\"id\":\"real_zalo_987\",\"name\":\"Nguyễn Văn A\",\"picture\":{\"data\":{\"url\":\"https://zalo.me/avatar.jpg\"}}}";
        when(restTemplate.exchange(contains("graph.zalo.me"), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class)))
                .thenReturn(new ResponseEntity<>(profileJson, HttpStatus.OK));

        ZaloUserProfile profile = service.authenticateWithZalo("real_code_live");

        assertNotNull(profile);
        assertEquals("real_zalo_987", profile.id());
        assertEquals("Nguyễn Văn A", profile.name());
        assertEquals("https://zalo.me/avatar.jpg", profile.avatar());
    }

    @Test
    void authenticateWithZalo_LiveApiError_ThrowsBadRequest() {
        ZaloOAuthService service = new IZaloOAuthService("123456789", "secret", "http://localhost:3000/auth/zalo/callback", restTemplate, objectMapper);

        String errorJson = "{\"error\":-14002,\"message\":\"Invalid authorization code\"}";
        when(restTemplate.postForEntity(contains("access_token"), any(HttpEntity.class), eq(String.class)))
                .thenReturn(new ResponseEntity<>(errorJson, HttpStatus.OK));

        SystemException ex = assertThrows(SystemException.class, () -> service.authenticateWithZalo("invalid_code"));
        assertEquals(400, ex.getStatus().value());
        assertEquals(CoreConstants.ZALO_AUTH_FAILED, ex.getMessage());
    }
}
