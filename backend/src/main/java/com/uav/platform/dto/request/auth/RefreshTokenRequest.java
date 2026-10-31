package com.uav.platform.dto.request.auth;

import io.swagger.v3.oas.annotations.media.Schema;

import jakarta.validation.constraints.NotBlank;

@Schema(description = "Refresh token request payload")
public record RefreshTokenRequest(
        @NotBlank(message = "Refresh token must not be blank")
                @Schema(
                        description = "Opaque refresh token issued at login",
                        example = "d9b23e80-7601-44bb-8b77-3e11762ffb76")
                String refreshToken) {}
