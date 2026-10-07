package com.uav.platform.modules.user.service;

import com.uav.platform.modules.user.common.*;

import com.uav.platform.modules.user.config.response.AuthResponse;
import com.uav.platform.modules.user.config.request.LoginRequest;
import com.uav.platform.modules.user.config.request.RegisterRequest;
import com.uav.platform.modules.user.config.response.UserResponse;
import com.uav.platform.modules.user.config.request.ZaloLoginRequest;
import com.uav.platform.modules.user.config.response.ZaloUserProfile;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.common.UserStatus;
import com.uav.platform.modules.user.repository.UserRepository;
import com.uav.platform.modules.user.service.impl.IAuthService;
import com.uav.platform.common.constant.CoreConstants;
import com.uav.platform.error.SystemException;
import com.uav.platform.security.jwt.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private ZaloOAuthService zaloOAuthService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new IAuthService(userRepository, passwordEncoder, jwtTokenProvider, zaloOAuthService);
    }

    // ==================== Register Tests ====================

    @Test
    void register_Success() {
        RegisterRequest request = new RegisterRequest("johndoe", "john@example.com", "P@ssword123", "0987654321");

        when(userRepository.existsByEmail("john@example.com")).thenReturn(false);
        when(userRepository.existsByUsername("johndoe")).thenReturn(false);
        when(userRepository.existsByPhoneNumber("0987654321")).thenReturn(false);
        when(passwordEncoder.encode("P@ssword123")).thenReturn("hashedPassword");

        AppUser savedUser = new AppUser("johndoe", "john@example.com", "hashedPassword", "0987654321", UserStatus.ACTIVE);
        when(userRepository.save(any(AppUser.class))).thenReturn(savedUser);

        UserResponse response = authService.register(request);

        assertNotNull(response);
        assertEquals("johndoe", response.username());
        assertEquals("john@example.com", response.email());
        assertEquals("0987654321", response.phoneNumber());
        assertEquals(UserStatus.ACTIVE, response.status());

        verify(userRepository, times(1)).save(any(AppUser.class));
    }

    @Test
    void register_DuplicateEmail_ThrowsConflict() {
        RegisterRequest request = new RegisterRequest("johndoe", "john@example.com", "P@ssword123", "0987654321");
        when(userRepository.existsByEmail("john@example.com")).thenReturn(true);

        SystemException ex = assertThrows(SystemException.class, () -> authService.register(request));
        assertEquals(409, ex.getStatus().value());
        verify(userRepository, never()).save(any(AppUser.class));
    }

    @Test
    void register_DuplicateUsername_ThrowsConflict() {
        RegisterRequest request = new RegisterRequest("johndoe", "john@example.com", "P@ssword123", "0987654321");
        when(userRepository.existsByEmail("john@example.com")).thenReturn(false);
        when(userRepository.existsByUsername("johndoe")).thenReturn(true);

        SystemException ex = assertThrows(SystemException.class, () -> authService.register(request));
        assertEquals(409, ex.getStatus().value());
        verify(userRepository, never()).save(any(AppUser.class));
    }

    @Test
    void register_DuplicatePhoneNumber_ThrowsConflict() {
        RegisterRequest request = new RegisterRequest("johndoe", "john@example.com", "P@ssword123", "0987654321");
        when(userRepository.existsByEmail("john@example.com")).thenReturn(false);
        when(userRepository.existsByUsername("johndoe")).thenReturn(false);
        when(userRepository.existsByPhoneNumber("0987654321")).thenReturn(true);

        SystemException ex = assertThrows(SystemException.class, () -> authService.register(request));
        assertEquals(409, ex.getStatus().value());
        verify(userRepository, never()).save(any(AppUser.class));
    }

    @Test
    void register_NullRequest_ThrowsBadRequest() {
        SystemException ex = assertThrows(SystemException.class, () -> authService.register(null));
        assertEquals(400, ex.getStatus().value());
        assertEquals(CoreConstants.REGISTRATION_DATA_REQUIRED, ex.getMessage());
        verify(userRepository, never()).save(any(AppUser.class));
    }

    // ==================== Login Tests ====================

    @Test
    void login_Success_WithUsername() {
        LoginRequest request = new LoginRequest("johndoe", "P@ssword123");
        AppUser user = new AppUser("johndoe", "john@example.com", "hashedPassword", "0987654321", UserStatus.ACTIVE);

        when(userRepository.findByEmail("johndoe")).thenReturn(Optional.empty());
        when(userRepository.findByUsername("johndoe")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("P@ssword123", "hashedPassword")).thenReturn(true);
        when(jwtTokenProvider.generateToken(user.getId(), user.getUsername(), user.getEmail())).thenReturn("mock-jwt-token");

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("mock-jwt-token", response.accessToken());
        assertEquals("Bearer", response.tokenType());
        assertEquals("johndoe", response.user().username());
    }

    @Test
    void login_Success_WithEmail() {
        LoginRequest request = new LoginRequest("john@example.com", "P@ssword123");
        AppUser user = new AppUser("johndoe", "john@example.com", "hashedPassword", "0987654321", UserStatus.ACTIVE);

        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("P@ssword123", "hashedPassword")).thenReturn(true);
        when(jwtTokenProvider.generateToken(user.getId(), user.getUsername(), user.getEmail())).thenReturn("mock-jwt-token");

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("mock-jwt-token", response.accessToken());
        assertEquals("Bearer", response.tokenType());
        assertEquals("johndoe", response.user().username());
    }

    @Test
    void login_UserNotFound_ThrowsUnauthorized() {
        LoginRequest request = new LoginRequest("nonexistent", "P@ssword123");

        when(userRepository.findByEmail("nonexistent")).thenReturn(Optional.empty());
        when(userRepository.findByUsername("nonexistent")).thenReturn(Optional.empty());

        SystemException ex = assertThrows(SystemException.class, () -> authService.login(request));
        assertEquals(401, ex.getStatus().value());
        assertEquals(CoreConstants.INVALID_CREDENTIALS, ex.getMessage());
    }

    @Test
    void login_InvalidPassword_ThrowsUnauthorized() {
        LoginRequest request = new LoginRequest("johndoe", "wrongpassword");
        AppUser user = new AppUser("johndoe", "john@example.com", "hashedPassword", "0987654321", UserStatus.ACTIVE);

        when(userRepository.findByEmail("johndoe")).thenReturn(Optional.empty());
        when(userRepository.findByUsername("johndoe")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrongpassword", "hashedPassword")).thenReturn(false);

        SystemException ex = assertThrows(SystemException.class, () -> authService.login(request));
        assertEquals(401, ex.getStatus().value());
        assertEquals(CoreConstants.INVALID_CREDENTIALS, ex.getMessage());
    }

    @Test
    void login_InactiveAccount_ThrowsBadRequest() {
        LoginRequest request = new LoginRequest("johndoe", "P@ssword123");
        AppUser user = new AppUser("johndoe", "john@example.com", "hashedPassword", "0987654321", UserStatus.INACTIVE);

        when(userRepository.findByEmail("johndoe")).thenReturn(Optional.empty());
        when(userRepository.findByUsername("johndoe")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("P@ssword123", "hashedPassword")).thenReturn(true);

        SystemException ex = assertThrows(SystemException.class, () -> authService.login(request));
        assertEquals(400, ex.getStatus().value());
        assertEquals(CoreConstants.ACCOUNT_INACTIVE, ex.getMessage());
    }

    @Test
    void login_NullRequest_ThrowsBadRequest() {
        SystemException ex = assertThrows(SystemException.class, () -> authService.login(null));
        assertEquals(400, ex.getStatus().value());
    }

    // ==================== Zalo OA Login Tests ====================

    @Test
    void loginWithZalo_Success_ExistingUser() {
        ZaloLoginRequest request = new ZaloLoginRequest("auth-code-123", "http://localhost:3000/callback");
        ZaloUserProfile profile = new ZaloUserProfile("zalo_12345", "Zalo User", "https://avatar.example.com/pic.jpg");
        AppUser existingUser = new AppUser("zalo_12345", "zalo_12345@zalo.local", null, null, "zalo_12345", "Zalo User", "https://avatar.example.com/pic.jpg", UserStatus.ACTIVE);

        when(zaloOAuthService.authenticateWithZalo("auth-code-123")).thenReturn(profile);
        when(userRepository.findByZaloId("zalo_12345")).thenReturn(Optional.of(existingUser));
        when(jwtTokenProvider.generateToken(existingUser.getId(), existingUser.getUsername(), existingUser.getEmail())).thenReturn("zalo-jwt-token");

        AuthResponse response = authService.loginWithZalo(request);

        assertNotNull(response);
        assertEquals("zalo-jwt-token", response.accessToken());
        assertEquals("Bearer", response.tokenType());
        assertEquals("zalo_12345", response.user().username());
        verify(userRepository, never()).save(any(AppUser.class));
    }

    @Test
    void loginWithZalo_Success_NewUser() {
        ZaloLoginRequest request = new ZaloLoginRequest("auth-code-123", "http://localhost:3000/callback");
        ZaloUserProfile profile = new ZaloUserProfile("zalo_99999", "New Zalo User", "https://avatar.example.com/new.jpg");
        AppUser savedUser = new AppUser("zalo_99999", "zalo_99999@zalo.local", null, null, "zalo_99999", "New Zalo User", "https://avatar.example.com/new.jpg", UserStatus.ACTIVE);

        when(zaloOAuthService.authenticateWithZalo("auth-code-123")).thenReturn(profile);
        when(userRepository.findByZaloId("zalo_99999")).thenReturn(Optional.empty());
        when(userRepository.existsByUsername("zalo_99999")).thenReturn(false);
        when(userRepository.existsByEmail("zalo_99999@zalo.local")).thenReturn(false);
        when(userRepository.save(any(AppUser.class))).thenReturn(savedUser);
        when(jwtTokenProvider.generateToken(savedUser.getId(), savedUser.getUsername(), savedUser.getEmail())).thenReturn("new-user-jwt");

        AuthResponse response = authService.loginWithZalo(request);

        assertNotNull(response);
        assertEquals("new-user-jwt", response.accessToken());
        assertEquals("zalo_99999", response.user().username());
        verify(userRepository, times(1)).save(any(AppUser.class));
    }

    @Test
    void loginWithZalo_InactiveAccount_ThrowsBadRequest() {
        ZaloLoginRequest request = new ZaloLoginRequest("auth-code-123", null);
        ZaloUserProfile profile = new ZaloUserProfile("zalo_suspended", "Suspended User", null);
        AppUser inactiveUser = new AppUser("zalo_suspended", "suspended@zalo.local", null, null, "zalo_suspended", "Suspended User", null, UserStatus.SUSPENDED);

        when(zaloOAuthService.authenticateWithZalo("auth-code-123")).thenReturn(profile);
        when(userRepository.findByZaloId("zalo_suspended")).thenReturn(Optional.of(inactiveUser));

        SystemException ex = assertThrows(SystemException.class, () -> authService.loginWithZalo(request));
        assertEquals(400, ex.getStatus().value());
        assertEquals(CoreConstants.ACCOUNT_INACTIVE, ex.getMessage());
    }

    @Test
    void loginWithZalo_NullOrBlankCode_ThrowsBadRequest() {
        ZaloLoginRequest nullRequest = null;
        assertThrows(SystemException.class, () -> authService.loginWithZalo(nullRequest));

        ZaloLoginRequest emptyCodeRequest = new ZaloLoginRequest("", null);
        assertThrows(SystemException.class, () -> authService.loginWithZalo(emptyCodeRequest));
    }

    @Test
    void loginWithZalo_ServiceFailure_ThrowsBadRequest() {
        ZaloLoginRequest request = new ZaloLoginRequest("invalid-code", null);
        when(zaloOAuthService.authenticateWithZalo("invalid-code")).thenThrow(SystemException.badRequest(CoreConstants.ZALO_AUTH_FAILED));

        SystemException ex = assertThrows(SystemException.class, () -> authService.loginWithZalo(request));
        assertEquals(400, ex.getStatus().value());
        assertEquals(CoreConstants.ZALO_AUTH_FAILED, ex.getMessage());
    }

    // ==================== Zalo Auth URL Tests ====================

    @Test
    void getZaloAuthUrl_Success() {
        when(zaloOAuthService.getAuthorizationUrl()).thenReturn("https://oauth.zaloapp.com/v4/permission?app_id=123");

        String url = authService.getZaloAuthUrl();

        assertEquals("https://oauth.zaloapp.com/v4/permission?app_id=123", url);
        verify(zaloOAuthService, times(1)).getAuthorizationUrl();
    }

    // ==================== Current User Tests ====================

    @Test
    void getCurrentUser_Success() {
        AppUser user = new AppUser("johndoe", "john@example.com", "pass", "0987654321", UserStatus.ACTIVE);
        when(userRepository.findByUsername("johndoe")).thenReturn(Optional.of(user));

        UserResponse response = authService.getCurrentUser("johndoe");

        assertNotNull(response);
        assertEquals("johndoe", response.username());
        assertEquals("john@example.com", response.email());
    }

    @Test
    void getCurrentUser_NotFound_ThrowsNotFound() {
        when(userRepository.findByUsername("unknown")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("unknown")).thenReturn(Optional.empty());

        SystemException ex = assertThrows(SystemException.class, () -> authService.getCurrentUser("unknown"));
        assertEquals(404, ex.getStatus().value());
        assertEquals(CoreConstants.USER_NOT_FOUND, ex.getMessage());
    }

    @Test
    void getCurrentUser_BlankUsername_ThrowsBadRequest() {
        assertThrows(SystemException.class, () -> authService.getCurrentUser(""));
        assertThrows(SystemException.class, () -> authService.getCurrentUser(null));
    }
}
