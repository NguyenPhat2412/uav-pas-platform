package com.uav.platform.error;

import static org.junit.jupiter.api.Assertions.*;

import com.uav.platform.common.dto.response.ErrorResponse;
import com.uav.platform.modules.audit.enums.*;
import com.uav.platform.modules.inventory.enums.*;
import com.uav.platform.modules.media.enums.*;
import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.station.enums.*;
import com.uav.platform.modules.uav.enums.*;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

@DisplayName("ErrorResponse Record Unit Tests")
class ErrorResponseTest {

    @Test
    @DisplayName("Should create ErrorResponse via factory method of()")
    void errorResponse_FactoryMethod() {
        ErrorResponse response =
                ErrorResponse.of(404, "Not Found", "Item not found", "/api/v1/items/99");

        assertEquals(404, response.status());
        assertEquals("Not Found", response.error());
        assertEquals("Item not found", response.message());
        assertEquals("/api/v1/items/99", response.path());
        assertNotNull(response.timestamp());
    }

    @Test
    @DisplayName("Should support full constructor")
    void errorResponse_FullConstructor() {
        LocalDateTime fixedTime = LocalDateTime.now();
        ErrorResponse response =
                new ErrorResponse(fixedTime, 400, "Bad Request", "Invalid input", "/api/v1/test");

        assertEquals(400, response.status());
        assertEquals("Bad Request", response.error());
        assertEquals("Invalid input", response.message());
        assertEquals("/api/v1/test", response.path());
        assertEquals(fixedTime, response.timestamp());
    }
}
