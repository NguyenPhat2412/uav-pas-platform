package com.uav.platform.dto.request.support;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PublicSupportCreateRequest(
        @NotBlank @Size(max = 120) String fullName,
        @Size(max = 160) String organization,
        @NotBlank @Size(max = 160) String contactInfo,
        @Size(max = 40) String topic,
        @Size(max = 24) String source,
        @NotBlank @Size(max = 4000) String message) {}
