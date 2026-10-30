package com.uav.platform.config.routes;

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

@DisplayName("ApiRoutes & ApiRouteConfig Unit Tests")
class ApiRoutesTest {

    @Test
    @DisplayName("ApiRoutes should define correct version and domain route paths")
    void apiRoutes_PathsAreCorrect() {
        assertEquals("/api/v1", ApiRoutes.API_V1_PREFIX);

        // Auth
        assertEquals("/api/v1/auth", ApiRoutes.Auth.BASE);
        assertEquals("/register", ApiRoutes.Auth.REGISTER);
        assertEquals("/login", ApiRoutes.Auth.LOGIN);
        assertEquals("/me", ApiRoutes.Auth.ME);
        assertEquals("/refresh", ApiRoutes.Auth.REFRESH);
        assertEquals("/logout", ApiRoutes.Auth.LOGOUT);

        assertEquals("/api/v1/auth/register", ApiRoutes.Auth.FULL_REGISTER);
        assertEquals("/api/v1/auth/login", ApiRoutes.Auth.FULL_LOGIN);
        assertEquals("/api/v1/auth/me", ApiRoutes.Auth.FULL_ME);
        assertEquals("/api/v1/auth/refresh", ApiRoutes.Auth.FULL_REFRESH);
        assertEquals("/api/v1/auth/logout", ApiRoutes.Auth.FULL_LOGOUT);
        assertEquals("/api/v1/auth/**", ApiRoutes.Auth.FULL_AUTH_WILDCARD);

        // Users
        assertEquals("/api/v1/users", ApiRoutes.Users.BASE);
        assertEquals("/{id}", ApiRoutes.Users.USER_ID);
        assertEquals("/profile", ApiRoutes.Users.PROFILE);
        assertEquals("/api/v1/users", ApiRoutes.Users.FULL_USERS);
        assertEquals("/api/v1/users/{id}", ApiRoutes.Users.FULL_USER_BY_ID);

        // Drones
        assertEquals("/api/v1/drones", ApiRoutes.Drones.BASE);
        assertEquals("/{id}", ApiRoutes.Drones.DRONE_ID);
        assertEquals("/{id}/telemetry", ApiRoutes.Drones.TELEMETRY);
        assertEquals("/{id}/status", ApiRoutes.Drones.STATUS);
        assertEquals("/{id}/command", ApiRoutes.Drones.COMMAND);

        // Missions
        assertEquals("/api/v1/missions", ApiRoutes.Missions.BASE);
        assertEquals("/{id}", ApiRoutes.Missions.MISSION_ID);
        assertEquals("/{id}/waypoints", ApiRoutes.Missions.WAYPOINTS);
        assertEquals("/{id}/execute", ApiRoutes.Missions.EXECUTE);
        assertEquals("/{id}/abort", ApiRoutes.Missions.ABORT);

        // Docs
        assertEquals("/v3/api-docs/**", ApiRoutes.Docs.API_DOCS);
        assertEquals("/swagger-ui/**", ApiRoutes.Docs.SWAGGER_UI);
        assertEquals("/swagger-ui.html", ApiRoutes.Docs.SWAGGER_HTML);

        // Weather & flight safety
        assertEquals("/api/v1/weather", ApiRoutes.Weather.BASE);
        assertEquals("/forecast", ApiRoutes.Weather.FORECAST);
        assertEquals("/missions/{missionId}", ApiRoutes.Weather.BY_MISSION);
        assertEquals("/stations", ApiRoutes.Weather.STATIONS);
        assertEquals("/api/v1/admin/weather/provider", ApiRoutes.Weather.ADMIN_PROVIDER);

        // Training
        assertEquals("/api/v1/training", ApiRoutes.Training.BASE);
        assertEquals("/{codeOrSlug}", ApiRoutes.Training.BY_CODE);
        assertEquals("/{id}/progress", ApiRoutes.Training.PROGRESS);
        assertEquals("/{id}", ApiRoutes.Training.BY_ID);
    }

    @Test
    @DisplayName("Whitelists should contain expected security endpoints")
    void apiRoutes_WhitelistsIntegrity() {
        assertNotNull(ApiRoutes.SWAGGER_WHITELIST);
        assertEquals(3, ApiRoutes.SWAGGER_WHITELIST.length);
        assertArrayEquals(
                new String[] {"/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html"},
                ApiRoutes.SWAGGER_WHITELIST);

        assertNotNull(ApiRoutes.PUBLIC_AUTH_WHITELIST);
        // Sign-in, registration and the OTP/2FA challenge steps run before a session exists.
        assertArrayEquals(
                new String[] {
                    "/api/v1/auth/login",
                    "/api/v1/auth/google",
                    "/api/v1/auth/register",
                    "/api/v1/auth/register-otp",
                    "/api/v1/auth/verify-email",
                    "/api/v1/auth/verify-2fa",
                    "/api/v1/auth/resend-otp",
                    "/api/v1/auth/forgot-password",
                    "/api/v1/auth/reset-password",
                    "/api/v1/auth/refresh"
                },
                ApiRoutes.PUBLIC_AUTH_WHITELIST);
        // Enabling or disabling 2FA always needs a signed-in user.
        for (String route : ApiRoutes.PUBLIC_AUTH_WHITELIST)
            assertFalse(route.contains("2fa/setup") || route.contains("2fa/disable"));
    }

    @Test
    @DisplayName("Private constructors should be protected via reflection")
    void privateConstructors_ReflectionSafety() throws Exception {
        Class<?>[] classes = {
            ApiRoutes.class,
            ApiRoutes.Auth.class,
            ApiRoutes.Users.class,
            ApiRoutes.Drones.class,
            ApiRoutes.Missions.class,
            ApiRoutes.Docs.class,
            ApiRoutes.Training.class
        };

        for (Class<?> clazz : classes) {
            Constructor<?> constructor = clazz.getDeclaredConstructor();
            assertTrue(
                    java.lang.reflect.Modifier.isPrivate(constructor.getModifiers()),
                    clazz.getSimpleName() + " constructor must be private");
            constructor.setAccessible(true);
            Object instance = constructor.newInstance();
            assertNotNull(instance);
        }
    }

    @Test
    @DisplayName("ApiRouteConfig should initialize and configure cleanly")
    void apiRouteConfig_InstantiatesCleanly() {
        ApiRouteConfig config = new ApiRouteConfig();
        assertNotNull(config);
        assertDoesNotThrow(
                () ->
                        config.configurePathMatch(
                                new org.springframework.web.servlet.config.annotation
                                        .PathMatchConfigurer()));
    }
}
