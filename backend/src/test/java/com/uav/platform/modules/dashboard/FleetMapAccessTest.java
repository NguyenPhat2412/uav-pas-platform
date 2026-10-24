package com.uav.platform.modules.dashboard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.uav.platform.modules.dashboard.controller.DashboardController;
import com.uav.platform.modules.permission.config.PermissionDataInitializer;
import com.uav.platform.modules.permission.enums.PermissionCode;
import com.uav.platform.modules.permission.repository.PermissionRepository;
import com.uav.platform.modules.role.repository.RoleTemplatePermissionRepository;
import com.uav.platform.modules.role.repository.RoleTemplateRepository;
import com.uav.platform.modules.user.enums.UserRole;

import java.lang.reflect.Method;
import java.util.EnumSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

/**
 * The fleet map lists every UAV with the active mission it serves, across all customers. Customers
 * (ROLE_PILOT) hold UAV_READ for their own assigned equipment, so the endpoint must require a
 * permission they do not get by default.
 */
@DisplayName("GET /api/v1/dashboard/fleet-map access")
class FleetMapAccessTest {

    private static final Pattern PERMISSION = Pattern.compile("'([A-Z_]+)'");

    private static PermissionCode requiredPermission() throws NoSuchMethodException {
        PreAuthorize rule =
                DashboardController.class.getMethod("fleetMap").getAnnotation(PreAuthorize.class);
        assertThat(rule).as("fleet-map must be guarded by @PreAuthorize").isNotNull();
        Matcher matcher = PERMISSION.matcher(rule.value());
        assertThat(matcher.find()).as("permission code in %s", rule.value()).isTrue();
        return PermissionCode.valueOf(matcher.group(1));
    }

    /** Default permission set a role receives on first start-up. */
    @SuppressWarnings("unchecked")
    private static EnumSet<PermissionCode> defaults(UserRole role) throws Exception {
        PermissionDataInitializer initializer =
                new PermissionDataInitializer(
                        mock(PermissionRepository.class),
                        mock(RoleTemplateRepository.class),
                        mock(RoleTemplatePermissionRepository.class));
        Method method = PermissionDataInitializer.class.getDeclaredMethod("defaults", UserRole.class);
        method.setAccessible(true);
        return (EnumSet<PermissionCode>) method.invoke(initializer, role);
    }

    @Test
    @DisplayName("requires the dispatcher-level MISSION_VIEW_ALL permission")
    void requiresMissionViewAll() throws Exception {
        assertThat(requiredPermission()).isEqualTo(PermissionCode.MISSION_VIEW_ALL);
    }

    @Test
    @DisplayName("customers (ROLE_PILOT) cannot reach it with their default permissions")
    void customersAreDenied() throws Exception {
        EnumSet<PermissionCode> customer = defaults(UserRole.ROLE_PILOT);
        // The previous rule (UAV_READ) is part of the customer set, which is what exposed the map.
        assertThat(customer).contains(PermissionCode.UAV_READ);
        assertThat(customer).doesNotContain(requiredPermission());
    }

    @Test
    @DisplayName("operators, who only see their assigned missions, cannot reach it either")
    void operatorsAreDenied() throws Exception {
        assertThat(defaults(UserRole.ROLE_OPERATOR)).doesNotContain(requiredPermission());
    }

    @Test
    @DisplayName("commanders and administrators keep access")
    void dispatchersAndAdminsAreAllowed() throws Exception {
        PermissionCode required = requiredPermission();
        assertThat(defaults(UserRole.ROLE_COMMANDER)).contains(required);
        assertThat(defaults(UserRole.ROLE_ADMIN)).contains(required);
    }
}
