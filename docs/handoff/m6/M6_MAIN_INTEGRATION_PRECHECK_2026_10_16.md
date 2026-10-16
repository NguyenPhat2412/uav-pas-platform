# Kiểm tra trước khi đưa hồ sơ khách hàng lên main

**Trạng thái: cần chốt cách tích hợp, chưa thay đổi main.**

- Source đã kiểm chứng và commit: `ba8060f0f39787a32ebaf36c606257a841cda75d`, nhánh `codex/m1-monorepo-foundation`.
- Main mới nhất từ GitHub: `bbcf437591e6d9ab88c4a0dd16e04b49d076c091`. Main có 10 commit riêng; nhánh hiện tại có 16 commit riêng, gồm phần hồ sơ vừa commit.
- Preview bằng `git merge-tree --write-tree origin/main HEAD` chỉ tạo object dự kiến, không merge branch, không sửa working tree/lịch sử. Kết quả: **22 file xung đột**.
- Main đã chuyển browser sang cookie, sửa refresh/logout, bỏ Zalo. Nhánh tính năng đã kiểm chứng dùng JSON bearer/localStorage. Không được tự chọn bỏ một bên khi người dùng yêu cầu giữ auth contract.
- Hai nhánh dùng trùng số migration **V3 và V4** cho nội dung khác nhau (bảo trì/index và hồ sơ/SAR). Cần hợp nhất thành chuỗi migration hợp lệ và kiểm PostgreSQL trước khi đẩy main.
- Không force-push, reset, rebase hoặc deploy. Test 620 backend/92 frontend/15 browser chỉ chứng minh nhánh tính năng, chưa chứng minh bản tích hợp với main.

## Hướng đề xuất

Sau khi được cho phép tích hợp: dùng một nhánh làm việc riêng từ main, giữ auth contract/các tính năng đã có trên main, đưa các sửa nghiệp vụ từ nhánh hiện tại vào, xử lý 22 xung đột và trùng migration, chạy lại đầy đủ FE/BE/browser; chỉ cập nhật main sau khi đạt. Không chạy migration lên dữ liệu thật trong bước này.

Cần xác nhận vì chỉ dẫn trước của người dùng cấm merge và yêu cầu báo trước khi auth contract khác dự kiến; đây không phải hạn chế từ công cụ hay skill.

## File xung đột trong preview

- apps/admin/src/components/layout/AppShell.tsx
- apps/customer/app/(portal)/dashboard/page.tsx
- apps/customer/app/(portal)/missions/[id]/page.tsx
- apps/customer/app/(portal)/missions/page.tsx
- apps/customer/app/(portal)/profile/page.tsx
- apps/customer/app/(portal)/services/page.tsx
- apps/customer/app/globals.css
- apps/customer/package.json
- apps/customer/src/components/layout.tsx
- apps/customer/src/components/ui.tsx
- apps/customer/src/features/customer/service.ts
- apps/operations/app/(portal)/overview/page.tsx
- apps/operations/app/globals.css
- apps/operations/src/components/layout/AppShell.tsx
- apps/operations/src/features/missions/services/mission.service.ts
- apps/operations/src/features/operations/services/operations.service.ts
- backend/src/main/java/com/uav/platform/modules/mission/service/impl/IMissionService.java
- backend/src/main/java/com/uav/platform/modules/user/service/impl/IAuthService.java
- backend/src/test/java/com/uav/platform/modules/user/service/AuthServiceTest.java
- backend/src/test/java/com/uav/platform/stabilization/MigrationUpgradePostgresTest.java
- frontend/src/lib/api.client.ts
- packages/api-client/src/index.ts
