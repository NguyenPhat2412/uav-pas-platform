package com.uav.platform.modules.user.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.auth.repository.RefreshTokenRepository;
import com.uav.platform.modules.auth.service.SessionTerminationService;
import com.uav.platform.modules.permission.service.PermissionService;
import com.uav.platform.modules.user.dto.request.AdminCreateUserRequest;
import com.uav.platform.modules.user.dto.request.PasswordChangeRequest;
import com.uav.platform.modules.user.dto.request.PasswordResetRequest;
import com.uav.platform.modules.user.dto.request.RoleUpdateRequest;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserRole;
import com.uav.platform.modules.user.enums.UserStatus;
import com.uav.platform.modules.user.mapper.UserMapper;
import com.uav.platform.modules.user.repository.UserRepository;
import com.uav.platform.modules.user.service.impl.AdminPrivilegeOperations;
import com.uav.platform.modules.user.service.impl.PasswordChangeServiceImpl;
import com.uav.platform.modules.user.service.impl.UserAdministrationServiceImpl;
import com.uav.platform.modules.user.service.impl.UserServiceImpl;

import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

/** USER_MANAGE must not be a path to administrator power; credential changes end sessions. */
class AdminPrivilegeEscalationTest {
    final UserRepository users = mock(UserRepository.class);
    final PermissionService permissions = mock(PermissionService.class);
    final SessionTerminationService sessions = mock(SessionTerminationService.class);
    final UserServiceImpl userService = new UserServiceImpl(users);
    final UserAdministrationServiceImpl admin =
            new UserAdministrationServiceImpl(
                    users,
                    userService,
                    mock(PasswordEncoder.class),
                    mock(AuditLogService.class),
                    mock(RefreshTokenRepository.class),
                    Mappers.getMapper(UserMapper.class));

    AdminPrivilegeEscalationTest() {
        @SuppressWarnings("unchecked")
        ObjectProvider<PermissionService> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(permissions);
        userService.setPermissions(provider);
        userService.setSessionTermination(sessions);
        admin.setPermissions(provider);
        admin.setSessionTermination(sessions);
        account(1L, "staff", UserRole.ROLE_OPERATOR);
        account(2L, "root", UserRole.ROLE_ADMIN);
        account(3L, "pilot", UserRole.ROLE_PILOT);
        account(4L, "boss", UserRole.ROLE_ADMIN);
        when(users.save(any(AppUser.class))).thenAnswer(c -> c.getArgument(0));
    }

    private AppUser account(Long id, String username, UserRole role) {
        AppUser u = new AppUser(username, username + "@x.vn", "h", null, UserStatus.ACTIVE);
        u.setId(id);
        u.setRole(role);
        when(users.findById(id)).thenReturn(Optional.of(u));
        when(users.findByUsername(username)).thenReturn(Optional.of(u));
        return u;
    }

    private static String code(Runnable r) {
        return assertThrows(SystemException.class, r::run).getCode();
    }

    @Test
    void userManagerCannotGrantAdministratorOrChangeOwnRole() {
        assertEquals(
                AdminPrivilegeOperations.CODE,
                code(
                        () ->
                                userService.updateRole(
                                        3L, new RoleUpdateRequest(UserRole.ROLE_ADMIN), "staff")));
        assertEquals(
                AdminPrivilegeOperations.CODE,
                code(
                        () ->
                                userService.updateRole(
                                        1L, new RoleUpdateRequest(UserRole.ROLE_ADMIN), "staff")));
        assertEquals(
                AdminPrivilegeOperations.CODE,
                code(
                        () ->
                                userService.updateRole(
                                        1L,
                                        new RoleUpdateRequest(UserRole.ROLE_COMMANDER),
                                        "staff")));
        assertEquals(
                AdminPrivilegeOperations.CODE,
                code(
                        () ->
                                userService.updateRole(
                                        2L, new RoleUpdateRequest(UserRole.ROLE_PILOT), "staff")));
        assertEquals(UserRole.ROLE_PILOT, users.findById(3L).orElseThrow().getRole());
        assertEquals(UserRole.ROLE_ADMIN, users.findById(2L).orElseThrow().getRole());

        // Ordinary roles of other accounts stay with USER_MANAGE.
        userService.updateRole(3L, new RoleUpdateRequest(UserRole.ROLE_COMMANDER), "staff");
        assertEquals(UserRole.ROLE_COMMANDER, users.findById(3L).orElseThrow().getRole());
    }

    @Test
    void administratorOrPermissionManagerMayGrantAdministrator() {
        userService.updateRole(3L, new RoleUpdateRequest(UserRole.ROLE_ADMIN), "root");
        assertEquals(UserRole.ROLE_ADMIN, users.findById(3L).orElseThrow().getRole());

        when(permissions.has(any(), eq("PERMISSION_MANAGE"))).thenReturn(true);
        userService.updateRole(1L, new RoleUpdateRequest(UserRole.ROLE_ADMIN), "staff");
        assertEquals(UserRole.ROLE_ADMIN, users.findById(1L).orElseThrow().getRole());
    }

    @Test
    void lockedOrSuspendedAdministratorHasNoAdministratorPower() {
        users.findByUsername("root").orElseThrow().setManualLocked(true);
        users.findByUsername("boss").orElseThrow().setStatus(UserStatus.SUSPENDED);
        for (String actor : new String[] {"root", "boss", "ghost", null})
            assertEquals(
                    AdminPrivilegeOperations.CODE,
                    code(
                            () ->
                                    userService.updateRole(
                                            3L, new RoleUpdateRequest(UserRole.ROLE_ADMIN), actor)),
                    String.valueOf(actor));
    }

    @Test
    void userManagerCannotLockUnlockOrResetAnAdministrator() {
        assertEquals(AdminPrivilegeOperations.CODE, code(() -> userService.lockUser(2L, "staff")));
        assertEquals(
                AdminPrivilegeOperations.CODE, code(() -> userService.unlockUser(2L, "staff")));
        assertEquals(
                AdminPrivilegeOperations.CODE,
                code(
                        () ->
                                admin.resetPassword(
                                        2L, new PasswordResetRequest("NewPassword-42"), "staff")));
        assertFalse(users.findById(2L).orElseThrow().isManualLocked());
        verifyNoInteractions(sessions);

        userService.lockUser(2L, "boss");
        assertTrue(users.findById(2L).orElseThrow().isManualLocked());
    }

    @Test
    void userManagerCannotCreateAnAdministrator() {
        AdminCreateUserRequest request =
                new AdminCreateUserRequest(
                        "newadmin",
                        "newadmin@x.vn",
                        "Secret-Pass-1",
                        "0901234567",
                        null,
                        UserRole.ROLE_ADMIN);
        assertEquals(AdminPrivilegeOperations.CODE, code(() -> admin.create(request, "staff")));
        verify(users, never()).save(argThat(u -> "newadmin".equals(u.getUsername())));
    }

    @Test
    void adminCreatedAccountsAreVerified() {
        AdminCreateUserRequest request =
                new AdminCreateUserRequest(
                        "newpilot",
                        "newpilot@x.vn",
                        "Secret-Pass-1",
                        "0901234567",
                        null,
                        UserRole.ROLE_PILOT);
        when(users.save(argThat(u -> "newpilot".equals(u.getUsername()))))
                .thenAnswer(
                        c -> {
                            AppUser u = c.getArgument(0);
                            u.setId(50L);
                            return u;
                        });
        assertTrue(admin.create(request, "staff").emailVerified());
    }

    @Test
    void lockingAnAccountEndsItsSessions() {
        AppUser pilot = users.findById(3L).orElseThrow();
        userService.lockUser(3L, "staff");
        verify(sessions).terminateAll(pilot, "staff");
    }

    @Test
    void adminPasswordResetEndsAccessAndRefreshSessions() {
        AppUser pilot = users.findById(3L).orElseThrow();
        admin.resetPassword(3L, new PasswordResetRequest("NewPassword-42"), "staff");
        verify(sessions).terminateAll(pilot, "staff");
    }

    @Test
    void selfPasswordChangeEndsAccessAndRefreshSessions() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);
        AppUser pilot = users.findById(3L).orElseThrow();
        pilot.setPasswordHash(encoder.encode("Current-Pass-1"));
        RefreshTokenRepository refresh = mock(RefreshTokenRepository.class);
        PasswordChangeServiceImpl change =
                new PasswordChangeServiceImpl(users, encoder, refresh, mock(AuditLogService.class));
        change.setSessionTermination(sessions);

        change.change("pilot", new PasswordChangeRequest("Current-Pass-1", "Brand-New-Pass-2"));

        verify(refresh).deleteByUser(pilot);
        verify(sessions).terminateAll(pilot, "pilot");
    }
}
