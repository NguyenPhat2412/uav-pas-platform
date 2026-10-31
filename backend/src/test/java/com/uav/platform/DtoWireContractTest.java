package com.uav.platform;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.uav.platform.common.dto.response.MessageResponse;
import com.uav.platform.controller.sar.SarController;
import com.uav.platform.controller.webhook.WebhookController;
import com.uav.platform.dto.request.sar.RescueDispatchRequest;
import com.uav.platform.dto.request.user.UserProfilePatchRequest;
import com.uav.platform.dto.request.webhook.WebhookTestDispatchRequest;
import com.uav.platform.dto.response.notification.UnreadCountResponse;
import com.uav.platform.dto.response.permission.PermissionCodesResponse;
import com.uav.platform.dto.response.sar.RescueDispatchResponse;
import com.uav.platform.dto.response.webhook.WebhookDispatchResponse;
import com.uav.platform.service.sar.SarService;
import com.uav.platform.service.webhook.WebhookService;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import tools.jackson.databind.json.JsonMapper;

import java.util.List;
import java.util.Map;

/** Protects the existing wire shape while Java endpoint signatures switch to DTOs. */
class DtoWireContractTest {
    private final JsonMapper json = JsonMapper.builder().build();

    @Test
    void webhookAcceptsOriginalFlatObjectAndReturnsOriginalStatusFields() throws Exception {
        var service = mock(WebhookService.class);
        when(service.dispatchTest(any()))
                .thenReturn(new WebhookDispatchResponse("QUEUED", "queued"));
        var mvc = MockMvcBuilders.standaloneSetup(new WebhookController(service)).build();
        mvc.perform(
                        post("/api/v1/webhooks/test-dispatch")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"eventType\":\"CUSTOM\",\"coordinates\":[20,107],\"payload\":{\"nested\":true}}"))
                .andExpect(status().isOk())
                .andExpect(content().json("{\"status\":\"QUEUED\",\"message\":\"queued\"}"));
        var request = ArgumentCaptor.forClass(WebhookTestDispatchRequest.class);
        verify(service).dispatchTest(request.capture());
        assertEquals(
                Map.of(
                        "eventType",
                        "CUSTOM",
                        "coordinates",
                        List.of(20, 107),
                        "payload",
                        Map.of("nested", true)),
                request.getValue().payload());
    }

    @Test
    void webhookRejectsNonObjectBodiesBeforeService() throws Exception {
        var service = mock(WebhookService.class);
        var mvc = MockMvcBuilders.standaloneSetup(new WebhookController(service)).build();
        for (String body : List.of("[]", "\"text\"", "null")) {
            mvc.perform(
                            post("/api/v1/webhooks/test-dispatch")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(body))
                    .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(service);
    }

    @Test
    void rescueAcceptsFlatCoordinatesAndKeepsConfirmationFalse() throws Exception {
        var service = mock(SarService.class);
        when(service.dispatchRescueCoordinates(eq(42L), any(), isNull()))
                .thenReturn(
                        new RescueDispatchResponse(
                                "UNCONFIGURED",
                                false,
                                "SAR_EMERGENCY_TRIGGERED",
                                42L,
                                "2026-10-17T12:00",
                                "recorded"));
        var mvc = MockMvcBuilders.standaloneSetup(new SarController(service)).build();
        mvc.perform(
                        post("/api/v1/sar/missions/42/dispatch-rescue")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"coordinates\":\"20.7,107.0\",\"victimCount\":2}"))
                .andExpect(status().isOk())
                .andExpect(
                        content()
                                .json(
                                        "{\"status\":\"UNCONFIGURED\",\"externalDeliveryConfirmed\":false,\"eventType\":\"SAR_EMERGENCY_TRIGGERED\",\"missionId\":42,\"timestamp\":\"2026-10-17T12:00\",\"message\":\"recorded\"}"));
        var request = ArgumentCaptor.forClass(RescueDispatchRequest.class);
        verify(service).dispatchRescueCoordinates(eq(42L), request.capture(), isNull());
        assertEquals(
                Map.of("coordinates", "20.7,107.0", "victimCount", 2),
                request.getValue().payload());
    }

    @Test
    void rescueBodyRemainsOptional() throws Exception {
        var service = mock(SarService.class);
        var mvc = MockMvcBuilders.standaloneSetup(new SarController(service)).build();
        mvc.perform(post("/api/v1/sar/missions/42/dispatch-rescue")).andExpect(status().isOk());
        verify(service).dispatchRescueCoordinates(42L, null, null);
    }

    @Test
    void profileWrapperPreservesUnknownAndNullFieldsForStrictValidation() {
        var request =
                json.readValue(
                        "{\"fullName\":null,\"role\":\"ADMIN\"}", UserProfilePatchRequest.class);
        assertTrue(request.fields().containsKey("fullName"));
        assertNull(request.fields().get("fullName"));
        assertEquals("ADMIN", request.fields().get("role"));
    }

    @Test
    void responseDtosKeepExistingObjectAndArrayShapes() {
        assertEquals(
                json.readTree("{\"message\":\"ok\"}"), json.valueToTree(new MessageResponse("ok")));
        assertEquals(
                json.readTree("{\"unreadCount\":7}"),
                json.readTree(json.writeValueAsString(new UnreadCountResponse(7))));
        assertEquals(
                json.readTree("[\"MISSION_VIEW\",\"MEDIA_MANAGE\"]"),
                json.valueToTree(
                        new PermissionCodesResponse(List.of("MISSION_VIEW", "MEDIA_MANAGE"))));
    }
}
