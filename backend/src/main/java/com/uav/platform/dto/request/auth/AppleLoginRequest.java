package com.uav.platform.dto.request.auth;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Body of {@code POST /api/v1/auth/apple}. A missing or blank credential is answered like any other
 * token that cannot be verified (401 {@code INVALID_APPLE_TOKEN}), not as a validation error.
 */
public record AppleLoginRequest(
        @Schema(
                        description =
                                "Apple identity token (RS256 compact JWS) returned by Sign in with Apple")
                String credential,
        @Schema(description = "Optional authorization code returned by Sign in with Apple")
                String authorizationCode,
        @Schema(description = "User full name supplied by Apple on first authorization")
                String fullName,
        @Schema(description = "Optional raw client nonce to verify against the token nonce claim")
                String nonce) {}
