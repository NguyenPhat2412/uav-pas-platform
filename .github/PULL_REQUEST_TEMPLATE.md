## Tóm tắt thay đổi

### Phạm vi ảnh hưởng
- [ ] `customer/` (Trang chủ công khai & Cổng Khách hàng `:3100`)
- [ ] `operations/` (Cổng Vận hành, Trạm mặt đất & Mô phỏng bay `:3200`)
- [ ] `admin/` (Cổng Quản trị hệ thống `:3300`)
- [ ] `mobile/` (Ứng dụng di động React Native Expo SDK 54)
- [ ] `backend/` (Spring Boot 4.1 API & Flyway Migration)
- [ ] `edge/kv260/` (KV260 Edge Gateway)

### Danh sách kiểm tra bắt buộc
- [ ] Đã chạy `npm run architecture:check && npm run typecheck && npm run lint && npm test` trên các cổng bị ảnh hưởng (`customer`, `operations`, `admin`, `mobile`).
- [ ] Đã chạy `cd mobile && npm run sync:shared -- --check` đảm bảo đồng bộ contract giữa Web và Mobile.
- [ ] Đã chạy `cd backend && ./mvnw spotless:check` không có lỗi định dạng Java.
- [ ] Mọi endpoint mới đều được khai báo tập trung trong `ApiRoutes.java` và `src/lib/api/routes.ts` (`API_ROUTES`).
