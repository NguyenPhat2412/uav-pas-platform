# M3 Auth / Security Report

Baseline `6ecc85111a28e53679b2a6d8ac7ec93730d80be4`. M3 uses the existing shared `@uav/api-client` and `AuthContext`; it adds no token format, identity provider, cookie, storage or bypass.

- Unauthenticated portal pages redirect to `/login` through `AdminPage`.
- Permission-aware links and gates are UX controls; backend responses remain authoritative and 401/403 are preserved by the shared client.
- The client uses the approved interim browser session model already used by M1/M2 (`token` and `refreshToken` local storage, refresh and logout through existing endpoints). Full cross-domain SSO is not implemented or claimed.
- Sensitive role, lock/unlock and permission writes require explicit confirmation. Writes use `retry: false`; partial results are shown without fake rollback.
- Account switching/session changes clear query state through the existing `AuthContext`/shared client events; current-user permission invalidation is targeted after changes.
- No JWT, refresh token, password or sensitive response was logged or placed in source.
- Production dependency audit completed with 0 high-severity production vulnerabilities. The delegated standard scan `715164bc-1b82-43e5-aa9b-052936d4b76e` is still running in discovery (0/478 files closed, no reportable findings yet); this is an incomplete scan, not a clean result.
- Frontend cannot prove direct-API authorization or last-admin behavior; those remain backend test/evidence items. The delegated Codex Security scan from earlier work remains resumable and was not claimed clean/complete.
