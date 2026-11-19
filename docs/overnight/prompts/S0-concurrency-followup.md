# Prompt cho phiên S0 — Vá nốt 3 điểm hở sau commit 96a8a6b0 (chặn trùng UAV / kỹ sư)

Bạn là kỹ sư backend UAV PAS tại `/Users/macbook/HK7/uav-pas-platform/backend`. Đọc `docs/overnight/README.md`
(luật git, Maven build riêng, không push/deploy, không tắt server). Chỉ sửa `backend/**`, `api-contract/**`,
`docs/overnight/CONTRACT.md`, `.github/workflows/**` nếu cần.

Commit `96a8a6b0` đã đúng hướng (khoá đơn → UAV → kỹ sư, `UAV_TIME_CONFLICT`, `OPERATOR_TIME_CONFLICT`, `UAV_IN_USE`,
8/8 test PostgreSQL xanh — supervisor đã tự chạy lại). Còn 3 điểm hở và 1 dọn dẹp, làm theo thứ tự:

## 1. `startOrder` tự chọn UAV mà không kiểm tra trùng giờ (ưu tiên cao)
File: `service/impl/marketplace/provider/MarketplaceProviderServiceImpl.java`, đoạn
`if (mission.getUav() == null) { uavs.findByProviderIdOrderByIdDesc(...).filter(AVAILABLE).findFirst()... }`.
Vấn đề: UAV đã được phân cho đơn khác **trùng khung giờ** vẫn ở trạng thái `AVAILABLE` (luồng chợ không đổi trạng
thái khi phân công), nên đơn B có thể lấy mất UAV đã hứa cho đơn A; kiểm tra `UAV_IN_USE` chỉ bắt đơn `IN_PROGRESS`.
Sửa: chỉ nhận ứng viên **không trùng giờ** — với mỗi ứng viên, khoá bằng `resources.lockUav(id)` rồi kiểm tra
`MissionSpecifications.overlappingUav(id, resources.excludedStatuses(), start, end)` loại trừ chính đơn này; lấy ứng
viên đầu tiên đạt. Không có UAV nào trống → `409 NO_UAV_AVAILABLE` ("Không còn thiết bị bay trống trong khung giờ này.").
Giữ nguyên kiểm tra `UAV_IN_USE` hiện có.

## 2. `respond` gán chủ đội bay làm kỹ sư mà không kiểm tra trùng giờ
Cùng file, `if (mission.getOperator() == null) { mission.setOperator(provider.getUser()); }`.
Sửa: khoá bằng `resources.lockOperator(provider.getUser().getId())` và kiểm tra
`MissionSpecifications.overlappingOperator(...)` loại trừ chính đơn → `409 OPERATOR_TIME_CONFLICT` (cùng message như
`assignOrder`). Thứ tự khoá vẫn là đơn → UAV → kỹ sư.

## 3. Gom kiểm tra trùng giờ về một chỗ (dọn dẹp, không đổi hành vi)
Đoạn `missions.exists(overlappingUav(...).and(id != mission.getId()))` + throw đang chép ở `assignOrder`, `respond`
(và sẽ thêm ở `startOrder`); tương tự cho kỹ sư. Thêm vào `MissionResourceService` hai hàm
`requireUavFreeFor(Uav uav, Mission mission)` và `requireOperatorFreeFor(AppUser operator, Mission mission)`
(dùng `excludedStatuses()`, loại trừ chính đơn, ném đúng mã lỗi hiện tại) rồi thay mọi chỗ chép.
Bỏ kiểm tra lặp: `resolveProfile(username).isEmpty()` ngay trước `requireVerifiedProfile(username)` (nếu
`requireVerifiedProfile` đã ném `PROVIDER_PROFILE_REQUIRED` cho cùng trường hợp — kiểm tra trước khi xoá), và kiểm tra
quyền sở hữu UAV bị làm hai lần quanh `lockUav` (giữ một lần, sau khi khoá).

## 4. Test PostgreSQL chạy được ở máy local
CI (`.github/workflows/backend-persistence.yml`) đã đặt `UAV_STABILIZATION_DB_URL` nên `MarketplaceConcurrencyPostgresTest`
chạy trong CI — **không sửa workflow**. Chỉ cần: thêm vào `backend/README.md` (hoặc tài liệu test hiện có) 3 dòng cách
chạy local với Postgres.app cổng 5500 và DB `uav_stabilization`, kèm lệnh
`./mvnw -Dtest='MarketplaceConcurrencyPostgresTest' -Duav.build.directory=/tmp/uav-build-s0 test`.

## Test bắt buộc (thêm vào `MarketplaceConcurrencyPostgresTest` hoặc test tích hợp hiện có)
- Đơn A đã phân UAV X (9:00–11:00, chưa bay); đơn B (10:00–12:00) chưa có UAV, đội chỉ có X → `start` B nhận
  `409 NO_UAV_AVAILABLE`, A vẫn giữ X.
- Đội có X (đã phân cho A trùng giờ) và Y trống → `start` B tự lấy **Y**, không lấy X.
- `respond` hai đơn trùng giờ không chỉ định kỹ sư → đơn thứ hai nhận `409 OPERATOR_TIME_CONFLICT`.
- Chạm mép giờ vẫn được phép; các test cũ (8 test PostgreSQL, test IDOR, `MarketplaceAssignConflictIntegrationTest`)
  vẫn xanh.

## Hợp đồng
Thêm `NO_UAV_AVAILABLE` (409) vào `docs/overnight/CONTRACT.md` §3 và `api-contract/openapi.json`; ghi
`CONTRACT-CHANGED` vào BOARD.

## Lệnh kiểm tra (phải xanh trước khi commit)
```
cd backend && ./mvnw -q -Duav.build.directory=/tmp/uav-build-s0 spotless:apply test
```
và chạy riêng test PostgreSQL với `UAV_STABILIZATION_DB_URL=jdbc:postgresql://127.0.0.1:5500/uav_stabilization`
(cùng USER/PASSWORD như `backend/.env`) — ghi số test xanh vào dòng DONE.
Commit: `fix(backend): check slot overlap when start auto-picks a UAV and when respond defaults the pilot`.
Ghi `DONE` kèm hash vào `docs/overnight/BOARD.md`. Không push, không deploy.

## Ngoài phạm vi
Đổi trạng thái UAV sang `ASSIGNED` khi phân công trong luồng chợ, giữ chỗ khi khách đặt, ưu tiên theo thời điểm đặt.
