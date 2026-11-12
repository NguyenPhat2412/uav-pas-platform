package com.uav.platform.config;

import static org.junit.jupiter.api.Assertions.*;

import com.uav.platform.enums.audit.*;
import com.uav.platform.enums.inventory.*;
import com.uav.platform.enums.media.*;
import com.uav.platform.enums.mission.*;
import com.uav.platform.enums.station.*;
import com.uav.platform.enums.uav.*;

import io.swagger.v3.oas.models.OpenAPI;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

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
