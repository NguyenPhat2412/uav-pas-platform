# UAV PAS Platform: nhánh `main`

Nền tảng điều phối UAV gồm website công khai, ba ứng dụng cổng Web độc lập ở cấp thư mục cao nhất (`customer/`, `operations/`, `admin/`) và ứng dụng di động (`mobile/`). Backend dùng Spring Boot 4.1 (Java 21).

`main` là nhánh tích hợp. Các nhánh nhóm bên dưới được đồng bộ từ `main`, và mỗi nhánh tương ứng trực tiếp với thư mục dịch vụ cấp cao nhất để dễ quản lý:

| Nhánh / Thư mục | Phạm vi | Cổng mặc định |
|---|---|---|
| `backend/` (`backend`) | Controller, service, module weather, mô phỏng bay, kiểm thử Java | `:8080` |
| `customer/` (`customer`) | Website công khai (`/`) và Cổng Khách hàng (`/customer/*`) | `:3100` |
| `operations/` (`operations`) | Cổng Vận hành, điều phối trạm mặt đất và mô phỏng bay (`/operations/*`) | `:3200` |
| `admin/` (`admin`) | Cổng Quản trị hệ thống (`/admin/*`) | `:3300` |
| `mobile/` | Ứng dụng di động React Native (Expo SDK 54) cho 3 vai trò | `:8081` |
| `database` | Flyway migration, bảng và cấu hình hệ thống | `:5500` |
| `ba` | Quy tắc nghiệp vụ và luồng xử lý | — |
| `testcase` | Bộ kiểm thử và kết quả | — |

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
| Backend | 1184+ test, 0 lỗi (kèm 32/32 test mô phỏng bay & năng lực nâng cao) |
| Module weather | Độ phủ JaCoCo 99,2% dòng, 96,8% nhánh |
| Cổng Customer (`customer/`) | 60/60 test pass, typecheck & lint sạch, kiểm tra kiến trúc OK (31 route, 373 file nguồn cô lập) |
| Cổng Operations (`operations/`) | 54/54 test pass, typecheck & lint sạch, kiểm tra kiến trúc OK (25 route, 354 file nguồn cô lập) |
| Cổng Admin (`admin/`) | 143/143 test pass, typecheck & lint sạch, kiểm tra kiến trúc OK (51 route, 438 file nguồn cô lập) |
| Mobile (`mobile/`) | 29/29 test pass, đồng bộ 64 file dùng chung, typecheck & lint sạch |

## Chạy và kiểm thử

```bash
# Backend: luôn build ra thư mục riêng để không ghi đè backend/target của server đang chạy
cd backend
./mvnw spotless:apply
./mvnw -B -Duav.build.directory=/tmp/uav-verify verify jacoco:report

# 3 Cổng Web độc lập (Customer :3100, Operations :3200, Admin :3300)
cd customer && npm run dev     # http://localhost:3100
cd operations && npm run dev   # http://localhost:3200
cd admin && npm run dev        # http://localhost:3300

# Kiểm thử từng cổng
for p in customer operations admin; do
  (cd "$p" && npm run architecture:check && npm run typecheck && npm run lint && npm test)
done
```

Biến môi trường mẫu có trong `.env.example`. Hướng dẫn triển khai nằm ở `deploy/DEPLOY.md`. Cấu trúc thư mục, quy ước đặt tên tài liệu và cách chạy kiểm thử nằm ở [docs/README.md](docs/README.md).
