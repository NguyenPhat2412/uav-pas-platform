package com.uav.platform.common.constant;

import static org.junit.jupiter.api.Assertions.*;

import com.uav.platform.modules.audit.enums.*;
import com.uav.platform.modules.inventory.enums.*;
import com.uav.platform.modules.media.enums.*;
import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.station.enums.*;
import com.uav.platform.modules.uav.enums.*;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Constructor;

@DisplayName("Constants Integrity Tests")
class ConstantsIntegrityTest {

    @Test
    @DisplayName("RestEndpoint should have correct endpoint paths")
    void restEndpoint_Integrity() {
        assertEquals("/api/v1/auth", RestEndpoint.AUTH);
        assertEquals("/register", RestEndpoint.REGISTER);
        assertEquals("/login", RestEndpoint.LOGIN);
        assertEquals("/me", RestEndpoint.ME);
        assertEquals("/refresh", RestEndpoint.REFRESH);
        assertEquals("/logout", RestEndpoint.LOGOUT);
        assertEquals("/api/v1/users", RestEndpoint.USERS);
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
        Constructor<RestEndpoint> c1 = RestEndpoint.class.getDeclaredConstructor();
        c1.setAccessible(true);
        assertNotNull(c1.newInstance());

        Constructor<CoreConstants> c2 = CoreConstants.class.getDeclaredConstructor();
        c2.setAccessible(true);
        assertNotNull(c2.newInstance());
    }
}
