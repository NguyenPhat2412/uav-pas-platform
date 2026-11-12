package com.uav.platform.dto.response.assistant;

/** dataUrl embeds the stored (already compressed) image so the admin transcript can show it directly. */
public record AssistantAttachmentResponse(
        Long id, String kind, String mimeType, String name, int sizeBytes, String dataUrl) {}
