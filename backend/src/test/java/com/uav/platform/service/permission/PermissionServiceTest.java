package com.uav.platform.service.permission;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.repository.permission.PermissionRepository;
import com.uav.platform.repository.permission.UserPermissionRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.impl.permission.PermissionServiceImpl;

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

    @Test
    void commanderCanListOpenAndCancelMissionsByDefault() {
        UserRepository users = mock(UserRepository.class);
        AppUser user =
                new AppUser(
                        "commander2",
                        "c2@uav.vn",
                        "hash",
                        null,
                        null,
                        null,
                        null,
                        UserRole.ROLE_COMMANDER,
                        UserStatus.ACTIVE);
        user.setId(2L);
        when(users.findByUsername("commander2")).thenReturn(java.util.Optional.of(user));
        PermissionService service =
                new PermissionServiceImpl(
                        mock(PermissionRepository.class),
                        mock(UserPermissionRepository.class),
                        users,
                        mock(AuditLogService.class));
        var auth =
                UsernamePasswordAuthenticationToken.authenticated("commander2", "n/a", List.of());
        // GET /missions and /missions/{id} need MISSION_VIEW; cancel needs MISSION_CANCEL.
        assertTrue(service.has(auth, "MISSION_VIEW"));
        assertTrue(service.has(auth, "MISSION_CANCEL"));
        assertTrue(service.has(auth, "MISSION_CONFIRM"), "force-fail is gated by MISSION_CONFIRM");
    }

    @Test
    void initializerSeedsCommanderTemplateWithMissionViewAndCancel() throws Exception {
        var method =
                com.uav.platform.config.permission.PermissionDataInitializer.class
                        .getDeclaredMethod("defaults", UserRole.class);
        method.setAccessible(true);
        var initializer =
                new com.uav.platform.config.permission.PermissionDataInitializer(null, null, null);
        @SuppressWarnings("unchecked")
        var codes =
                (java.util.Set<com.uav.platform.enums.permission.PermissionCode>)
                        method.invoke(initializer, UserRole.ROLE_COMMANDER);
        assertTrue(codes.contains(com.uav.platform.enums.permission.PermissionCode.MISSION_VIEW));
        assertTrue(codes.contains(com.uav.platform.enums.permission.PermissionCode.MISSION_CANCEL));
    }
}
