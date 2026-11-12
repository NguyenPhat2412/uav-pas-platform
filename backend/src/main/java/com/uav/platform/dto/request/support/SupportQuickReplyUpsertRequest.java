package com.uav.platform.dto.request.support;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SupportQuickReplyUpsertRequest(
        @NotBlank @Size(max = 100) String title,
        @Size(max = 40) String topic,
        @NotBlank @Size(max = 2000) String content,
        Integer sortOrder) {}
