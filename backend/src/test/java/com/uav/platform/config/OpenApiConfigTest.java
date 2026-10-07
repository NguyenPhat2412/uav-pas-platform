package com.uav.platform.config;

import com.uav.platform.modules.user.common.*;
import com.uav.platform.modules.uav.common.*;
import com.uav.platform.modules.station.common.*;
import com.uav.platform.modules.inventory.common.*;
import com.uav.platform.modules.media.common.*;
import com.uav.platform.modules.audit.common.*;
import com.uav.platform.modules.mission.common.*;

import io.swagger.v3.oas.models.OpenAPI;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("OpenApiConfig Unit Tests")
class OpenApiConfigTest {

    @Test
    @DisplayName("Should create OpenAPI documentation bean with security scheme")
    void customOpenAPI_CreatesValidDocumentation() {
        OpenApiConfig config = new OpenApiConfig();
        OpenAPI openAPI = config.customOpenAPI();

        assertNotNull(openAPI);
        assertNotNull(openAPI.getInfo());
        assertEquals("UAV PAS Platform API", openAPI.getInfo().getTitle());
        assertEquals("1.0.0", openAPI.getInfo().getVersion());
        assertNotNull(openAPI.getComponents());
        assertNotNull(openAPI.getComponents().getSecuritySchemes());
        assertTrue(openAPI.getComponents().getSecuritySchemes().containsKey("BearerAuth"));
    }
}
