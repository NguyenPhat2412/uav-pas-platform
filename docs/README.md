# Tài liệu UAV PAS

## Cấu trúc dự án

```text
uav-pas-platform/
├── backend/        # Spring Boot (Java 21): src/main/java/com/uav/platform/<tầng>/<tính năng>
│   └── infra/ci/   # stack kiểm thử: compose.test.yml (CI, test Postgres/MinIO), compose.e2e.yml (run.py)
├── frontend/       # Next.js: src/{api,hooks,components,types,utils,forms}/<tính năng>, src/app (route)
├── mobile/         # Expo iPhone app cho khách hàng; src/shared/ sinh từ frontend, không sửa tay
├── edge/kv260/     # model AI chạy trên board KV260 (không lưu .xmodel trong git)
├── api-contract/   # openapi.json, Postman collection và script sinh collection
├── deploy/         # docker-compose.prod.yml, nginx, hướng dẫn DEPLOY.md
├── docs/           # tài liệu (bên dưới)
└── docker-compose.yml  # stack chạy local đầy đủ, đọc .env ở gốc
```

## Thư mục tài liệu

| Thư mục | Nội dung | Quy ước tên tệp |
|---|---|---|
| [architecture/](architecture/) | Kiến trúc và thiết kế đang áp dụng | `UPPER_SNAKE.md` |
| [business/](business/) | Đặc tả nghiệp vụ (BA), traceability, hình minh hoạ | `UPPER_SNAKE.md` |
| [specs/](specs/) | Bản thiết kế trước khi làm một tính năng | `YYYY-MM-DD-<tên>-design.md` |
| [plans/](plans/) | Kế hoạch triển khai, mục tiêu, checklist | `YYYY-MM-DD-<tên>.md` |
| [reports/](reports/) | Báo cáo bàn giao, kiểm thử theo từng đợt (M1–M6, docops) | giữ nguyên như lúc viết |
| [screenshots/](screenshots/) | Ảnh giao diện dùng trong tài liệu | `<khu-vực>_<màn-hình>.png` |
| `work/` | Ghi chú và log cục bộ, git bỏ qua | tự do |

`reports/` là tài liệu lịch sử: đường dẫn, cổng và số liệu trong đó đúng tại thời điểm viết. Bằng chứng kiểm thử
(log, JSON, ảnh) nằm trong các thư mục `reports/**/evidence/` trên máy và không lưu trong git; bản đầy đủ có trong
lịch sử git đến commit `79d877e`.

## Chạy local

| Thành phần | Địa chỉ |
|---|---|
| Website, cổng Khách hàng, Vận hành, Quản trị | http://localhost:3100 |
| Backend | `NEXT_PUBLIC_API_URL` trong `frontend/.env.local` (mẫu: http://localhost:18082) |

Cấu hình riêng tư nằm trong `.env`, `backend/.env`, `frontend/.env.local` và `mobile/.env.development.local`,
git bỏ qua. Tạo từ các tệp `.env.example` tương ứng.

```sh
# Backend
(cd backend; set -a; . ./.env; set +a; ./mvnw spring-boot:run)

# Frontend
cd frontend && npm ci && npm run dev

# Toàn bộ stack bằng Docker, từ gốc dự án
docker compose up -d --build
```

## Kiểm tra

```sh
cd backend  && ./mvnw -B -Duav.build.directory=/tmp/uav-verify test
cd frontend && npm run lint && npm run typecheck && npm test && npm run architecture:check
cd mobile   && npm run typecheck && npm test
```

Stack kiểm thử cô lập: `backend/infra/ci/compose.test.yml` (project `uav-pas-test`, cần các biến `UAV_TEST_*`).
Bộ E2E tạo dữ liệu chỉ chạy trên stack cô lập qua `python3 backend/infra/ci/run.py`, không dùng database chính.
