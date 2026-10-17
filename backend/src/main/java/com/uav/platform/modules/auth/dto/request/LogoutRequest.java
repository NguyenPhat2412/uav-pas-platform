package com.uav.platform.modules.auth.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Logout request payload")
public record LogoutRequest(
        @Schema(
                        description = "Refresh token to revoke upon logout",
                        example = "d9b23e80-7601-44bb-8b77-3e11762ffb76")
                String refreshToken) {}
