package com.uav.platform.dto.record.realtime;

/** Identity & capability snapshot attached to an upgraded WebSocket session. */
public record RealtimeSessionPrincipal(
        Long userId,
        String username,
        boolean canAdminSupport,
        boolean canManageBilling,
        String initialVisitorToken) {

    public static final String ATTRIBUTE_KEY = "uav.realtime.principal";
}
