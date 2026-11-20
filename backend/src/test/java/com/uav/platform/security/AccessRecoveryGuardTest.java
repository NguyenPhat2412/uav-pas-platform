package com.uav.platform.security;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.uav.platform.entity.permission.Permission;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.permission.PermissionCode;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.permission.PermissionRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.permission.PermissionService;

import jakarta.persistence.EntityManager;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.Optional;

@ExtendWith(MockitoExtension.class)
@DisplayName("AccessRecoveryGuard Security Unit Tests")
class AccessRecoveryGuardTest {

    @Mock private PermissionRepository permissionRepository;
    @Mock private UserRepository userRepository;
    @Mock private ObjectProvider<PermissionService> permissionServiceProvider;
    @Mock private PermissionService permissionService;
    @Mock private EntityManager entityManager;

    private AccessRecoveryGuard guard;

    @BeforeEach
    void setUp() {
        guard =
                new AccessRecoveryGuard(
                        permissionRepository,
                        userRepository,
                        permissionServiceProvider,
                        entityManager);
    }

    private static AppUser user(String username, UserStatus status) {
        return new AppUser(
                username,
                username + "@example.invalid",
                "encoded",
                null,
                username,
                null,
                UserRole.ROLE_ADMIN,
                status);
    }

    @Test
    @DisplayName("begin() throws 409 CONFLICT when permission catalog is not initialized")
    void begin_missingCatalogRow_throwsConflict() {
        when(permissionRepository.findByCodeForUpdate(PermissionCode.USER_PERMISSION_MANAGE))
                .thenReturn(Optional.empty());

        SystemException ex = assertThrows(SystemException.class, () -> guard.begin());
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertTrue(ex.getMessage().contains("Permission catalog"));
    }

    @Test
    @DisplayName(
            "begin() counts only active, unlocked accounts holding both USER_MANAGE and USER_PERMISSION_MANAGE")
    void begin_countsOnlyActiveEligibleManagers() {
        when(permissionRepository.findByCodeForUpdate(PermissionCode.USER_PERMISSION_MANAGE))
                .thenReturn(
                        Optional.of(
                                new Permission(
                                        PermissionCode.USER_PERMISSION_MANAGE,
                                        "Manage user permissions")));
        when(permissionServiceProvider.getObject()).thenReturn(permissionService);

        AppUser activeManager = user("admin_active", UserStatus.ACTIVE);
        AppUser suspendedManager = user("admin_suspended", UserStatus.SUSPENDED);
        AppUser partialAdmin = user("admin_partial", UserStatus.ACTIVE);

        when(userRepository.findAll())
                .thenReturn(List.of(activeManager, suspendedManager, partialAdmin));

        when(permissionService.has(any(Authentication.class), eq("USER_PERMISSION_MANAGE")))
                .thenAnswer(
                        inv -> {
                            Authentication auth = inv.getArgument(0);
                            return "admin_active".equals(auth.getName())
                                    || "admin_partial".equals(auth.getName());
                        });
        when(permissionService.has(any(Authentication.class), eq("USER_MANAGE")))
                .thenAnswer(
                        inv -> {
                            Authentication auth = inv.getArgument(0);
                            return "admin_active".equals(auth.getName());
                        });

        long count = guard.begin();
        assertEquals(1L, count);
    }

    @Test
    @DisplayName(
            "finish() flushes and throws LAST_ACCESS_MANAGER conflict if last manager is removed")
    void finish_whenLastManagerRemoved_throwsConflict() {
        when(permissionServiceProvider.getObject()).thenReturn(permissionService);
        when(userRepository.findAll())
                .thenReturn(List.of(user("suspended_only", UserStatus.SUSPENDED)));

        SystemException ex = assertThrows(SystemException.class, () -> guard.finish(1L));
        verify(entityManager).flush();
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertTrue(ex.getMessage().contains("LAST_ACCESS_MANAGER"));
    }

    @Test
    @DisplayName(
            "finish() succeeds when at least one active manager remains or before count was zero")
    void finish_whenManagerRemainsOrBeforeZero_succeeds() {
        // Case 1: before == 0 (bootstrap/empty state) should not block
        assertDoesNotThrow(() -> guard.finish(0L));

        // Case 2: before == 1 and 1 active manager remains
        when(permissionServiceProvider.getObject()).thenReturn(permissionService);
        AppUser remainingAdmin = user("admin_keep", UserStatus.ACTIVE);
        when(userRepository.findAll()).thenReturn(List.of(remainingAdmin));
        when(permissionService.has(any(Authentication.class), eq("USER_PERMISSION_MANAGE")))
                .thenReturn(true);
        when(permissionService.has(any(Authentication.class), eq("USER_MANAGE"))).thenReturn(true);

        assertDoesNotThrow(() -> guard.finish(1L));
    }
}
