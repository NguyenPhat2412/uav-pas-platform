package com.uav.platform.modules.assistant.dto.request;

import jakarta.validation.constraints.*;

/**
 * An image for the latest question, base64 without the data: prefix. Videos are sent as a few frames sampled in the
 * browser (kind VIDEO_FRAME); the bytes are checked server-side, the declared type is only a hint.
 */
public record AssistantAttachmentRequest(
        @NotBlank @Pattern(regexp = "IMAGE|VIDEO_FRAME") String kind,
        @Size(max = 160) String name,
        @NotBlank @Size(max = 2_100_000) String data) {}
