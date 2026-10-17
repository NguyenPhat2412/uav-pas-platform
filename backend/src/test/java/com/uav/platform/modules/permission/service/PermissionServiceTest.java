package com.uav.platform.modules.permission.service;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.permission.repository.PermissionRepository;
import com.uav.platform.modules.permission.repository.UserPermissionRepository;
import com.uav.platform.modules.permission.service.impl.PermissionServiceImpl;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserRole;
import com.uav.platform.modules.user.enums.UserStatus;
import com.uav.platform.modules.user.repository.UserRepository;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.util.List;

class PermissionServiceTest {
    @Test
    void commanderGetsUavManagementByDefault() {
        UserRepository users = mock(UserRepository.class);
        UserPermissionRepository assignments = mock(UserPermissionRepository.class);
        AppUser user =
                new AppUser(
                        "commander",
                        "c@uav.vn",
                        "hash",
                        null,
                        null,
                        null,
                        null,
                        UserRole.ROLE_COMMANDER,
                        UserStatus.ACTIVE);
        user.setId(1L);
        when(users.findByUsername("commander")).thenReturn(java.util.Optional.of(user));
        PermissionService service =
                new PermissionServiceImpl(
                        mock(PermissionRepository.class),
                        assignments,
                        users,
                        mock(AuditLogService.class));
        assertTrue(
                service.has(
                        UsernamePasswordAuthenticationToken.authenticated(
                                "commander", "n/a", List.of()),
                        "UAV_MANAGE"));
    }
}
