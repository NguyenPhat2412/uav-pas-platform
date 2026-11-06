# Deployment and CI/CD Plan

## Trạng thái thực tế — 06/11/2026

Hệ thống CI/CD trên GitHub Actions đã được thiết lập đầy đủ gồm 5 workflow:

1. **`.github/workflows/ci.yml`** — Cổng kiểm thử toàn diện trên `pull_request` và `push` vào `main`:
   - `frontend-foundation`: ESLint, TypeScript, Architecture Check, API Contract Tests, Production Build.
   - `mobile-foundation`: Kiểm tra đồng bộ hợp đồng chia sẻ (`sync:shared -- --check`), kiến trúc 6 lớp React Native, ESLint, TypeScript và bộ test Mobile.
   - `edge-kv260-foundation`: Kiểm tra cú pháp Python và 14 bài test đơn vị/tích hợp cho cổng Kria KV260 Vitis AI DPU & hàng đợi ngoại tuyến SQLite WAL.
   - `backend-ci`: Spotless formatting + toàn bộ test tích hợp Spring Boot Java 21 trên PostgreSQL & MinIO thật (không cho phép skip test).
   - `dependency-audit` & `browser-e2e`: Kiểm toán lỗ hổng npm không ẩn lỗi và kiểm thử trình duyệt Playwright.
2. **`.github/workflows/backend-persistence.yml`** — Kiểm chứng chuyên sâu tầng lưu trữ Backend.
3. **`.github/workflows/postman-api-tests.yml`** — Kiểm thử hợp đồng 130 API Postman trên PostgreSQL 16.
4. **`.github/workflows/cd-staging-production.yml`** — Quy trình CD hai giai đoạn qua **GitHub Container Registry (GHCR)**:
   - Đóng gói image bất biến `ghcr.io/<owner>/uav-pas-backend:sha-<commit>` kèm metadata phiên bản (`APP_VERSION`, `APP_GIT_COMMIT`, `APP_BUILD_TIME`).
   - Triển khai tự động lên GitHub Environment `staging` (`deploy/docker-compose.ghcr.yml` + `deploy/scripts/remote-deploy.sh`), kiểm tra `/actuator/health` và giao diện web, tự động rollback về `.last-good-release` nếu không đạt.
   - Tạm dừng tại cổng phê duyệt (**Required Reviewers**) của GitHub Environment `production`; sau khi phê duyệt mới chụp bản sao lưu `pg_dump` trước migration và nâng cấp Production (`https://uav.all1.vn`).
5. **`.github/workflows/rollback.yml`** — Công cụ khôi phục khẩn cấp (`workflow_dispatch`) cho `staging` hoặc `production` về bản `previous` hoặc mã commit bất kỳ trên GHCR mà không thực hiện down-migration xóa dữ liệu.

> **Lưu ý kích hoạt hạ tầng:** Các file workflow, Docker Compose GHCR và script tự khôi phục đã có sẵn trên nhánh `main`; quản trị viên cần khai báo khóa `DEPLOY_SSH_HOST` và `DEPLOY_SSH_KEY` trong **GitHub Settings → Environments (`staging`, `production`)** theo mục 11 của [`deploy/DEPLOY.md`](../../deploy/DEPLOY.md) để runner kết nối tới VPS thật.

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
