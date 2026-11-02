# M2 Operations Route Migration Matrix

| Legacy route | Operations route | Existing UI reused | Backend surface | Permission gate | Status |
| --- | --- | --- | --- | --- | --- |
| `/` | `/overview` | Dashboard panels, KPI/table patterns | `/api/v1/dashboard`, missions dashboard, stations, UAVs | `DASHBOARD_READ` | verified in build |
| `/operations` | `/stations` | `AppShell`, `StationPanel` | `/api/v1/stations` | `STATION_READ` | verified in build |
| `/operations?tab=uavs` | `/uavs` | `UavPanel`, `UavModelViewer` | `/api/v1/uavs` and history | `UAV_READ` | verified in build |
| `/operations?tab=equipment` | `/inventory` | `EquipmentPanel` | `/api/v1/inventory` and movements | `INVENTORY_READ` | verified in build |
| `/operations?tab=media` | `/media` | `MediaPanel` | `/api/v1/media` | `MEDIA_READ` | verified in build |
| `/operations?tab=audit` | `/audit` | `AuditPanel` | `/api/v1/audit-logs` | `AUDIT_READ` | verified in build |
| `/admin/missions` | `/dispatch/missions` | `MissionList`, mission query hooks | `/api/v1/missions` | `MISSION_VIEW_ALL`/backend policy | verified in build |
| `/operator/missions` | `/assigned-missions` | `MissionList`, mission query hooks | `/api/v1/missions` | `MISSION_VIEW`/backend scope | verified in build |
| `/missions/[id]` | `/missions/[id]` | Mission detail workflow | mission detail, timeline, media, assignment endpoints | backend policy | verified in build |
| `/login` | `/login` | Existing login form and auth context | `/api/v1/auth/*`, `/api/v1/permissions/me` | public/auth | verified in build |

Legacy URLs remain available in `frontend/`. Operations aliases redirect to their canonical operations route so bookmarks continue to land in the migrated workspace.
