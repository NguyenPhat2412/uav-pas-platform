package com.uav.platform.dto.request.storage;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GoogleOAuthConfigRequest(
        @NotBlank @Size(max = 240) String clientId, @Size(max = 240) String clientSecret) {}
