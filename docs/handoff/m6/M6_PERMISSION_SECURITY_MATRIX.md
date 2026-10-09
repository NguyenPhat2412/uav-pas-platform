# M6 permission and security matrix

**Status: PARTIAL / direct API runtime NOT_VERIFIED.** Backend unit/integration tests pass, but the live API port was occupied by an unrelated Expo process, and no synthetic credentials were supplied for a real multi-user browser/API run.

| Area | Expected authority | Current evidence | Status |
|---|---|---|---|
| Portal page entry | AuthProvider + PageGuard | Unauthenticated customer/operations/admin routes redirect to login | VERIFIED for browser guard |
| Effective permissions | Backend /api/v1/permissions/me | Query is keyed by user id and refreshed; backend permission tests pass | CODE VERIFIED; live API NOT_VERIFIED |
| Customer mission scope | Backend owner scope | Customer client uses owner-safe mission endpoints; backend mission tests pass | CODE/UNIT VERIFIED; CUSTOMER_A/B E2E NOT_VERIFIED |
| Admin mutations | Backend permission checks | Admin uses shared API client and backend permission integration tests pass | CODE/UNIT VERIFIED; live 403 NOT_VERIFIED |
| Permission revoke | Backend effective permission refresh | Query invalidation and cache reset path exists | CODE VERIFIED; direct API/browser NOT_VERIFIED |
| Locked account | Backend auth state | Backend auth tests cover lockout/rejection | UNIT VERIFIED; live runtime NOT_VERIFIED |
| Cross-user direct ID | Backend ownership | No credentials/runtime API available for proof | NOT_VERIFIED |

Permission inventory reviewed includes USER_READ/USER_MANAGE, PERMISSION_MANAGE, station/UAV/inventory/media/dashboard/audit codes and mission lifecycle codes from the M3 matrix. Frontend gates remain UX only; the backend must remain authoritative.
