package com.uav.platform.modules.auth.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.common.constant.CoreConstants;
import com.uav.platform.common.constant.RestEndpoint;
import com.uav.platform.error.GlobalExceptionHandler;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.auth.dto.request.LoginRequest;
import com.uav.platform.modules.auth.dto.request.LogoutRequest;
import com.uav.platform.modules.auth.dto.request.RefreshTokenRequest;
import com.uav.platform.modules.auth.dto.request.RegisterRequest;
import com.uav.platform.modules.auth.dto.response.AuthResponse;
import com.uav.platform.modules.auth.service.AuthService;
import com.uav.platform.modules.user.dto.response.UserResponse;
import com.uav.platform.modules.user.enums.UserStatus;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.Collections;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    private MockMvc mockMvc;

    @Mock private AuthService authService;

    @InjectMocks private AuthController authController;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        mockMvc =
                MockMvcBuilders.standaloneSetup(authController)
                        .setControllerAdvice(new GlobalExceptionHandler())
                        .build();
        objectMapper = new ObjectMapper();
    }

    // ==================== Register Tests ====================

    @Test
    void register_ValidRequest_ReturnsCreated() throws Exception {
        RegisterRequest request =
                new RegisterRequest("johndoe", "john@example.com", "P@ssword123", "0987654321");
        UserResponse response =
                new UserResponse(
                        1L,
                        "johndoe",
                        "john@example.com",
                        "0987654321",
                        UserStatus.ACTIVE,
                        LocalDateTime.now());

        when(authService.register(any(RegisterRequest.class))).thenReturn(response);

        mockMvc.perform(
                        post(RestEndpoint.AUTH + RestEndpoint.REGISTER)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.username").value("johndoe"))
                .andExpect(jsonPath("$.email").value("john@example.com"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    void register_InvalidEmail_ReturnsBadRequest() throws Exception {
        RegisterRequest request =
                new RegisterRequest("johndoe", "invalid-email", "P@ssword123", "0987654321");

        mockMvc.perform(
                        post(RestEndpoint.AUTH + RestEndpoint.REGISTER)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void register_DuplicateEmail_ReturnsConflict() throws Exception {
        RegisterRequest request =
                new RegisterRequest("johndoe", "john@example.com", "P@ssword123", "0987654321");

        when(authService.register(any(RegisterRequest.class)))
                .thenThrow(SystemException.conflict(CoreConstants.EMAIL_ALREADY_EXISTS));

        mockMvc.perform(
                        post(RestEndpoint.AUTH + RestEndpoint.REGISTER)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value(CoreConstants.EMAIL_ALREADY_EXISTS));
    }

    // ==================== Login Tests ====================

    @Test
    void login_ValidCredentials_ReturnsOkWithToken() throws Exception {
        LoginRequest request = new LoginRequest("johndoe", "P@ssword123");
        UserResponse user =
                new UserResponse(
                        1L,
                        "johndoe",
                        "john@example.com",
                        "0987654321",
                        UserStatus.ACTIVE,
                        LocalDateTime.now());
        AuthResponse response = new AuthResponse("mock-jwt-token", "Bearer", user);

        when(authService.login(any(LoginRequest.class))).thenReturn(response);

        mockMvc.perform(
                        post(RestEndpoint.AUTH + RestEndpoint.LOGIN)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("mock-jwt-token"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.user.username").value("johndoe"));
    }

    @Test
    void login_InvalidCredentials_ReturnsUnauthorized() throws Exception {
        LoginRequest request = new LoginRequest("johndoe", "wrong-password");

        when(authService.login(any(LoginRequest.class)))
                .thenThrow(SystemException.unauthorized(CoreConstants.INVALID_CREDENTIALS));

        mockMvc.perform(
                        post(RestEndpoint.AUTH + RestEndpoint.LOGIN)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value(CoreConstants.INVALID_CREDENTIALS));
    }

    @Test
    void login_BlankPassword_ReturnsBadRequest() throws Exception {
        LoginRequest request = new LoginRequest("johndoe", "");

        mockMvc.perform(
                        post(RestEndpoint.AUTH + RestEndpoint.LOGIN)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    // ==================== Me Endpoint Tests ====================

    @Test
    void getCurrentUser_Authenticated_ReturnsOkWithUser() throws Exception {
        UserResponse user =
                new UserResponse(
                        1L,
                        "johndoe",
                        "john@example.com",
                        "0987654321",
                        UserStatus.ACTIVE,
                        LocalDateTime.now());
        when(authService.getCurrentUser("johndoe")).thenReturn(user);

        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken("johndoe", null, Collections.emptyList());

        mockMvc.perform(get(RestEndpoint.AUTH + RestEndpoint.ME).principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.username").value("johndoe"))
                .andExpect(jsonPath("$.email").value("john@example.com"));
    }

    @Test
    void getCurrentUser_Unauthenticated_ReturnsUnauthorized() throws Exception {
        mockMvc.perform(get(RestEndpoint.AUTH + RestEndpoint.ME))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Authentication required"));
    }

    // ==================== Refresh & Logout Endpoint Tests ====================

    @Test
    void refreshToken_Success_ReturnsOkWithAuthResponse() throws Exception {
        RefreshTokenRequest request = new RefreshTokenRequest("valid-refresh-token");
        UserResponse user =
                new UserResponse(
                        1L,
                        "johndoe",
                        "john@example.com",
                        "0987654321",
                        UserStatus.ACTIVE,
                        LocalDateTime.now());
        AuthResponse authResponse = AuthResponse.of("new-access-token", "new-refresh-token", user);
        when(authService.refreshToken(any(RefreshTokenRequest.class))).thenReturn(authResponse);

        mockMvc.perform(
                        post(RestEndpoint.AUTH + RestEndpoint.REFRESH)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("new-access-token"))
                .andExpect(jsonPath("$.refreshToken").value("new-refresh-token"));
    }

    @Test
    void logout_Success_ReturnsOk() throws Exception {
        LogoutRequest request = new LogoutRequest("some-refresh-token");

        mockMvc.perform(
                        post(RestEndpoint.AUTH + RestEndpoint.LOGOUT)
                                .header("Authorization", "Bearer valid-access-token")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Logged out successfully"));
    }
}
