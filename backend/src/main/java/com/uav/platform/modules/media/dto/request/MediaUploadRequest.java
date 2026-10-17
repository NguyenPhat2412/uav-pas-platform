package com.uav.platform.modules.media.dto.request;

import com.uav.platform.modules.media.enums.*;
import com.uav.platform.modules.media.enums.MediaType;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record MediaUploadRequest(
        @NotBlank String originalName,
        @NotBlank String contentType,
        @Min(1) long size,
        @NotNull MediaType type,
        String linkedEntityType,
        String linkedEntityId) {}
