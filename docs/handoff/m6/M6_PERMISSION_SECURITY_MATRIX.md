# M6 permission and security matrix

**Status: PASS for isolated synthetic API matrix; browser/staging SSO scope remains PARTIAL.** The backend ran on port 18080 with disposable PostgreSQL/MinIO; no production process was changed.

| Area | Expected authority | Current evidence | Status |
|---|---|---|---|
| Portal page entry | AuthProvider + PageGuard | Unauthenticated customer/operations/admin routes redirect to login | VERIFIED for browser guard |
| Effective permissions | Backend /api/v1/permissions/me | Live `/api/v1/permissions/me` returns 11/14/31 permissions for pilot/operator/admin synthetic users | LIVE VERIFIED |
| Customer mission scope | Backend owner scope | Customer A reads own mission; customer B receives 403; operator/admin scope passes | LIVE VERIFIED for isolated API |
| Admin mutations | Backend permission checks | Admin user list returns 200; pilot/operator user list returns 403 | LIVE VERIFIED |
| Permission revoke | Backend effective permission refresh | Query invalidation and cache reset path exists; live permission revocation was not exercised | CODE VERIFIED; runtime revoke NOT_VERIFIED |
| Locked account | Backend auth state | Backend auth tests cover lockout/rejection; live account locking was not exercised | UNIT VERIFIED; runtime lock NOT_VERIFIED |
| Cross-user direct ID | Backend ownership | Customer B mission/timeline/media/download URL return 403 | LIVE VERIFIED for isolated API |

Permission inventory reviewed includes USER_READ/USER_MANAGE, PERMISSION_MANAGE, station/UAV/inventory/media/dashboard/audit codes and mission lifecycle codes from the M3 matrix. Frontend gates remain UX only; the backend must remain authoritative.
