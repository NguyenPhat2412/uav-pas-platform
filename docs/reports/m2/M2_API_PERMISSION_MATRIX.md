# M2 API and Permission Matrix

| Module | API surface used | UI permission gate | Backend scope |
| --- | --- | --- | --- |
| Overview | `/api/v1/dashboard`, `/api/v1/dashboard/missions`, stations, UAVs | `DASHBOARD_READ` | Backend response and policy |
| Dispatch | `/api/v1/missions` and mission transition/assignment endpoints | `MISSION_VIEW_ALL` | Mission transition and assignment policy |
| Assigned missions | `/api/v1/missions` | `MISSION_VIEW` | Operator scope is backend authoritative |
| Stations | `/api/v1/stations` | `STATION_READ`; manage actions use `STATION_MANAGE` | Station policy |
| UAVs | `/api/v1/uavs` and history | `UAV_READ`; manage actions use `UAV_MANAGE` | UAV policy |
| Inventory | `/api/v1/inventory` and movement endpoints | `INVENTORY_READ`; mutations use `INVENTORY_MANAGE` | Inventory policy and request IDs |
| Media | `/api/v1/media`, signed upload/download, confirm/delete | `MEDIA_READ`; mutations use `MEDIA_MANAGE` | Media ownership and confirmation policy |
| Audit | `/api/v1/audit-logs` | `AUDIT_READ` | Audit visibility policy |

The matrix records the UI gate only; it does not replace backend authorization.
