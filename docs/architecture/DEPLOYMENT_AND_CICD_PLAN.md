# Deployment and CI/CD Plan

## Trạng thái thực tế — 17/10/2026

Workflow `.github/workflows/m1-foundation.yml` hiện có năm job: workspace, legacy, backend, audit và browser. Backend dùng PostgreSQL/MinIO riêng, từ chối test bị skip; browser chạy bản dựng production và chỉ xuất evidence đã lọc bí mật. Cleanup lỗi giữ dấu sở hữu để bước dự phòng tiếp tục dọn. Hai nhánh lỗi này đã có 8 kiểm thử mock PASS và review PASS/APPROVE. Đây là cấu hình đã triển khai trong source, **chưa phải hosted CI thành công cho các thay đổi chưa commit**.

Portable run5 đã thực thi 16 browser checks và 12 runner checks, gồm restart vật lý, retry bền vững, named-volume persistence, restore database/object có kiểm hash và rollback về artifact cũ. Nguồn run5 là frozen725 trước refactor; bằng chứng 726 test/445 hash và browser cuối sau refactor được giữ riêng. Không thực hiện down-migration hoặc coi rollback artifact là quyền xóa dữ liệu.

Bản hiện tại đã chạy trên localhost sau backup toàn bộ và restore verification, giữ database gốc. Production dependency audit là 0 cho cả root và legacy; full audit còn 5 HIGH mỗi cây ở dev toolchain. Không bỏ qua finding hoặc nâng major tùy ý. HTTPS staging chưa có, full security coverage và hosted CI còn thiếu; trạng thái sản xuất **NOT_READY**. Các mục image publishing, staging promotion, CDN và domain bên dưới là kế hoạch, không phải hạng mục đã nghiệm thu.

Xem [báo cáo kiểm chứng hiện tại](../handoff/m6/M6_FULL_PRIORITIES_2026_10_17.md) và [portable CI/recovery](../handoff/m6/PORTABLE_CI_AND_RECOVERY.md).

> Cập nhật 16/10/2026: main đã có cookie auth. Workflow hiện kiểm bốn apps/shared, legacy và đầy đủ Maven Java 21 với PostgreSQL/MinIO disposable. Các bước staging/promotion/image publish bên dưới vẫn là kế hoạch, chưa triển khai production trong lượt tích hợp. Xem [báo cáo tích hợp](../handoff/m6/M6_MAIN_INTEGRATION_2026_10_16.md); không giả định đã có cờ rollback tắt cookie.

## Build units

Build and deploy four artifacts independently from one repository:

```text
web         -> www.uavpas.example
customer    -> customer.uavpas.example
operations  -> ops.uavpas.example
admin       -> admin.uavpas.example
```

Each app uses Next standalone output and has its own image/tag, health check, environment binding, CDN/cache policy and rollback target. The backend image and database lifecycle remain separate and unchanged.

The current baseline has one `frontend/legacy/Dockerfile`, one Compose `frontend` service in `backend/docker-compose.yml`, a build-time `NEXT_PUBLIC_API_URL` argument and a default `3000` host port. M1 introduces four equivalent build units alongside that service; the legacy service remains available until M6 proves parity.

## Environment contract

Every app receives only public, validated values at build/runtime:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | existing Spring Boot API origin |
| `NEXT_PUBLIC_APP_URL` | canonical app URL and safe return target |
| `NEXT_PUBLIC_AUTH_ORIGIN` | central web/login origin |
| `NEXT_PUBLIC_APP_ID` | `web`, `customer`, `operations` or `admin` |
| `NEXT_PUBLIC_ENVIRONMENT` | local, staging or production |

JWT secrets, database credentials, storage keys and signing secrets remain backend/deployment secrets. They never enter `NEXT_PUBLIC_*` or shared packages.

The local backend CORS default includes localhost ports 3000 and 3100–3103. Staging and production must replace it with an exact comma-separated allowlist for the four app origins and the selected auth callback origin; a wildcard is not a valid migration shortcut for credentialed requests.

## CI pipeline

1. Install from `frontend/package-lock.json` with `npm ci` in `frontend/`; install the independent legacy app with `npm ci --prefix legacy`.
2. Determine changed apps/packages; changes to a shared package fan out to all consuming apps.
3. Run package lint/typecheck/unit tests.
4. Run each affected app lint/typecheck/test/build independently.
5. Run backend tests unchanged for frontend-only changes; run full integration/security checks when API/auth contracts change.
6. Build immutable image artifacts and publish checksums.
7. Deploy to staging by app, run health and browser smoke, then promote the selected app only.

Required gates: no TypeScript errors, no lint errors, no failing tests, production build success, permission/ownership smoke success and no unreviewed API contract change. Path filters must include shared package consumers and backend auth/CORS changes.

## Runtime routing and redirects

The legacy frontend remains the compatibility host during migration. Reverse proxy rules map old route paths to the new host only after health checks. Preserve query strings for tab, filter and pagination aliases. Use 302 during canary, then 308 after a stable deprecation period. Never redirect an API request to an HTML app.

## Caching and assets

Cache immutable Next static assets by content hash. Do not cache authenticated HTML or API responses at a shared CDN layer without an explicit private/session key. Signed media URLs retain backend/storage expiry and are never placed in Query cache. App-specific image/font policies remain in each app's Next config but use shared design tokens.

## Observability and rollback

Tag logs and browser errors with `app_id`, release SHA and environment. Track legacy-route hits, 401/403/409 rates, refresh failures, API latency and build artifact health separately per app. A rollback is a routing/image selection change: restore the previous app artifact, restore the matching verified auth configuration if needed, keep database and refresh data, and leave backend APIs untouched.

## Deployment acceptance

- Each app can be built and started without the other three source trees.
- Each app has a distinct hostname and health check.
- A package change rebuilds all consumers.
- A backend outage shows a recoverable error state, not fake data.
- Authenticated data is never served from a public cache.
- Staging proves login, refresh, logout, permission denial, ownership scope, signed media and deep-link refresh for all four hosts.
