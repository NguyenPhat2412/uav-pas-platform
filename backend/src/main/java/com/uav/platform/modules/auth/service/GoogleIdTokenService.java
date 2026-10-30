package com.uav.platform.modules.auth.service;

import com.uav.platform.modules.auth.dto.record.GoogleIdentity;

/** Verifies Google ID tokens sent by the "Sign in with Google" button. */
public interface GoogleIdTokenService {

    String DISABLED_CODE = "GOOGLE_LOGIN_DISABLED";
    String DISABLED_MESSAGE = "Đăng nhập Google chưa được cấu hình.";
    String INVALID_CODE = "GOOGLE_TOKEN_INVALID";
    String INVALID_MESSAGE = "Không xác minh được tài khoản Google. Vui lòng thử lại.";
    String UNAVAILABLE_CODE = "GOOGLE_UNAVAILABLE";
    String UNAVAILABLE_MESSAGE = "Không kết nối được tới Google. Vui lòng thử lại sau.";

    /** False when no client ID is configured ({@code app.auth.google.client-ids} is empty). */
    boolean isEnabled();

    /**
     * Returns the token's identity, or throws a {@code SystemException}: 503 {@code
     * GOOGLE_LOGIN_DISABLED} when not configured, 401 {@code GOOGLE_TOKEN_INVALID} for any token
     * that fails a check, 503 {@code GOOGLE_UNAVAILABLE} when Google cannot be reached.
     */
    GoogleIdentity verify(String credential);
}
