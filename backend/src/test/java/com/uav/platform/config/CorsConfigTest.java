package com.uav.platform.config;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

import com.uav.platform.modules.audit.enums.*;
import com.uav.platform.modules.inventory.enums.*;
import com.uav.platform.modules.media.enums.*;
import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.station.enums.*;
import com.uav.platform.modules.uav.enums.*;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.servlet.config.annotation.CorsRegistry;

@DisplayName("CorsConfig Unit Tests")
class CorsConfigTest {

    @Test
    @DisplayName("Should configure CORS mappings without throwing exceptions")
    void addCorsMappings_ConfiguresCorrectly() {
        CorsConfig config = new CorsConfig();
        ReflectionTestUtils.setField(
                config, "allowedOrigins", "http://localhost:3000,http://127.0.0.1:3000");

        CorsRegistry registry = new CorsRegistry();
        assertDoesNotThrow(() -> config.addCorsMappings(registry));
    }
}
