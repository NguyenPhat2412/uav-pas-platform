# Hướng dẫn dự án UAV PAS

Cấu trúc hiện hành sau khi sắp xếp ngày 17/10/2026:

```text
uav-pas-platform/
├── frontend/
│   ├── apps/          # web, customer, operations, admin
│   ├── packages/      # thư viện dùng chung
│   ├── tests/         # kiểm thử các ứng dụng và thư viện
│   ├── legacy/        # giao diện cũ, giữ nguyên chức năng
│   ├── node_modules/  # thư viện của workspace frontend
│   └── package.json
├── backend/
│   ├── src/
│   ├── scripts/
│   ├── docker-compose.yml
│   └── docker-compose.stabilization.yml
└── docs/
    ├── architecture/
    ├── handoff/
    ├── tasks/
    └── work/          # tệp tạm cục bộ, được Git bỏ qua
```

Các mục ẩn `.git`, `.github`, `.gitignore`, `.env.example` và cấu hình công cụ vẫn ở gốc. Không chạy `npm install` ở gốc: cài thư viện trong `frontend` hoặc `frontend/legacy` để không tạo lại `node_modules` bên ngoài.

## Phiên localhost đang chạy (17/10/2026)

Tất cả máy chủ chạy mã nguồn tại `/Volumes/D/Codex/projects/uav-pas-platform`. Đường dẫn chat cũ `/Volumes/D/uav_platform` hiện là liên kết tới chính thư mục này, không phải một bản dự án khác.

| Thành phần | Địa chỉ |
|---|---|
| Website công khai | http://localhost:3100 |
| Khách hàng | http://localhost:3101/login |
| Vận hành | http://localhost:3102/login |
| Quản trị | http://localhost:3103/login |
| Giao diện cũ | http://localhost:3300/login |
| Trạng thái backend | http://localhost:18082/actuator/health |

Phiên chính hiện chạy bản hợp nhất đã sửa webhook/media và chuẩn hóa backend: 726 kiểm thử backend đạt, 130 thao tác API giữ nguyên giao tiếp, năm giao diện được dựng thành công. Frontend chạy bản production; backend chạy từ artifact đã kiểm chứng trong `docs/work/main-activation-20261017/release-refactored`.

Các cổng 3000 và 8080 đang được dự án khác sử dụng, nên phiên này dùng 3300 cho legacy và 18082 cho backend. PostgreSQL cục bộ ở 5500; MinIO ở 9034/9035. Database đang dùng là `uav_pas_integrated_20261017`, đã tiếp nhận và đối chiếu đủ 22 bảng/117 dòng gốc trước khi mở dịch vụ. Database cũ `uav_pas_dev` và volume MinIO gốc được giữ nguyên. Kho dữ liệu không chứa các nhiệm vụ/tệp thử nghiệm từ bản preview.

Sao lưu mã nguồn, cấu hình, Git, PostgreSQL và toàn bộ MinIO đã được kiểm chứng phục hồi; danh mục nằm tại `docs/work/main-activation-20261017/BACKUP-INDEX.json`, hướng dẫn phục hồi tại `RECOVERY.md` cùng thư mục. Không chuyển ngược database khi đã có dữ liệu mới mà chưa sao lưu và đối chiếu phần phát sinh. Hai tài khoản quản trị/vận hành cục bộ mới nằm trong tệp riêng tư `docs/work/main-activation-20261017/local-operator-accounts.private.json`; tài khoản cũ giữ nguyên. Webhook gửi ra ngoài đang tắt cho đến khi có đích nhận thật được cấu hình.

Cấu hình riêng tư nằm trong `.env`, `backend/.env` và `frontend/**/.env.local`, được Git bỏ qua. Máy chủ đang được giữ chạy; thông tin tiến trình nằm trong `docs/work/local-runtime/`, log của phiên hợp nhất nằm trong `docs/work/main-activation-20261017/`.

Để chạy lại backend sau khi chủ động dừng phiên cũ, từ gốc dự án:

```sh
(cd backend; set -a; . ./.env; set +a; ./mvnw spring-boot:run)
```

Chạy lại từng giao diện từ gốc (mỗi lệnh ở terminal riêng):

```sh
npm --prefix frontend/apps/web run start -- --hostname 127.0.0.1 --port 3100
npm --prefix frontend/apps/customer run start -- --hostname 127.0.0.1 --port 3101
npm --prefix frontend/apps/operations run start -- --hostname 127.0.0.1 --port 3102
npm --prefix frontend/apps/admin run start -- --hostname 127.0.0.1 --port 3103
npm --prefix frontend/legacy run start -- --hostname 127.0.0.1 --port 3300
```

Các hướng dẫn cài đặt bên dưới mô tả cấu hình mặc định. Với phiên cục bộ đã cấu hình này, ưu tiên các địa chỉ và lệnh trong phần hiện tại.

## Cài và chạy giao diện

Từ thư mục gốc dự án:

```sh
cd frontend
npm ci
npm ci --prefix legacy
npm run dev             # giao diện cũ: http://localhost:3000
```

Các ứng dụng mới chạy trong các terminal riêng, cùng thư mục `frontend`:

```sh
npm run dev:web          # http://localhost:3100
npm run dev:customer     # http://localhost:3101
npm run dev:operations   # http://localhost:3102
npm run dev:admin        # http://localhost:3103
```

Giữ cấu hình môi trường giao diện cũ tại `frontend/legacy/.env.local`; cấu hình từng ứng dụng tại `frontend/apps/<app>/.env.local`. Dùng các tệp `.env.example` tương ứng làm mẫu. Giao diện vẫn dùng API backend và quyền truy cập như trước.

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

Chuẩn bị `.env` ở gốc và `backend/.env` từ các mẫu tương ứng như trước khi dùng Compose. Cấu hình Compose hiện tại chạy giao diện legacy; bốn ứng dụng mới có Dockerfile riêng. Tên Compose project mặc định được giữ là `uav-pas-platform` để tiếp tục dùng đúng volume PostgreSQL và MinIO. Nếu trước đây dùng `-p <tên-riêng>`, tiếp tục dùng tên đó.

Build một ứng dụng mới từ gốc dự án:

```sh
docker build -f frontend/apps/web/Dockerfile -t uav-web frontend
```

Stack kiểm thử cô lập nằm tại `backend/docker-compose.stabilization.yml`; tiếp tục truyền các biến `UAV_TEST_*` và tên project kiểm thử riêng như trước.

## Kiểm tra

```sh
cd frontend
npm run lint
npm run typecheck
npm test
npm run build
npm run lint:legacy
npm run typecheck:legacy
npm run test:legacy
npm run build:legacy
cd ../backend
./mvnw test
```

Đã sửa bộ lệnh `node`, `npm`, `npx` trong `/Volumes/D/Codex/tools/bin` để dùng Node 22.23.2 và npm 10.9.8 có sẵn. Không cần chỉnh PATH mỗi lần. Terminal tương tác vẫn dùng Node 20.20.2 qua NVM theo cấu hình hiện có; cả hai môi trường đã được kiểm tra chạy npm/npx thành công.

## Ánh xạ cho các luồng đang làm việc

| Đường dẫn cũ | Đường dẫn hiện tại |
|---|---|
| `apps/` | `frontend/apps/` |
| `packages/` | `frontend/packages/` |
| `tests/` | `frontend/tests/` |
| `frontend/` cũ | `frontend/legacy/` |
| `package*.json`, `tsconfig*.json`, `eslint.config.mjs` ở gốc | `frontend/` |
| `docker-compose*.yml` | `backend/` |
| `tasks/` | `docs/tasks/` |
| `work/` | `docs/work/` |

Luồng “uav pas” tiếp tục xử lý chức năng ở worktree `uav-pas-main-integration` với cấu trúc cũ. Khi tích hợp về bản này, áp dụng ánh xạ trên và giữ cấu hình CI/Next/Docker đã cập nhật. Không tạo lại các thư mục cũ ở gốc.

Báo cáo, bản thiết kế và log trước ngày sắp xếp là tài liệu lịch sử, có thể chứa đường dẫn cũ. Áp dụng bảng ánh xạ khi đọc hoặc chạy lại các script minh chứng cũ; không chạy trực tiếp script lịch sử mà chưa kiểm tra đường dẫn và cổng. Tệp tạm được giữ nguyên nội dung trong `docs/work`.
