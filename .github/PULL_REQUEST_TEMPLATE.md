## Tóm tắt thay đổi (Summary)
- Mô tả ngắn gọn mục đích của Pull Request này.

## Phân hệ ảnh hưởng (Affected Modules)
- [ ] `frontend/apps/web` (Public Portal)
- [ ] `frontend/apps/customer` (Customer Portal)
- [ ] `frontend/apps/operations` (Operations & SAR AI Cockpit)
- [ ] `frontend/apps/admin` (Admin Governance Portal)
- [ ] `frontend/packages/*` (`@uav/api-client`, `@uav/ui`, `@uav/types`, `@uav/auth-contracts`)
- [ ] `backend/` (Spring Boot REST API & Security)
- [ ] `frontend/legacy/` (Unified VJU Portal)

## Danh mục kiểm tra (Checklist)
- [ ] Đã chạy `cd frontend && npm run lint --workspaces && npm run typecheck --workspaces` không có lỗi.
- [ ] Đã chạy bộ kiểm thử kiến trúc `cd frontend && npm run test:contracts` đạt 100% PASS.
- [ ] Mọi endpoint mới đều được khai báo tập trung trong `frontend/packages/api-client/src/routes.ts` (`API_ROUTES`) và gọi qua `apiClient`.
- [ ] (Nếu sửa Backend) Đã chạy `mvn test -B` trong `backend/` đạt 100% PASS (bao gồm `SecurityAuditHardeningTest`).
