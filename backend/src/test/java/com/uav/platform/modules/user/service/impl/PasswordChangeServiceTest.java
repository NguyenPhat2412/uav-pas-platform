package com.uav.platform.modules.user.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.auth.repository.RefreshTokenRepository;
import com.uav.platform.modules.user.dto.request.PasswordChangeRequest;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.repository.UserRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

class PasswordChangeServiceTest {
    private final UserRepository users = mock(UserRepository.class);
    private final RefreshTokenRepository tokens = mock(RefreshTokenRepository.class);
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);
    private final PasswordChangeServiceImpl service = new PasswordChangeServiceImpl(users, encoder, tokens, mock(AuditLogService.class));
    private AppUser admin;

    @BeforeEach
    void setUp() {
        admin = new AppUser();
        ReflectionTestUtils.setField(admin, "id", 1L);
        admin.setUsername("admin");
        admin.setPasswordHash(encoder.encode("Current-Pass-1"));
        when(users.findByUsername("admin")).thenReturn(Optional.of(admin));
    }

    @Test
    void rejectsAWrongCurrentPassword() {
        SystemException error = assertThrows(SystemException.class,
                () -> service.change("admin", new PasswordChangeRequest("nope", "Brand-New-Pass-2")));
        assertEquals(PasswordChangeServiceImpl.WRONG_CURRENT, error.getMessage());
        verify(users, never()).save(any());
    }

    @Test
    void rejectsReusingTheCurrentPassword() {
        SystemException error = assertThrows(SystemException.class,
                () -> service.change("admin", new PasswordChangeRequest("Current-Pass-1", "Current-Pass-1")));
        assertEquals(PasswordChangeServiceImpl.SAME_AS_CURRENT, error.getMessage());
    }

    @Test
    void storesTheNewHashAndRevokesSessions() {
        service.change("admin", new PasswordChangeRequest("Current-Pass-1", "Brand-New-Pass-2"));
        assertTrue(encoder.matches("Brand-New-Pass-2", admin.getPasswordHash()));
        verify(tokens).deleteByUser(admin);
    }
}
