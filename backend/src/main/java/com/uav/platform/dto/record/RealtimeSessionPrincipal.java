package com.uav.platform.dto.record;

/** Identity & capability snapshot attached to an upgraded WebSocket session. */
public record RealtimeSessionPrincipal(
        Long userId,
        String username,
        boolean canAdminSupport,
        boolean canManageBilling,
        boolean canAdminMarketplace,
        String initialVisitorToken) {

    public static final String ATTRIBUTE_KEY = "uav.realtime.principal";

    public RealtimeSessionPrincipal(
            Long userId,
            String username,
            boolean canAdminSupport,
            boolean canManageBilling,
            String initialVisitorToken) {
        this(
                userId,
                username,
                canAdminSupport,
                canManageBilling,
                canManageBilling,
                initialVisitorToken);
    }
}
