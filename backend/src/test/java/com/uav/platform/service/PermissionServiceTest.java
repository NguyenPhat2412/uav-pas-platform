package com.uav.platform.service;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.uav.platform.dao.IPermissionDao;
import com.uav.platform.dao.IUserDao;
import com.uav.platform.dao.IUserPermissionDao;
import com.uav.platform.entity.AppUser;
import com.uav.platform.enums.UserRole;
import com.uav.platform.enums.UserStatus;
import com.uav.platform.service.impl.PermissionServiceImpl;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.util.List;

class PermissionServiceTest {
    @Test
    void commanderGetsUavManagementByDefault() {
        IUserDao users = mock(IUserDao.class);
        IUserPermissionDao assignments = mock(IUserPermissionDao.class);
        AppUser user =
                new AppUser(
                        "commander",
                        "c@uav.vn",
                        "hash",
                        null,
                        null,
                        null,
                        UserRole.ROLE_COMMANDER,
                        UserStatus.ACTIVE);
        user.setId(1L);
        when(users.findByUsername("commander")).thenReturn(java.util.Optional.of(user));
        PermissionService service =
                new PermissionServiceImpl(
                        mock(IPermissionDao.class),
                        assignments,
                        users,
                        mock(AuditLogService.class));
        assertTrue(
                service.has(
                        UsernamePasswordAuthenticationToken.authenticated(
                                "commander", "n/a", List.of()),
                        "UAV_CREATE"));
    }

    @Test
    void commanderCanListOpenAndCancelMissionsByDefault() {
        IUserDao users = mock(IUserDao.class);
        AppUser user =
                new AppUser(
                        "commander2",
                        "c2@uav.vn",
                        "hash",
                        null,
                        null,
                        null,
                        UserRole.ROLE_COMMANDER,
                        UserStatus.ACTIVE);
        user.setId(2L);
        when(users.findByUsername("commander2")).thenReturn(java.util.Optional.of(user));
        PermissionService service =
                new PermissionServiceImpl(
                        mock(IPermissionDao.class),
                        mock(IUserPermissionDao.class),
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
                com.uav.platform.config.PermissionDataInitializer.class.getDeclaredMethod(
                        "defaults", UserRole.class);
        method.setAccessible(true);
        var initializer = new com.uav.platform.config.PermissionDataInitializer(null, null, null);
        @SuppressWarnings("unchecked")
        var codes =
                (java.util.Set<com.uav.platform.enums.PermissionCode>)
                        method.invoke(initializer, UserRole.ROLE_COMMANDER);
        assertTrue(codes.contains(com.uav.platform.enums.PermissionCode.MISSION_VIEW));
        assertTrue(codes.contains(com.uav.platform.enums.PermissionCode.MISSION_CANCEL));
    }
}
