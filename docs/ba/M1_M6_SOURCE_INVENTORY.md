# UAV PAS — M1–M6 source inventory and traceability seed

Ngày kiểm kê: 2026-10-09  
Source revision: `ba969ac` (docs checkpoint; product source remains based on `ca8a36b`)  
Branch: `codex/m1-monorepo-foundation`

Đây là inventory của source hiện tại để thực hiện T01. Nó chứng minh boundary và điểm nối có thật trong repo; nó không tự biến code thành acceptance VERIFIED. BA gốc đầy đủ chưa có trong repo, vì vậy các status nghiệp vụ vẫn phải đối chiếu với `M1_M6_ACCEPTANCE_BASELINE.md` và evidence tương ứng.

## Application and package boundary

| Surface | Source path | Current role | Traceability status |
|---|---|---|---|
| Public website | `apps/web` | M5 public pages, SEO/CTA and customer entry | Source inventory verified; authenticated/approved content acceptance remains partial |
| Customer portal | `apps/customer` | M4 catalog, mission draft/submit/detail/profile | Source inventory verified; browser business acceptance remains partial |
| Operations portal | `apps/operations` | M2 station/UAV/inventory/mission operations | Source inventory verified; negative/concurrency/browser acceptance remains partial |
| Admin portal | `apps/admin` | M3 users, roles, permissions, audit and administration | Source inventory verified; full CRUD/lock/revoke acceptance remains partial |
| Legacy frontend | `frontend` | Compatibility surface and rollback artifact | Lint/typecheck/test/build PASS; feature parity is not assumed |
| Shared packages | `packages/api-client`, `auth-contracts`, `config`, `design-tokens`, `query`, `types`, `ui` | Cross-app API/auth/config/query/types/UI boundaries | 7 packages found; compile/build PASS, contract acceptance remains partial |

The current monorepo therefore has four new frontend apps, one legacy frontend, one Spring backend and seven shared packages. These are application boundaries, not a microservice decomposition.

## Backend domain inventory

| Domain module | Controllers | Logical services | Main entities | Repositories | Current acceptance evidence |
|---|---|---|---|---|---|
| `user` | Auth, User, Permission, RoleTemplate | Auth, User, Permission, RoleTemplate, RefreshToken, InvalidatedToken, ZaloOAuth | AppUser, Permission, RoleTemplate, RoleTemplatePermission, UserPermission, RefreshToken, InvalidatedToken | 7 | Isolated login/refresh/logout/401/403/role matrix PASS; lock/revoke/runtime browser incomplete |
| `mission` | Mission, UAV service | Mission | Mission, MissionEvent, MissionMedia, MissionEquipmentReservation, UavService | 5 | Isolated create→complete and ownership/media flow PASS; negative/concurrency/full UI incomplete |
| `station` | Station | Station | Station | 1 | Used in isolated assignment PASS; complete CRUD/browser acceptance incomplete |
| `uav` | UAV | UAV | Uav, UavStatusHistory | 2 | Used in isolated assignment PASS; maintenance/history/negative/browser acceptance incomplete |
| `inventory` | Inventory | Inventory | Equipment, InventoryMovement | 2 | Stock-in/reserve path PASS; transfer/retry/concurrency/complete UI acceptance incomplete |
| `media` | Media | Media, MediaAccess, ObjectStorage | MediaAsset | 1 | Signed upload/confirm/download and ownership PASS on MinIO; expiry/persistence/browser acceptance incomplete |
| `audit` | AuditLog | AuditLog | AuditLog | 1 | Admin audit read PASS in isolated flow; completeness/filter/paging acceptance incomplete |
| `dashboard` | Dashboard | Dashboard | Uses domain aggregates | — | Source/controller exists; real-data totals and permission acceptance NOT_VERIFIED |

There are **8 backend domain modules**. The service layer contains **16 logical service contracts and 16 implementations**; the interface/implementation pairing is an internal modular-monolith boundary, not 16 deployable services.

## API/controller inventory

The production backend has 12 controller classes:

- `AuthController`, `UserController`, `PermissionController`, `RoleTemplateController`
- `StationController`, `UavController`, `UavServiceController`
- `InventoryController`, `MissionController`, `MediaController`
- `AuditLogController`, `DashboardController`

The graph currently indexes 128 route nodes across source and generated/test material. Route count is not used as a feature-completion denominator. Each acceptance row must still link actor, permission, state/ownership rule, persistence effect, test and evidence.

## Database and storage boundary

| Artifact | Current source | Status |
|---|---|---|
| Flyway baseline | `backend/src/main/resources/db/migration/V1__baseline_uav_pas.sql` | Present; fresh/upgrade data-preservation acceptance still open |
| Media/inventory follow-up | `backend/src/main/resources/db/migration/V2__media_confirmation_inventory_requests.sql` | Present; checksum/upgrade evidence still open |
| PostgreSQL stabilization | `backend/src/test/java/.../StabilizationPostgresTest.java` | 5 tests PASS in disposable stack |
| MinIO stabilization | `backend/src/test/java/.../StabilizationMinioTest.java` | 1 test PASS in disposable stack |
| Isolated API runtime | `docs/handoff/m6/evidence/tests/m6-current-isolated-runtime.json` | Auth/business/ownership/signed media PASS on disposable services; not persistence/restore proof |

## Test and evidence linkage

- Root workspace: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` — PASS logs under `docs/handoff/m6/evidence/tests/root-*-current.log`.
- Legacy frontend: same four checks — PASS logs under `legacy-*-current.log`.
- Backend: `./mvnw -q test` — 204 tests, 0 failures/errors, 6 skipped; stabilization tests are separate.
- Browser: anonymous/guarded-route smoke PASS; authenticated browser E2E is NOT_VERIFIED.
- Security: 0 reportable findings in five reviewed surfaces, but partial coverage; npm audit has five high dev-toolchain findings.

## T01 gaps that remain explicit

1. The BA source outside this repo has not been supplied or approved; the 32 baseline rows are a draft inventory, not a closed denominator.
2. Every row still needs a small test ID and exact FE route → API method → permission → entity/Flyway → evidence link.
3. Fresh migration, upgrade preservation, restart persistence, backup/restore and concurrency evidence are not complete.
4. Approved SSO/CSRF contract is missing; authenticated multi-origin browser E2E cannot be marked VERIFIED.
5. Hosted CI, staging and rollback evidence are not available in the local checkout.

**T01 status: IN_PROGRESS.** This inventory is the source map for the next vertical slices; it does not claim M1–M6 completion.
