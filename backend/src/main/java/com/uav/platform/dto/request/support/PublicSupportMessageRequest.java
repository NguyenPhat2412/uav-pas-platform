package com.uav.platform.dto.request.support;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PublicSupportMessageRequest(@NotBlank @Size(max = 4000) String content) {}
