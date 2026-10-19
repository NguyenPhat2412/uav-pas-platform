# Hướng dẫn dự án UAV PAS

Cấu trúc hiện hành ngày 18/10/2026:

```text
uav-pas-platform/
├── frontend/     # một Next app: src/app, src/features, public, tests
├── backend/      # Spring Boot, hạ tầng và công cụ kiểm thử
└── docs/         # architecture, handoff, tasks, work (cục bộ)
```

Các mục ẩn Git và cấu hình công cụ vẫn ở gốc. Cài npm trong `frontend`, không cài ở gốc. Kiến trúc frontend duy nhất được mô tả trong [FRONTEND_STRUCTURE.md](architecture/FRONTEND_STRUCTURE.md).

## Phiên localhost (18/10/2026)

Tất cả máy chủ chạy mã nguồn tại `/Volumes/D/Codex/projects/uav-pas-platform`. Đường dẫn chat cũ `/Volumes/D/uav_platform` hiện là liên kết tới chính thư mục này, không phải một bản dự án khác.

| Thành phần | Địa chỉ |
|---|---|
| Website công khai | http://localhost:3100 |
| Khách hàng | http://localhost:3100/customer/login |
| Vận hành | http://localhost:3100/operations/login |
| Quản trị | http://localhost:3100/admin/login |
| Trạng thái backend | http://localhost:18082/actuator/health |

Frontend hiện chạy một ứng dụng; không còn runtime legacy. Backend canonical được luồng phụ trách backend xác nhận 771 kiểm thử đạt, không bỏ qua; runtime ngày 18/10 ở `docs/work/backend-runtime-20261018/`.

Cổng frontend là 3100, backend là 18082. PostgreSQL cục bộ ở 5500; MinIO ở 9034/9035. Database đang dùng là `uav_pas_integrated_20261017`, đã tiếp nhận và đối chiếu đủ 22 bảng/117 dòng gốc trước khi mở dịch vụ. Database cũ `uav_pas_dev` và volume MinIO gốc được giữ nguyên. Kho dữ liệu không chứa các nhiệm vụ/tệp thử nghiệm từ bản preview.

Sao lưu mã nguồn, cấu hình, Git, PostgreSQL và toàn bộ MinIO đã được kiểm chứng phục hồi; danh mục nằm tại `docs/work/main-activation-20261017/BACKUP-INDEX.json`, hướng dẫn phục hồi tại `RECOVERY.md` cùng thư mục. Không chuyển ngược database khi đã có dữ liệu mới mà chưa sao lưu và đối chiếu phần phát sinh. Hai tài khoản quản trị/vận hành cục bộ mới nằm trong tệp riêng tư `docs/work/main-activation-20261017/local-operator-accounts.private.json`; tài khoản cũ giữ nguyên. Webhook gửi ra ngoài đang tắt cho đến khi có đích nhận thật được cấu hình.

Cấu hình riêng tư nằm trong `.env`, `backend/.env` và `frontend/.env.local`, được Git bỏ qua. Máy chủ đang được giữ chạy; thông tin tiến trình nằm trong `docs/work/local-runtime/`, log của phiên hợp nhất nằm trong `docs/work/main-activation-20261017/`.

Để chạy lại backend sau khi chủ động dừng phiên cũ, từ gốc dự án:

```sh
(cd backend; set -a; . ./.env; set +a; ./mvnw spring-boot:run)
```

## Cài và chạy frontend

Từ gốc dự án:

```sh
cd frontend
npm ci
# Tạo .env.local theo .env.example nếu chưa có.
npm run dev
```

Bản production: `npm run build` rồi `npm start`. Chỉ cần một terminal cho frontend. Tất cả khu vực dùng cùng origin 3100; không chạy lại các cổng 3101, 3102, 3103, 3300.

`frontend/.env.local` chứa `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_ENVIRONMENT`. Với máy hiện tại, API là `http://localhost:18082`; website là `http://localhost:3100`.

## Chạy backend và Docker

Backend giữ nguyên đường dẫn và lệnh:

```sh
cd backend
./mvnw spring-boot:run
```

Từ gốc dự án, lệnh Compose mới là:

```sh
docker compose --env-file .env -f backend/docker-compose.yml up -d --build
```

Chuẩn bị `.env` ở gốc và `backend/.env` từ các mẫu tương ứng như trước khi dùng Compose. Compose build frontend một ứng dụng từ `frontend/Dockerfile`. Tên Compose project mặc định được giữ là `uav-pas-platform` để tiếp tục dùng đúng volume PostgreSQL và MinIO. Nếu trước đây dùng `-p <tên-riêng>`, tiếp tục dùng tên đó.

Build một ứng dụng mới từ gốc dự án:

```sh
docker build -f frontend/Dockerfile -t uav-frontend frontend
```

Stack kiểm thử cô lập nằm tại `backend/docker-compose.stabilization.yml`; tiếp tục truyền các biến `UAV_TEST_*` và tên project kiểm thử riêng như trước.

## Kiểm tra

```sh
cd frontend
npm run lint
npm run typecheck
npm test
npm run build
npm run architecture:check
cd ../backend
./mvnw test
```

Đã sửa bộ lệnh `node`, `npm`, `npx` trong `/Volumes/D/Codex/tools/bin` để dùng Node 22.23.2 và npm 10.9.8 có sẵn. Không cần chỉnh PATH mỗi lần. Terminal tương tác vẫn dùng Node 20.20.2 qua NVM theo cấu hình hiện có; cả hai môi trường đã được kiểm tra chạy npm/npx thành công.

## Phối hợp và tài liệu lịch sử

Mọi luồng làm việc trên `/Volumes/D/Codex/projects/uav-pas-platform`. Mã frontend mới chỉ nằm trong `frontend/src`; xem [ánh xạ route](architecture/FRONTEND_ROUTE_MIGRATION.md). Không khôi phục `apps`, `packages`, `legacy`, không sửa management-shop.

Bản sao frontend trước hợp nhất và patch Git nằm ở `docs/work/frontend-unification-20261018/`; mã cũ đã đưa vào `retired/`, không thuộc source/build. Dữ liệu backend và object storage không được thay đổi bởi đợt sắp xếp frontend.

Các báo cáo trước 18/10 có thể ghi đường dẫn/cổng cũ. Chúng là tài liệu lịch sử; không chạy script lịch sử mà chưa đối chiếu cấu trúc mới. Bộ E2E tạo dữ liệu chỉ chạy trên stack cô lập qua `python3 backend/infra/ci/run.py`, không dùng DB chính.
