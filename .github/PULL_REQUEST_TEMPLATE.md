## Tóm tắt thay đổi (Summary)
- Mô tả ngắn gọn mục đích của Pull Request này.

## Phân hệ ảnh hưởng (Affected Modules)
- [ ] `frontend/src/features` (chức năng theo nghiệp vụ)
- [ ] `frontend/src/app` (định tuyến public/customer/operations/admin)
- [ ] `frontend/src/components`, `contexts`, `lib`, `styles` (hạ tầng dùng chung)
- [ ] `backend/` (Spring Boot REST API & Security)

## Danh mục kiểm tra (Checklist)
- [ ] Đã chạy `cd frontend && npm run lint && npm run typecheck` không có lỗi.
- [ ] Đã chạy bộ kiểm thử kiến trúc `cd frontend && npm run test:contracts` đạt 100% PASS.
- [ ] Mọi endpoint mới đều được khai báo tập trung trong `frontend/src/lib/api/routes.ts` (`API_ROUTES`) và gọi qua `apiClient`.
- [ ] (Nếu sửa Backend) Đã chạy `mvn test -B` trong `backend/` đạt 100% PASS (bao gồm `SecurityAuditHardeningTest`).
