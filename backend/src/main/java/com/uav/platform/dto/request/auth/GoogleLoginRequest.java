package com.uav.platform.dto.request.auth;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Body of {@code POST /api/v1/auth/google}. A missing or blank credential is answered like any
 * other token that cannot be verified (401 {@code GOOGLE_TOKEN_INVALID}), not as a validation
 * error.
 */
public record GoogleLoginRequest(
        @Schema(description = "Google ID token returned by Google Identity Services")
                String credential) {}
