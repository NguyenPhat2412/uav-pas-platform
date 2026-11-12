package com.uav.platform.dto.request.notification;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UnregisterPushTokenRequest(
        @NotBlank(message = "Push token không được để trống.")
                @Size(max = 255, message = "Push token tối đa 255 ký tự.")
                String token) {}
