package com.uav.platform.modules.auth.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.common.constant.CoreConstants;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.auth.dto.request.LoginRequest;
import com.uav.platform.modules.auth.dto.request.RegisterRequest;
import com.uav.platform.modules.auth.dto.response.AuthResponse;
import com.uav.platform.modules.auth.service.impl.AuthServiceImpl;
import com.uav.platform.modules.user.dto.response.UserResponse;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserStatus;
import com.uav.platform.modules.user.repository.UserRepository;
import com.uav.platform.security.jwt.JwtTokenProvider;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;

    @Mock private PasswordEncoder passwordEncoder;

    @Mock private JwtTokenProvider jwtTokenProvider;

    @Mock private AuthSessionLock sessionLock;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        lenient()
                .when(sessionLock.lock(any(AppUser.class)))
                .thenAnswer(call -> call.getArgument(0));
        authService =
                new AuthServiceImpl(
                        userRepository, passwordEncoder, jwtTokenProvider, null, null, sessionLock);
    }

    // ==================== Register Tests ====================

    @Test
    void register_Success() {
        RegisterRequest request =
                new RegisterRequest("johndoe", "john@example.com", "P@ssword123", "0987654321");

        when(userRepository.existsByEmail("john@example.com")).thenReturn(false);
        when(userRepository.existsByUsername("johndoe")).thenReturn(false);
        when(userRepository.existsByPhoneNumber("0987654321")).thenReturn(false);
        when(passwordEncoder.encode("P@ssword123")).thenReturn("hashedPassword");

        AppUser savedUser =
                new AppUser(
                        "johndoe",
                        "john@example.com",
                        "hashedPassword",
                        "0987654321",
                        UserStatus.ACTIVE);
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
        RegisterRequest request =
                new RegisterRequest("johndoe", "john@example.com", "P@ssword123", "0987654321");
        when(userRepository.existsByEmail("john@example.com")).thenReturn(true);

        SystemException ex =
                assertThrows(SystemException.class, () -> authService.register(request));
        assertEquals(409, ex.getStatus().value());
        verify(userRepository, never()).save(any(AppUser.class));
    }

    @Test
    void register_DuplicateUsername_ThrowsConflict() {
        RegisterRequest request =
                new RegisterRequest("johndoe", "john@example.com", "P@ssword123", "0987654321");
        when(userRepository.existsByEmail("john@example.com")).thenReturn(false);
        when(userRepository.existsByUsername("johndoe")).thenReturn(true);

        SystemException ex =
                assertThrows(SystemException.class, () -> authService.register(request));
        assertEquals(409, ex.getStatus().value());
        verify(userRepository, never()).save(any(AppUser.class));
    }

    @Test
    void register_DuplicatePhoneNumber_ThrowsConflict() {
        RegisterRequest request =
                new RegisterRequest("johndoe", "john@example.com", "P@ssword123", "0987654321");
        when(userRepository.existsByEmail("john@example.com")).thenReturn(false);
        when(userRepository.existsByUsername("johndoe")).thenReturn(false);
        when(userRepository.existsByPhoneNumber("0987654321")).thenReturn(true);

        SystemException ex =
                assertThrows(SystemException.class, () -> authService.register(request));
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
        AppUser user =
                new AppUser(
                        "johndoe",
                        "john@example.com",
                        "hashedPassword",
                        "0987654321",
                        UserStatus.ACTIVE);

        when(userRepository.findByEmail("johndoe")).thenReturn(Optional.empty());
        when(userRepository.findByUsername("johndoe")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("P@ssword123", "hashedPassword")).thenReturn(true);
        when(jwtTokenProvider.generateToken(
                        user.getId(), user.getUsername(), user.getEmail(), user.getRole().name()))
                .thenReturn("mock-jwt-token");

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("mock-jwt-token", response.accessToken());
        assertEquals("Bearer", response.tokenType());
        assertEquals("johndoe", response.user().username());
    }

    @Test
    void login_Success_WithEmail() {
        LoginRequest request = new LoginRequest("john@example.com", "P@ssword123");
        AppUser user =
                new AppUser(
                        "johndoe",
                        "john@example.com",
                        "hashedPassword",
                        "0987654321",
                        UserStatus.ACTIVE);

        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("P@ssword123", "hashedPassword")).thenReturn(true);
        when(jwtTokenProvider.generateToken(
                        user.getId(), user.getUsername(), user.getEmail(), user.getRole().name()))
                .thenReturn("mock-jwt-token");

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
        AppUser user =
                new AppUser(
                        "johndoe",
                        "john@example.com",
                        "hashedPassword",
                        "0987654321",
                        UserStatus.ACTIVE);

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
        AppUser user =
                new AppUser(
                        "johndoe",
                        "john@example.com",
                        "hashedPassword",
                        "0987654321",
                        UserStatus.INACTIVE);

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

    // ==================== Current User Tests ====================

    @Test
    void getCurrentUser_Success() {
        AppUser user =
                new AppUser("johndoe", "john@example.com", "pass", "0987654321", UserStatus.ACTIVE);
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

        SystemException ex =
                assertThrows(SystemException.class, () -> authService.getCurrentUser("unknown"));
        assertEquals(404, ex.getStatus().value());
        assertEquals(CoreConstants.USER_NOT_FOUND, ex.getMessage());
    }

    @Test
    void getCurrentUser_BlankUsername_ThrowsBadRequest() {
        assertThrows(SystemException.class, () -> authService.getCurrentUser(""));
        assertThrows(SystemException.class, () -> authService.getCurrentUser(null));
    }
}
