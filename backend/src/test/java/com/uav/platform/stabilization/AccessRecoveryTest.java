package com.uav.platform.stabilization;

import static org.junit.jupiter.api.Assertions.*;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.audit.enums.*;
import com.uav.platform.modules.inventory.enums.*;
import com.uav.platform.modules.media.enums.*;
import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.permission.enums.PermissionCode;
import com.uav.platform.modules.permission.repository.UserPermissionRepository;
import com.uav.platform.modules.permission.service.PermissionService;
import com.uav.platform.modules.role.service.RoleTemplateService;
import com.uav.platform.modules.station.enums.*;
import com.uav.platform.modules.uav.enums.*;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserStatus;
import com.uav.platform.modules.user.repository.UserRepository;
import com.uav.platform.modules.user.service.UserService;

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
