package com.uav.platform.modules.user.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record AvatarUploadRequest(
        @NotBlank String originalName, @NotBlank String contentType, @Min(1) long size) {}
