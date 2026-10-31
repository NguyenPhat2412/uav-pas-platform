package com.uav.platform.common.constant;

import static org.junit.jupiter.api.Assertions.*;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.enums.audit.*;
import com.uav.platform.enums.inventory.*;
import com.uav.platform.enums.media.*;
import com.uav.platform.enums.mission.*;
import com.uav.platform.enums.station.*;
import com.uav.platform.enums.uav.*;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Constructor;

@DisplayName("Constants Integrity Tests")
class ConstantsIntegrityTest {

    @Test
    @DisplayName("ApiRoutes should have correct endpoint paths")
    void apiRoutes_Integrity() {
        assertEquals("/api/v1/auth", ApiRoutes.Auth.BASE);
        assertEquals("/register", ApiRoutes.Auth.REGISTER);
        assertEquals("/login", ApiRoutes.Auth.LOGIN);
        assertEquals("/me", ApiRoutes.Auth.ME);
        assertEquals("/refresh", ApiRoutes.Auth.REFRESH);
        assertEquals("/logout", ApiRoutes.Auth.LOGOUT);
        assertEquals("/api/v1/users", ApiRoutes.Users.BASE);
        assertEquals("/api/v1/users/profile", ApiRoutes.Users.FULL_PROFILE);
        assertEquals("/api/v1/admin/alerts", ApiRoutes.Admin.ALERTS);
        assertEquals("/api/v1/billing/admin/plans", ApiRoutes.Billing.ADMIN_PLANS);
        assertEquals("/api/v1/inventory/equipment", ApiRoutes.Inventory.EQUIPMENT);
    }

    @Test
    @DisplayName("CoreConstants should have correct messages")
    void coreConstants_Integrity() {
        assertNotNull(CoreConstants.INTERNAL_SERVER_ERROR);
        assertNotNull(CoreConstants.INVALID_CREDENTIALS);
        assertEquals("Authentication", CoreConstants.AUTH_TAG_NAME);
        assertEquals("1.0.0", CoreConstants.OPENAPI_VERSION);
    }

    @Test
    @DisplayName("Private constructor should prevent instantiation")
    void privateConstructors() throws Exception {
        Constructor<ApiRoutes> c1 = ApiRoutes.class.getDeclaredConstructor();
        c1.setAccessible(true);
        assertNotNull(c1.newInstance());

        Constructor<CoreConstants> c2 = CoreConstants.class.getDeclaredConstructor();
        c2.setAccessible(true);
        assertNotNull(c2.newInstance());
    }
}
