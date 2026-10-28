package com.uav.platform.modules.assistant.service;

import static org.junit.jupiter.api.Assertions.*;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.assistant.dto.request.AssistantAttachmentRequest;
import com.uav.platform.modules.assistant.service.impl.AssistantAttachmentOperations;

import org.junit.jupiter.api.Test;

import java.util.Base64;
import java.util.Collections;
import java.util.List;

class AssistantAttachmentTest {
    private static String b64(byte[] b) {
        return Base64.getEncoder().encodeToString(b);
    }

    @Test
    void detectsTheRealImageTypeFromTheBytes() {
        byte[] jpeg = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0, 1};
        byte[] webp = "RIFF0000WEBPVP8 ".getBytes();
        var images =
                AssistantAttachmentOperations.validate(
                        List.of(
                                new AssistantAttachmentRequest("IMAGE", " a\u0007.jpg ", b64(jpeg)),
                                new AssistantAttachmentRequest("VIDEO_FRAME", null, b64(webp))));
        assertEquals("image/jpeg", images.get(0).mimeType());
        assertEquals("a.jpg", images.get(0).name());
        assertEquals("image/webp", images.get(1).mimeType());
    }

    @Test
    void rejectsNonImagesBadBase64AndOversizedFiles() {
        String code =
                assertThrows(
                                SystemException.class,
                                () ->
                                        AssistantAttachmentOperations.validate(
                                                List.of(
                                                        new AssistantAttachmentRequest(
                                                                "IMAGE",
                                                                "x.svg",
                                                                b64(
                                                                        "<svg onload=alert(1)>"
                                                                                .getBytes())))))
                        .getMessage();
        assertTrue(code.contains("JPEG"));
        assertThrows(
                SystemException.class,
                () ->
                        AssistantAttachmentOperations.validate(
                                List.of(new AssistantAttachmentRequest("IMAGE", null, "%%%"))));
        byte[] big = new byte[1_600_000];
        big[0] = (byte) 0xFF;
        big[1] = (byte) 0xD8;
        big[2] = (byte) 0xFF;
        assertThrows(
                SystemException.class,
                () ->
                        AssistantAttachmentOperations.validate(
                                List.of(new AssistantAttachmentRequest("IMAGE", null, b64(big)))));
        var tiny =
                new AssistantAttachmentRequest(
                        "IMAGE", null, b64(new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF}));
        assertThrows(
                SystemException.class,
                () -> AssistantAttachmentOperations.validate(Collections.nCopies(9, tiny)));
    }
}
