# M2 Component Reuse Report

| Reused area | Source pattern | Operations use |
| --- | --- | --- |
| Shell | `frontend/src/components/layout/AppShell.tsx` | App-local permission-aware Operations navigation |
| Data | `DataTable`, `Drawer`, `WorkspaceState` | Stations, UAVs, inventory, media, audit tables and states |
| Operations | `StationPanel`, `UavPanel`, `EquipmentPanel`, `MediaPanel`, `AuditPanel` | Canonical resource routes |
| Missions | `MissionList`, `MissionStatusBadge`, mission hooks/service | Dispatch and assigned mission workspaces |
| Auth | `AuthContext`, `LoginForm`, `AuthSidebar` | Login and interim bearer session |
| Visuals | `UavModelViewer` | On-demand reference viewer on UAV detail drawer |

No new design-system package was added. Shared packages are consumed through the existing workspace contracts; app-specific UI remains local to avoid changing legacy behavior.
