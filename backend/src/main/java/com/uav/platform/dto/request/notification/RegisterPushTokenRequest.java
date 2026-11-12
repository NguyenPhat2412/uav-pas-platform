package com.uav.platform.dto.request.notification;

import com.uav.platform.enums.notification.PushPlatform;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RegisterPushTokenRequest(
        @NotBlank(message = "Push token không được để trống.")
                @Size(max = 255, message = "Push token tối đa 255 ký tự.")
                String token,
        @NotNull(message = "Chọn nền tảng thiết bị.") PushPlatform platform,
        @Size(max = 120, message = "Tên thiết bị tối đa 120 ký tự.") String deviceName) {}
