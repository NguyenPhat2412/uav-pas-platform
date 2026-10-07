package com.uav.platform.config;

import com.uav.platform.modules.user.common.*;
import com.uav.platform.modules.uav.common.*;
import com.uav.platform.modules.station.common.*;
import com.uav.platform.modules.inventory.common.*;
import com.uav.platform.modules.media.common.*;
import com.uav.platform.modules.audit.common.*;
import com.uav.platform.modules.mission.common.*;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.servlet.config.annotation.CorsRegistry;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

@DisplayName("CorsConfig Unit Tests")
class CorsConfigTest {

    @Test
    @DisplayName("Should configure CORS mappings without throwing exceptions")
    void addCorsMappings_ConfiguresCorrectly() {
        CorsConfig config = new CorsConfig();
        ReflectionTestUtils.setField(config, "allowedOrigins", "http://localhost:3000,http://127.0.0.1:3000");

        CorsRegistry registry = new CorsRegistry();
        assertDoesNotThrow(() -> config.addCorsMappings(registry));
    }
}
