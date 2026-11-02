package com.uav.platform.dto.request.media;

import com.uav.platform.enums.media.*;
import com.uav.platform.enums.media.MediaType;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record MediaUploadRequest(
        @NotBlank String originalName,
        @NotBlank String contentType,
        @Min(1) long size,
        @NotNull MediaType type,
        String linkedEntityType,
        String linkedEntityId,
        MediaVisibility visibility) {

    /** Internal uploads (avatars, mission files) stay PRIVATE. */
    public MediaUploadRequest(
            String originalName,
            String contentType,
            long size,
            MediaType type,
            String linkedEntityType,
            String linkedEntityId) {
        this(originalName, contentType, size, type, linkedEntityType, linkedEntityId, null);
    }
}
