## Tóm tắt thay đổi (Summary)
- Mô tả ngắn gọn mục đích của Pull Request này.

## Phân hệ ảnh hưởng (Affected Modules)
- [ ] `apps/web` (Public Portal)
- [ ] `apps/customer` (Customer Portal)
- [ ] `apps/operations` (Operations & SAR AI Cockpit)
- [ ] `apps/admin` (Admin Governance Portal)
- [ ] `packages/*` (`@uav/api-client`, `@uav/ui`, `@uav/types`, `@uav/auth-contracts`)
- [ ] `backend/` (Spring Boot 3 REST API & Security)
- [ ] `frontend/` (Unified VJU Portal)

## Danh mục kiểm tra (Checklist)
- [ ] Đã chạy `npm run lint --workspaces && npm run typecheck --workspaces` không có lỗi.
- [ ] Đã chạy bộ kiểm thử kiến trúc `node --test tests/*.test.mjs` đạt 100% PASS.
- [ ] Mọi endpoint mới đều được khai báo tập trung trong `packages/api-client/src/routes.ts` (`API_ROUTES`) và gọi qua `apiClient`.
- [ ] (Nếu sửa Backend) Đã chạy `mvn test -B` trong `backend/` đạt 100% PASS (bao gồm `SecurityAuditHardeningTest`).
