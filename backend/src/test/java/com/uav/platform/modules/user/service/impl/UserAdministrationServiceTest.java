package com.uav.platform.modules.user.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.auth.repository.RefreshTokenRepository;
import com.uav.platform.modules.user.dto.request.BulkLockRequest;
import com.uav.platform.modules.user.dto.request.PasswordResetRequest;
import com.uav.platform.modules.user.dto.response.BulkActionResponse;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.mapper.UserMapper;
import com.uav.platform.modules.user.repository.UserRepository;
import com.uav.platform.modules.user.service.UserService;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

class UserAdministrationServiceTest {
    private final UserRepository users = mock(UserRepository.class);
    private final UserService userService = mock(UserService.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final RefreshTokenRepository tokens = mock(RefreshTokenRepository.class);
    private final UserAdministrationServiceImpl service =
            new UserAdministrationServiceImpl(
                    users,
                    userService,
                    encoder,
                    mock(AuditLogService.class),
                    tokens,
                    mock(UserMapper.class));

    private AppUser user(String username) {
        AppUser user = new AppUser();
        user.setUsername(username);
        return user;
    }

    @Test
    void bulkLockSkipsTheActorAndMissingAccounts() {
        when(users.findById(1L)).thenReturn(Optional.of(user("admin")));
        when(users.findById(2L)).thenReturn(Optional.of(user("pilot")));
        when(users.findById(3L)).thenReturn(Optional.empty());

        BulkActionResponse result =
                service.bulkLock(new BulkLockRequest(List.of(1L, 2L, 2L, 3L), true), "admin");

        assertEquals(List.of(2L), result.processed());
        assertEquals(
                List.of("SELF", "NOT_FOUND"),
                result.skipped().stream().map(BulkActionResponse.Skipped::reason).toList());
        verify(userService).lockUser(2L, "admin");
        verify(userService, never()).lockUser(1L, "admin");
    }

    @Test
    void passwordResetRevokesSessions() {
        AppUser target = user("pilot");
        when(users.findById(2L)).thenReturn(Optional.of(target));
        when(encoder.encode("NewPassword-42")).thenReturn("hash");

        service.resetPassword(2L, new PasswordResetRequest("NewPassword-42"), "admin");

        assertEquals("hash", target.getPasswordHash());
        verify(tokens).deleteByUser(target);
    }

    @Test
    void csvCellsAreQuotedAndFormulaPrefixesNeutralised() {
        assertEquals("\"a \"\"b\"\"\"", UserAdministrationServiceImpl.cell("a \"b\""));
        assertEquals("\"'=HYPERLINK(1)\"", UserAdministrationServiceImpl.cell("=HYPERLINK(1)"));
        assertEquals("", UserAdministrationServiceImpl.cell(null));
    }
}
