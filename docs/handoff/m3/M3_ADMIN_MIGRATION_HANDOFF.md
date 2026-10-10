# UAV PAS M3 — Admin Portal Migration Handoff

Inspected baseline: `6ecc85111a28e53679b2a6d8ac7ec93730d80be4` on `codex/m1-monorepo-foundation`; all M1/M2 changes are uncommitted in this same working tree. No reset, merge, rebase or push was performed. Backend business and permission code were not modified by M3.

## Delivered

- Independent `apps/admin` runtime on port 3103 with AppShell, auth, loading, error and not-found states.
- Permission-aware navigation for Dashboard, Users, Access Control, Role Templates, Permission Registry and Audit Logs.
- Real API-backed user list/search/role filter/pagination, detail, role update, lock and unlock.
- Access control with template, explicit override, effective state and source; staged ALLOW/DENY/inherit changes, review, confirmation, partial failure reporting and targeted refresh.
- Read/write role template editor using the backend's four roles and its actual permission registry.
- Read-only permission registry and audit log pages; dashboard uses real `/api/v1/dashboard/summary` fields and recent audit data.
- Existing Operations mission routes remain owned by `apps/operations`; legacy frontend remains untouched.

## Runtime and verification

`npm run dev --workspace @uav/admin` (port 3103), `npm run build --workspace @uav/admin`, `npm run typecheck --workspace @uav/admin`, `npm run lint --workspace @uav/admin`, and admin structural tests are the required checks. See `M3_TEST_REPORT.md` and `evidence/logs/` for recorded results.

## Scope limits

No supported backend routes were found for organizations, service catalog, packages, payments, quotas, reports or settings, so they are not placed in the admin navigation. Audit has list pagination only because the backend exposes no detail route. Last-login and active-user metrics are omitted because the response does not provide them. Cross-domain SSO is not claimed; the approved interim shared API session architecture remains in use.

## Session C handoff

Target Drive folder: <https://drive.google.com/drive/folders/1XIEMM23_0lirBKT4yXnKVssxLWWK-JSP>. Upload/sync was not performed or verified in this session. New M3 documents are local under `docs/handoff/m3/`.
