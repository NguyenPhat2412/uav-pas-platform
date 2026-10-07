package com.uav.platform.modules.user.config.request;


import com.uav.platform.modules.user.common.*;

import jakarta.validation.constraints.NotBlank;

public record ZaloLoginRequest(
        @NotBlank(message = "Zalo auth code is required") String code,
        String redirectUri
) {}
