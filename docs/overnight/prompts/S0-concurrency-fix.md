# Prompt cho phiên S0 — Chặn trùng UAV / kỹ sư / tồn kho (tranh chấp đồng thời)

Bạn là kỹ sư backend của UAV PAS tại `/Users/macbook/HK7/uav-pas-platform/backend`. Đọc trước
`docs/overnight/README.md` (luật chung: git, Maven build riêng, không push/deploy, không tắt server đang chạy).
Chỉ sửa `backend/**`, `api-contract/**`, `docs/overnight/CONTRACT.md`.

## Bối cảnh (đã kiểm tra trong code, không cần khảo sát lại)

- Luồng phân công **nội bộ** đã đúng — dùng làm mẫu: `service/impl/mission/dispatch/MissionDispatchServiceImpl.assignUav`
  khoá đơn → `resources.lockUav(id)` (`SELECT … FOR UPDATE`) → kiểm tra `MissionSpecifications.overlappingUav(...)`
  với `resources.excludedStatuses()` → `409 UAV_TIME_CONFLICT`. Kỹ sư: `MissionResourceServiceImpl.lockOperator`
  + `requireOperatorAvailable` → `409 OPERATOR_TIME_CONFLICT`.
- Tồn kho đã đúng: `InventoryServiceImpl` khoá dòng `Equipment` (`findByIdForUpdate`), `EquipmentOperations.reserve`
  kiểm tra `available >= amount`, DB có `chk_equipment_quantities` (V3) chặn âm, có idempotency theo request id.
- **Lỗ hổng cần sửa**: `service/impl/marketplace/provider/MarketplaceProviderFleetServiceImpl.assignOrder`
  (chủ đội bay phân công kỹ sư + UAV cho đơn chợ dịch vụ) chỉ khoá đơn (`missions.findByIdForUpdate`),
  **không khoá UAV, không kiểm tra trùng giờ UAV, không kiểm tra trùng giờ kỹ sư**. Hậu quả: một UAV hoặc một kỹ sư
  có thể được gán cho hai đơn trùng khung giờ — kể cả bấm lần lượt.
- Không có quy tắc "ai đặt trước được ưu tiên": đặt đơn không giữ tài nguyên; tranh chấp phân xử ở bước phân công,
  ai giành được khoá DB trước thì thắng. **Giữ nguyên hành vi này** (không thêm giữ chỗ tạm khi đặt đơn).

## Việc cần làm (theo thứ tự)

1. **Sửa `assignOrder`** dùng lại đúng các hàm sẵn có, không viết logic trùng giờ mới:
   - Thứ tự khoá giống luồng nội bộ để tránh deadlock: **đơn → UAV → kỹ sư**.
   - Khoá UAV bằng `MissionResourceService.lockUav(uavId)` (inject `MissionResourceService`), giữ các kiểm tra
     hiện có (`requireOwnedUav`, trạng thái MAINTENANCE/INACTIVE).
   - Trùng giờ UAV: `missions.exists(MissionSpecifications.overlappingUav(uavId, resources.excludedStatuses(),
     mission.getStartTime(), mission.getExpectedEndTime()).and(id != mission.getId()))` →
     `SystemException.conflict("Thiết bị bay đã được phân công cho đơn khác trùng khung giờ.", "UAV_TIME_CONFLICT")`.
   - Trùng giờ kỹ sư: khoá kỹ sư bằng `lockOperator`, kiểm tra bằng `MissionSpecifications.overlappingOperator(...)`
     (loại trừ chính đơn này) → `conflict("Kỹ sư đã được phân công cho đơn khác trùng khung giờ.", "OPERATOR_TIME_CONFLICT")`.
     **Không** gọi `requireOperatorAvailable` nguyên trạng nếu nó đòi `ROLE_OPERATOR` mà kỹ sư đội bay có vai trò khác —
     kiểm tra vai trò thực tế của `ProviderPilot`/`demo_pilot` trước, chỉ dùng phần kiểm tra trùng giờ.
   - Hai khoảng giờ chạm mép (đơn A kết thúc 10:00, đơn B bắt đầu 10:00) **được phép** — giữ đúng điều kiện
     `start < otherEnd && end > otherStart` của spec hiện có.
2. **Kiểm tra lại ở `startOrder`** (bắt đầu bay): trước khi chuyển `IN_PROGRESS`, khoá UAV và kiểm tra không có đơn
   khác của cùng UAV đang `IN_PROGRESS` → `409 UAV_IN_USE`. Lý do: đơn đã được phân công trước bản sửa này.
3. **Test** (bắt buộc, chạy trên PostgreSQL thật như `stabilization/StabilizationPostgresTest` — H2 không chứng minh
   được khoá dòng):
   - Tuần tự: phân UAV X cho đơn A (9:00–11:00) rồi đơn B (10:00–12:00) → B nhận 409 `UAV_TIME_CONFLICT`.
   - Chạm mép: A 9:00–10:00, B 10:00–11:00 cùng UAV → cả hai thành công.
   - Đơn A đã `CANCELLED`/`COMPLETED` → không chặn B.
   - Trùng kỹ sư (khác UAV) → 409 `OPERATOR_TIME_CONFLICT`.
   - **Đồng thời**: 2 luồng (`ExecutorService` + `CountDownLatch` cùng xuất phát) phân cùng UAV cho 2 đơn trùng giờ
     → đúng 1 thành công, 1 nhận 409; DB chỉ có 1 đơn giữ UAV đó.
   - **Đồng thời tồn kho**: thiết bị còn 1, 2 luồng cùng giữ 1 → đúng 1 thành công; `available_quantity` = 0,
     `reserved_quantity` = 1, không âm.
   - Khách gọi `assign` / đội bay khác gọi `assign` vẫn 403 như cũ (không phá test IDOR hiện có).
4. **Postman**: thêm vào folder `28. Luồng đặt hàng (E2E Order Flow)` một bước tạo đơn thứ hai trùng giờ và phân cùng
   UAV → assert `409` + `code == "UAV_TIME_CONFLICT"`. Folder phải vẫn xanh toàn bộ trên DB trắng có dev seed.
5. **Hợp đồng**: ghi 3 mã lỗi `UAV_TIME_CONFLICT`, `OPERATOR_TIME_CONFLICT`, `UAV_IN_USE` (HTTP 409, có `message` tiếng
   Việt) vào `docs/overnight/CONTRACT.md` §3 và `api-contract/openapi.json`; ghi `CONTRACT-CHANGED` vào BOARD để S1/S3
   hiển thị đúng thông báo.

## Lệnh kiểm tra (phải xanh trước khi commit)
```
cd backend && ./mvnw -q -Duav.build.directory=/tmp/uav-build-s0 spotless:apply test
```
Không tắt backend đang chạy. Commit: `fix(backend): block double-booking of UAV and pilot in marketplace order assignment`
(+ commit test riêng nếu muốn). Ghi `DONE` kèm hash vào `docs/overnight/BOARD.md`.

## Ngoài phạm vi
Giữ chỗ tạm lúc khách đặt đơn, hàng đợi ưu tiên theo thời điểm đặt, đổi lịch tự động, khoá phân tán nhiều máy chủ.
