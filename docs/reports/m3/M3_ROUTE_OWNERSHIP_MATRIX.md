# M3 route ownership
Inspected HEAD: 6ecc85111a28e53679b2a6d8ac7ec93730d80be4; branch codex/m1-monorepo-foundation. M1/M2 changes are in this working tree. No merge needed.

| Existing route/component | Admin target | API | Permission | Scope | Dependency | Status / tests | Compatibility |
|---|---|---|---|---|---|---|---|
| frontend/src/app/access-control/page.tsx | /access-control | permissions/users/{id}, users, role-templates | PERMISSION_MANAGE + USER_READ for selection | platform | api-client, query, tokens | implementing staged editor | original preserved |
| embedded access user list | /users, /users/[id] | users, users/{id}, lock, unlock, role | USER_READ / USER_MANAGE | platform | api-client, query | implementing | original preserved |
| access templates | /role-templates | role-templates | PERMISSION_MANAGE | platform | api-client, query | implementing | original preserved |
| access registry | /permissions | permissions | PERMISSION_MANAGE | platform | api-client, query | implementing | original preserved |
| operations dashboard | /dashboard | dashboard/summary | DASHBOARD_READ | platform oversight | api-client, query | implementing | Operations retained |
| operations audit | /audit-logs | audit-logs | AUDIT_READ | platform | api-client, query | implementing read-only | Operations retained |
| frontend/src/app/admin/missions/page.tsx | none (Operations /dispatch/missions) | missions | MISSION_VIEW_ALL and action permissions | dispatch/execution | existing M2 | remains Operations | legacy + M2 alias retained |

Endpoint prefix: /api/v1. Unsupported business/settings/report modules are excluded pending backend support.
