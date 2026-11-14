package com.uav.platform.common.constant;

/** HTTP auth values shared by the JWT filter, cookie helper, device-key filter and outbound API clients. */
public final class SecurityConstants {
    private SecurityConstants() {}

    public static final String AUTHORIZATION_HEADER = "Authorization";

    /** Compare case-insensitively with {@code regionMatches(true, 0, BEARER_PREFIX, 0, BEARER_PREFIX.length())}. */
    public static final String BEARER_PREFIX = "Bearer ";

    /** Principal name Spring Security gives an unauthenticated request. */
    public static final String ANONYMOUS_USER = "anonymousUser";

    /** Role a new or role-less account falls back to: the customer ({@code UserRole.ROLE_PILOT}). A literal so
     * annotations can use it; SecurityConstantsTest keeps it equal to the enum. */
    public static final String DEFAULT_ROLE = "ROLE_PILOT";
}
