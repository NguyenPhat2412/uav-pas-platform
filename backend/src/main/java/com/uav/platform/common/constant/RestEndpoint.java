package com.uav.platform.common.constant;

import com.uav.platform.config.routes.ApiRoutes;

/**
 * Endpoint constants for backward compatibility.
 * Delegates to centralized {@link ApiRoutes}.
 */
public final class RestEndpoint {
    private RestEndpoint() {}

    public static final String API_PREFIX = ApiRoutes.API_V1_PREFIX;

    public static final String AUTH = ApiRoutes.Auth.BASE;
    public static final String REGISTER = ApiRoutes.Auth.REGISTER;
    public static final String REGISTER_OTP = ApiRoutes.Auth.REGISTER_OTP;
    public static final String VERIFY_EMAIL = ApiRoutes.Auth.VERIFY_EMAIL;
    public static final String LOGIN = ApiRoutes.Auth.LOGIN;
    public static final String GOOGLE = ApiRoutes.Auth.GOOGLE;
    public static final String VERIFY_2FA = ApiRoutes.Auth.VERIFY_2FA;
    public static final String RESEND_OTP = ApiRoutes.Auth.RESEND_OTP;
    public static final String FORGOT_PASSWORD = ApiRoutes.Auth.FORGOT_PASSWORD;
    public static final String RESET_PASSWORD = ApiRoutes.Auth.RESET_PASSWORD;
    public static final String TWO_FACTOR_STATUS = ApiRoutes.Auth.TWO_FACTOR_STATUS;
    public static final String TWO_FACTOR_SETUP = ApiRoutes.Auth.TWO_FACTOR_SETUP;
    public static final String TWO_FACTOR_ENABLE = ApiRoutes.Auth.TWO_FACTOR_ENABLE;
    public static final String TWO_FACTOR_DISABLE = ApiRoutes.Auth.TWO_FACTOR_DISABLE;
    public static final String ME = ApiRoutes.Auth.ME;
    public static final String REFRESH = ApiRoutes.Auth.REFRESH;
    public static final String LOGOUT = ApiRoutes.Auth.LOGOUT;

    public static final String USERS = ApiRoutes.Users.BASE;
    public static final String USER_ID = ApiRoutes.Users.USER_ID;
}
