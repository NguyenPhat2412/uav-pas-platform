# M3 Current Permission Matrix

Source inspected at baseline `6ecc85111a28e53679b2a6d8ac7ec93730d80be4` from `backend/.../modules/user/common/PermissionCode.java` and `IPermissionService`. The registry is backend-owned; Admin renders returned values and does not invent codes.

| Module | Backend codes |
|---|---|
| Identity | `USER_READ`, `USER_MANAGE`, `PERMISSION_MANAGE` |
| Station | `STATION_READ`, `STATION_MANAGE` |
| UAV | `UAV_READ`, `UAV_MANAGE` |
| Inventory | `INVENTORY_READ`, `INVENTORY_MANAGE` |
| Media | `MEDIA_READ`, `MEDIA_MANAGE` |
| Governance | `DASHBOARD_READ`, `AUDIT_READ`, `DASHBOARD_MISSION` |
| Mission | `MISSION_VIEW`, `MISSION_VIEW_ALL`, `MISSION_CREATE`, `MISSION_UPDATE`, `MISSION_CANCEL`, `MISSION_CONFIRM`, `MISSION_REJECT`, `MISSION_ASSIGN_STATION`, `MISSION_ASSIGN_UAV`, `MISSION_ASSIGN_OPERATOR`, `MISSION_START`, `MISSION_RESERVE_EQUIPMENT`, `MISSION_COMPLETE`, `MISSION_STATUS_UPDATE`, `MISSION_MEDIA_VIEW`, `MISSION_MEDIA_UPLOAD`, `MISSION_TIMELINE_VIEW` |

The backend currently has no separate `INVENTORY_STOCK_IN`, `INVENTORY_STOCK_OUT`, `INVENTORY_TRANSFER`, organization, package, payment, quota or settings permission. The UI does not present those fictional controls. `IPermissionService.has` resolves explicit user assignment first, then role-template assignment/default role permissions, and rejects disabled/locked accounts.
