package com.uav.platform.stabilization;

import static org.junit.jupiter.api.Assertions.*;

import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.audit.*;
import com.uav.platform.enums.inventory.*;
import com.uav.platform.enums.media.*;
import com.uav.platform.enums.mission.*;
import com.uav.platform.enums.permission.PermissionCode;
import com.uav.platform.enums.station.*;
import com.uav.platform.enums.uav.*;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.permission.UserPermissionRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.permission.PermissionService;
import com.uav.platform.service.role.RoleTemplateService;
import com.uav.platform.service.user.UserService;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.util.UUID;

@SpringBootTest
class AccessRecoveryTest {
    @DynamicPropertySource
    static void database(DynamicPropertyRegistry p) {
        p.add(
                "spring.datasource.url",
                () -> "jdbc:h2:mem:access_recovery;MODE=PostgreSQL;DB_CLOSE_DELAY=-1");
        p.add("spring.flyway.enabled", () -> false);
        p.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
    }

    @Autowired UserRepository users;
    @Autowired PermissionService permissions;
    @Autowired UserPermissionRepository overrides;
    @Autowired UserService userService;
    @Autowired RoleTemplateService templates;
    AppUser manager;

    @BeforeEach
    void fixture() {
        overrides.deleteAll();
        users.deleteAll();
        String suffix = UUID.randomUUID().toString();
        manager =
                users.save(
                        new AppUser(
                                "manager",
                                suffix + "@example.test",
                                "hash",
                                null,
                                UserStatus.ACTIVE));
        permissions.setUserPermission(manager.getId(), PermissionCode.USER_MANAGE, true, "setup");
        permissions.setUserPermission(
                manager.getId(), PermissionCode.PERMISSION_MANAGE, true, "setup");
    }

    @Test
    void effectiveManagerCannotBeLockedEvenWithoutAdminRole() {
        assertThrows(SystemException.class, () -> userService.lockUser(manager.getId(), "manager"));
        assertFalse(users.findById(manager.getId()).orElseThrow().isManualLocked());
    }

    @Test
    void lastEffectiveManagerCannotLoseOverride() {
        assertThrows(
                SystemException.class,
                () ->
                        permissions.setUserPermission(
                                manager.getId(),
                                PermissionCode.PERMISSION_MANAGE,
                                false,
                                "manager"));
        assertThrows(
                SystemException.class,
                () ->
                        permissions.removeUserPermission(
                                manager.getId(), PermissionCode.PERMISSION_MANAGE, "manager"));
    }

    @Test
    void anotherEffectiveManagerAllowsRemoval() {
        var replacement =
                users.save(
                        new AppUser(
                                "replacement",
                                "replacement@example.test",
                                "hash",
                                null,
                                UserStatus.ACTIVE));
        permissions.setUserPermission(
                replacement.getId(), PermissionCode.PERMISSION_MANAGE, true, "setup");
        permissions.setUserPermission(
                replacement.getId(), PermissionCode.USER_MANAGE, true, "setup");
        userService.lockUser(manager.getId(), "manager");
        assertTrue(users.findById(manager.getId()).orElseThrow().isManualLocked());
    }
}
