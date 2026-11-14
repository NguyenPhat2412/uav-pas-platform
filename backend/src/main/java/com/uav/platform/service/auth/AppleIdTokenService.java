package com.uav.platform.service.auth;

import com.uav.platform.dto.record.auth.AppleIdentity;

/** Verifies Apple ID tokens sent by "Sign in with Apple" on Web and iOS clients. */
public interface AppleIdTokenService {

    String DISABLED_CODE = "APPLE_AUTH_DISABLED";
    String DISABLED_MESSAGE = "Đăng nhập Apple chưa được cấu hình.";
    String INVALID_CODE = "INVALID_APPLE_TOKEN";
    String INVALID_MESSAGE = "Không xác minh được tài khoản Apple. Vui lòng thử lại.";
    String UNAVAILABLE_CODE = "APPLE_AUTH_UNAVAILABLE";
    String UNAVAILABLE_MESSAGE = "Không kết nối được tới Apple. Vui lòng thử lại sau.";

    /** False when no client ID is configured ({@code app.auth.apple.client-ids} is empty). */
    boolean isEnabled();

    /**
     * Cryptographically verifies {@code credential} against Apple's JWKS and validates its claims,
     * throwing a {@code SystemException}: 503 {@code APPLE_AUTH_DISABLED} when not configured, 401
     * {@code INVALID_APPLE_TOKEN} for any token failing verification, or 503 {@code
     * APPLE_AUTH_UNAVAILABLE} when Apple's key endpoint cannot be reached.
     */
    AppleIdentity verify(String credential, String expectedNonce);

    default AppleIdentity verify(String credential) {
        return verify(credential, null);
    }
}
