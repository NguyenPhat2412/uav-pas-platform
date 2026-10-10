# M3 API / Permission Matrix

Baseline `6ecc85111a28e53679b2a6d8ac7ec93730d80be4`. Authorization remains server-side via Spring Security `@PreAuthorize`; Admin visibility is a convenience only.

| API | Method | Admin use | Backend permission |
|---|---|---|---|
| `/api/v1/dashboard/summary` | GET | dashboard metrics | `DASHBOARD_READ` |
| `/api/v1/users` | GET | list/search/filter users | `USER_READ` |
| `/api/v1/users/{id}` | GET | user detail | `USER_READ` |
| `/api/v1/users/{id}/lock` | POST | lock account | `USER_MANAGE` |
| `/api/v1/users/{id}/unlock` | POST | unlock account | `USER_MANAGE` |
| `/api/v1/users/{id}/role` | PUT | update role | `USER_MANAGE` |
| `/api/v1/permissions` | GET | registry | `PERMISSION_MANAGE` |
| `/api/v1/permissions/users/{id}` | GET | explicit overrides | `PERMISSION_MANAGE` |
| `/api/v1/permissions/users/{id}/{code}` | PUT | ALLOW/DENY override | `PERMISSION_MANAGE` |
| `/api/v1/permissions/users/{id}/{code}` | DELETE | clear override / inherit | `PERMISSION_MANAGE` |
| `/api/v1/role-templates` | GET | role templates | `PERMISSION_MANAGE` |
| `/api/v1/role-templates/{role}/permissions/{code}` | PUT | grant/revoke template code | `PERMISSION_MANAGE` |
| `/api/v1/audit-logs` | GET | paged audit list | `AUDIT_READ` |
| `/api/v1/permissions/me` | GET | current-session effective permissions | authenticated |

No Admin endpoint changes were made. API writes are sequential and report partial success because the backend has no bulk atomic update endpoint.
