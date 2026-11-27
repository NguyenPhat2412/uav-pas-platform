package com.uav.platform.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SupportAdminReplyRequest(@NotBlank @Size(max = 4000) String content, String status) {}
