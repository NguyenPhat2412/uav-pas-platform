# UAV PAS Platform: nhánh `main`

Nền tảng điều phối UAV gồm website công khai và ba cổng Khách hàng, Vận hành, Quản trị. Backend dùng Spring Boot 4.1 (Java 21). Frontend là một ứng dụng Next.js trong `frontend/`.

`main` là nhánh tích hợp. Các nhánh nhóm bên dưới được đồng bộ từ `main`, và mỗi nhánh có README mô tả phần việc của mình.

| Nhánh | Phạm vi |
|---|---|
| `backend` | Controller, service, module weather, kiểm thử Java |
| `frontend` | Cấu trúc thư mục, tầng dữ liệu, component dùng chung |
| `database` | Flyway migration, bảng và cấu hình hệ thống |
| `admin` | Cổng Quản trị |
| `operations` | Cổng Vận hành và trạm mặt đất |
| `customer` | Cổng Khách hàng |
| `ba` | Quy tắc nghiệp vụ và luồng xử lý |
| `testcase` | Bộ kiểm thử và kết quả |

## Các hạng mục đã hoàn thành (31/10/2026)

1. **Chuẩn hoá controller backend.** Các tầng đứng ngang cấp với `common` và `config`, mỗi tầng chia theo tính năng: `controller/<tên>`, `service/<tên>`, `service/impl/<tên>`, `repository/<tên>`, `entity/<tên>`, `dto/{request,response,record}/<tên>`. Toàn bộ đường dẫn REST lấy từ `config/routes/ApiRoutes.java`. Lớp `RestEndpoint` đã bị xoá. Controller chỉ nhận request và gọi service. Ví dụ, controller cảnh báo không còn tự xử lý nghiệp vụ, và các quyền quản lý dùng `PERMISSION_MANAGE`.
2. **Sắp xếp lại cấu trúc và tên file frontend.**
   - Chia theo tầng rồi theo tính năng, giống backend: `src/{api,hooks,components,types,utils}/<tên>`.
   - Context chuyển vào `providers/`. Component đặt tên theo PascalCase. Hook dùng chung nằm trong `src/hooks/`.
3. **Chuẩn hoá tầng dữ liệu frontend.**
   - Luồng gọi là Component → hook của feature → `*.api.ts` → `@/lib/api`.
   - Query key có dạng `queryKeys.of(userId, feature, ...)`.
   - Script `check-architecture.mjs` chặn UI import trực tiếp react-query hoặc api client.
4. **Module thời tiết và an toàn bay.**
   - Dự báo lấy từ Open-Meteo hoặc OpenWeatherMap, kèm chỉ số bão từ Kp của NOAA.
   - Kết quả đánh giá là GO, CAUTION, NO_GO hoặc UNAVAILABLE, kèm điểm an toàn và các khung giờ bay đề xuất.
   - API key nhà cung cấp được mã hoá bằng AES-256-GCM.
   - Hệ thống có thể chặn cất cánh khi NO_GO và tạo cảnh báo cho admin.

Kết quả kiểm chứng:

| Phần | Kết quả |
|---|---|
| Backend | 1184 test, 0 lỗi. 191 test được bỏ qua là các test cần Docker |
| Module weather | Độ phủ JaCoCo 99,2% dòng, 96,8% nhánh |
| Frontend | 221/221 test pass, typecheck sạch, kiểm tra kiến trúc OK |

## Chạy và kiểm thử

```bash
# Backend: luôn build ra thư mục riêng để không ghi đè backend/target của server đang chạy
cd backend
./mvnw spotless:apply
./mvnw -B -Duav.build.directory=/tmp/uav-verify verify jacoco:report

# Frontend
cd frontend
npm install
npm run dev              # http://localhost:3100
node --test tests/*.test.mjs && npm run typecheck && npm run architecture:check
```

Biến môi trường mẫu có trong `.env.example`. Hướng dẫn triển khai nằm ở `deploy/DEPLOY.md`, tài liệu chi tiết ở `docs/`.
