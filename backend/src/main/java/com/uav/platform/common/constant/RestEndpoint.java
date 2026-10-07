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
    public static final String LOGIN = ApiRoutes.Auth.LOGIN;
    public static final String ZALO_URL = ApiRoutes.Auth.ZALO_URL;
    public static final String ZALO_CALLBACK = ApiRoutes.Auth.ZALO_CALLBACK;
    public static final String ME = ApiRoutes.Auth.ME;
    public static final String REFRESH = ApiRoutes.Auth.REFRESH;
    public static final String LOGOUT = ApiRoutes.Auth.LOGOUT;

    public static final String USERS = ApiRoutes.Users.BASE;
    public static final String USER_ID = ApiRoutes.Users.USER_ID;
}
