package com.uav.platform.enums.auth;

import java.util.Locale;

/**
 * Which kind of app holds a session. Each user keeps one refresh token per kind, so the web portal and
 * the mobile app stay signed in side by side. Apps announce themselves with the {@code X-Client} header;
 * anything else (browsers included) is {@link #WEB}.
 */
public enum ClientKind {
    WEB,
    IOS,
    ANDROID;

    public static final String HEADER = "X-Client";

    public static ClientKind fromHeader(String value) {
        if (value == null || value.isBlank()) return WEB;
        try {
            return valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException unknown) {
            return WEB;
        }
    }
}
