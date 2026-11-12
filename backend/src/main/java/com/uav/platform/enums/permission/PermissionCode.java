package com.uav.platform.enums.permission;

/**
 * Atomic function permissions. The Phase 1 modules follow the permission registry of the Phase 1 BA
 * (section 8.2): one code per function, so an administrator can allow or deny each action on its own.
 * USER_MANAGE is kept for the back-office areas outside Phase 1 (billing, webhooks, system settings).
 */
public enum PermissionCode {
    // User and access
    USER_VIEW,
    USER_CREATE,
    USER_UPDATE,
    USER_LOCK,
    USER_UNLOCK,
    USER_PERMISSION_MANAGE,
    USER_MANAGE,
    // Station
    STATION_VIEW,
    STATION_CREATE,
    STATION_UPDATE,
    STATION_STATUS_UPDATE,
    // UAV
    UAV_VIEW,
    UAV_CREATE,
    UAV_UPDATE,
    UAV_STATUS_UPDATE,
    UAV_MAINTENANCE_VIEW,
    UAV_MAINTENANCE_CREATE,
    UAV_MAINTENANCE_UPDATE,
    // Inventory
    INVENTORY_VIEW,
    INVENTORY_ITEM_CREATE,
    INVENTORY_ITEM_UPDATE,
    INVENTORY_STOCK_IN,
    INVENTORY_STOCK_OUT,
    INVENTORY_RESERVE,
    INVENTORY_RELEASE,
    INVENTORY_TRANSFER,
    INVENTORY_HISTORY_VIEW,
    // Media
    MEDIA_VIEW,
    MEDIA_UPLOAD,
    MEDIA_DOWNLOAD,
    MEDIA_DELETE,
    // Dashboard (one code per area, BA 14.3)
    DASHBOARD_VIEW,
    DASHBOARD_USER,
    DASHBOARD_UAV,
    DASHBOARD_STATION,
    DASHBOARD_INVENTORY,
    DASHBOARD_MISSION,
    // Audit
    AUDIT_VIEW,
    // Mission (Phase 2)
    MISSION_VIEW,
    MISSION_VIEW_ALL,
    MISSION_CREATE,
    MISSION_UPDATE,
    MISSION_CANCEL,
    MISSION_CONFIRM,
    MISSION_REJECT,
    MISSION_ASSIGN_STATION,
    MISSION_ASSIGN_UAV,
    MISSION_ASSIGN_OPERATOR,
    MISSION_START,
    MISSION_RESERVE_EQUIPMENT,
    MISSION_COMPLETE,
    MISSION_STATUS_UPDATE,
    MISSION_MEDIA_VIEW,
    MISSION_MEDIA_UPLOAD,
    MISSION_TIMELINE_VIEW
}
