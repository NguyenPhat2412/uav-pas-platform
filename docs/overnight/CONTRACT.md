# Hợp đồng API — chợ dịch vụ UAV (chủ sở hữu: S0 Backend)

Chỉ S0 sửa file này. Phiên khác cần thay đổi → ghi `REQUEST` trong `BOARD.md`.
Ký hiệu: ✅ đã triển khai trong `ApiRoutes.java` & Backend · 🆕 S0 cần làm · ✏️ đã có nhưng cần sửa.
Mọi danh sách trả về `PageResponse` (`page`, `size`, `totalElements`, `content`) như các API hiện có.
Lỗi trả về `ErrorResponse` hiện có. Mọi số tiền là VND, có nhãn "minh hoạ" phía giao diện.

## 1. Luồng đơn hàng (đơn = `Mission`)

```
Khách đặt  ──►  PENDING_DISPATCH  ──(admin/auto giao)──►  PENDING_PROVIDER
   ──(đội bay nhận / phân công)──►  ACCEPTED/SCHEDULED  ──(start)──►  IN_FLIGHT (mô phỏng)
   ──(complete + tài liệu bàn giao)──►  DELIVERED  ──(khách đánh giá)──►  REVIEWED
Huỷ được trước IN_FLIGHT: CANCELLED.  Đội bay từ chối: quay lại PENDING_DISPATCH.
```

Thanh trạng thái kiểu Shopee phía khách gộp lại 5 nhóm: Chờ xác nhận (`PENDING`) · Chờ bay (`SCHEDULED`) · Đang bay (`IN_FLIGHT`) · Bàn giao (`DELIVERED`) · Đánh giá (`TO_REVIEW`).
✅ `GET /api/v1/orders/summary` → `{ pending, scheduled, inFlight, delivered, toReview }` cho khách đang đăng nhập.

## 2. Khách hàng

| Phương thức | Đường dẫn | Ghi chú |
|---|---|---|
| ✅ GET | `/api/v1/public/marketplace/listings` | Lọc `category` (hoặc `missionType`/`categoryServiceId`), `province`, `q` (hoặc `keyword`), `listingType`, `minPrice`, `maxPrice`, phân trang. **Ẩn tên đội bay**: trả `providerBadge { verified, ratingAvg, reviewCount }` (`providerId`, `providerSlug`, `providerDisplayName` = `null`). |
| ✅ GET | `/api/v1/public/marketplace/listings/{slug}` | Chi tiết dịch vụ công khai, ẩn danh đội bay tương tự danh sách; `/api/v1/public/marketplace/providers/{slug}` trả `404`. |
| ✅ GET/POST | `/api/v1/projects` | Dự án của khách: `name`, `province`, `areaGeoJson?`, `note?`. `GET` trả `PageResponse<ProjectResponse>` (`id, code, name, province, areaGeoJson, note, status, activeSubscriptionCount, missionCount, createdAt, updatedAt`). |
| ✅ GET/PATCH/DELETE | `/api/v1/projects/{id}` | Khóa quyền theo `customerId` (`403 ACCESS_DENIED` nếu khác chủ). `DELETE` = xoá mềm, chặn `409 PROJECT_HAS_ACTIVE_ORDERS` khi còn đơn đang chạy. |
| ✅ GET/POST | `/api/v1/projects/{id}/subscriptions` | "Đăng ký cho dự án": `{ listingId, areaGeoJson?, scheduleType: ONCE|WEEKLY|MONTHLY, startDate, units, note? }`. Tạo subscription **và** đơn `Mission` đầu tiên ở trạng thái `PENDING_DISPATCH` (`providerResponseStatus = PENDING_DISPATCH`). Trả `ProjectSubscriptionResponse` (`id, projectId, projectName, listingId, listingSlug, listingTitle, areaGeoJson, scheduleType, status, startDate, nextRunAt, units, unitPriceVnd, estimatedTotalVnd, firstMissionId, latestMissionId, note, createdAt, updatedAt`). |
| ✅ PATCH/DELETE | `/api/v1/projects/{id}/subscriptions/{subId}` | Đổi lịch / tạm dừng (`status: ACTIVE|PAUSED|ENDED`, `scheduleType`, `startDate`, `units`, `areaGeoJson`, `note`) / huỷ mềm (`DELETE`). |
| ✅ GET | `/api/v1/missions` | Đơn hàng phân trang. Hỗ trợ lọc `projectId`, `providerId` (cho nhân sự có `MISSION_VIEW_ALL` / `MARKETPLACE_MODERATE`), `statusGroup` (`PENDING|SCHEDULED|IN_FLIGHT|DELIVERED|TO_REVIEW`). `MissionResponse` trả thêm `projectId, projectName, subscriptionId, statusGroup, reviewed, assignedUavId, assignedOperatorId` (ẩn `providerId/providerDisplayName` khi người xem là khách hàng). |
| ✅ GET | `/api/v1/orders/{id}/tracking` | Tiến độ bay mô phỏng: `{ missionId, status, statusGroup, progressPct, position: { latitude, longitude, altitudeMeters, headingDeg, speedMs }, battery, link, etaMinutes, updatedAt }` (đọc từ phiên mô phỏng `SimulationService`). |
| ✅ POST | `/api/v1/missions/{id}/cancel` | Huỷ trước khi bay (`IN_PROGRESS`); chặn khi đang bay hoặc đã kết thúc. |
| ✅ POST/PUT | `/api/v1/missions/{id}/review` | Hỗ trợ cả `POST` và `PUT`, nhận `{ rating, comment }` hoặc `{ overallRating, safetyScore, qualityScore, punctualityScore, comment }` → cập nhật `ratingAvg` + `reviewCount` của listing và đội bay. |

## 3. Đội bay (Operations)

| Phương thức | Đường dẫn | Ghi chú |
|---|---|---|
| ✅ GET/POST/PATCH | `/api/v1/marketplace/provider/me` | Hồ sơ + đăng ký đối tác |
| ✅ CRUD | `/api/v1/marketplace/provider/documents` | Giấy tờ xác minh |
| ✅ CRUD | `/api/v1/marketplace/provider/listings` + `/{id}/pause` | Bao gồm `POST /api/v1/marketplace/provider/listings/from-template` tạo listing nhanh từ `ServiceOffering` và `DELETE /api/v1/marketplace/provider/listings/{id}` xoá mềm listing. |
| ✅ CRUD | `/api/v1/marketplace/provider/fleet/uavs`, `/fleet/equipment` | `GET / POST / PATCH / DELETE` cho UAV đội bay (`/{id}` chặn xoá khi UAV đang thuộc đơn chưa kết thúc) và `POST / DELETE` cho thiết bị phụ trợ. |
| ✅ CRUD | `/api/v1/marketplace/provider/pilots` + `/{id}` | Kỹ sư điều khiển của đội (`id, userId, pilotUserId, fullName, email, phone, licenseNumber, specialization, status: AVAILABLE|IN_FLIGHT|OFF_DUTY, assignedUavId, assignedUavModel, completedMissionsCount`). |
| ✅ GET | `/api/v1/marketplace/provider/orders` + `/{missionId}` | Đơn được giao cho đội bay. |
| ✅ POST | `/api/v1/marketplace/provider/orders/{missionId}/respond` | `{ accept: bool, uavId?, reason?, responseNote? }`. Từ chối (`accept: false`) đưa đơn quay về hàng đợi `PENDING_DISPATCH`. Khi nhận đơn (`accept: true`), khoá thứ tự **đơn → UAV (nếu có) → kỹ sư mặc định (chủ đội bay)** (`SELECT … FOR UPDATE`); nếu trùng giờ → `409 UAV_TIME_CONFLICT` hoặc `409 OPERATOR_TIME_CONFLICT`. |
| ✅ POST | `/api/v1/marketplace/provider/orders/{missionId}/assign` | `{ pilotId?, pilotUserId?, uavId, note? }` khoá thứ tự **đơn → UAV → kỹ sư** (`SELECT … FOR UPDATE`), phân công kỹ sư + UAV thuộc đội bay và chuyển đơn sang `READY` (`SCHEDULED`). Khoảng giờ chạm mép (đơn A kết thúc 10:00, đơn B bắt đầu 10:00) được phép; đơn `CANCELLED`/`COMPLETED`/`FAILED`/`REJECTED` không chặn. Mã lỗi xung đột `409`: `UAV_TIME_CONFLICT` (`"Thiết bị bay đã được phân công cho đơn khác trùng khung giờ."`), `OPERATOR_TIME_CONFLICT` (`"Kỹ sư đã được phân công cho đơn khác trùng khung giờ."`). |
| ✅ POST | `/api/v1/marketplace/provider/orders/{missionId}/start` | Khoá **đơn → UAV**. Nếu đơn chưa gán UAV, tự khoá và chọn ứng viên UAV `AVAILABLE` đầu tiên **không trùng khung giờ** và không đang `IN_PROGRESS` (không còn UAV trống → `409 NO_UAV_AVAILABLE`: `"Không còn thiết bị bay trống trong khung giờ này."`). Nếu UAV đã gán đang chạy đơn khác `IN_PROGRESS` → `409 UAV_IN_USE`: `"Thiết bị bay hiện đang thực hiện một chuyến bay khác."`. Sau đó khởi động **phiên mô phỏng** gắn với đơn qua `SimulationService`, đánh dấu UAV `IN_USE`, chuyển đơn sang `IN_PROGRESS` (`IN_FLIGHT`). |
| ✅ POST | `/api/v1/marketplace/provider/orders/{missionId}/complete` | Hoàn tất chuyến bay & mở khóa nghiệm thu bàn giao (`DELIVERED`), trả UAV về `AVAILABLE`. |

**Mã lỗi tranh chấp tài nguyên đội bay (HTTP `409 Conflict`, trả `ErrorResponse` có `code` & `message` tiếng Việt):**
- `UAV_TIME_CONFLICT` — `"Thiết bị bay đã được phân công cho đơn khác trùng khung giờ."`
- `OPERATOR_TIME_CONFLICT` — `"Kỹ sư đã được phân công cho đơn khác trùng khung giờ."`
- `UAV_IN_USE` — `"Thiết bị bay hiện đang thực hiện một chuyến bay khác."`
- `NO_UAV_AVAILABLE` — `"Không còn thiết bị bay trống trong khung giờ này."`

## 4. Nền tảng (Admin — quyền `MARKETPLACE_MODERATE`)

| Phương thức | Đường dẫn | Ghi chú |
|---|---|---|
| ✅ GET/POST | `/api/v1/admin/marketplace/providers` + `/{id}/moderate` | Duyệt đội bay |
| ✅ GET/POST | `/api/v1/admin/marketplace/listings` + `/{id}/moderate` | Duyệt dịch vụ |
| ✅ GET | `/api/v1/admin/marketplace/dispatch` | Hàng đợi `PageResponse<DispatchQueueItemResponse>` các đơn `PENDING_DISPATCH` kèm `candidates[]` xếp hạng đội bay (`providerId, displayName, province, distanceKm, availableUavCount, ratingAvg, completedMissionsCount, score`). |
| ✅ POST | `/api/v1/admin/marketplace/dispatch/{missionId}` | `{ providerId, note? }` giao tay sang `PENDING_PROVIDER`; `POST …/{missionId}/auto` giao tự động theo ứng viên hạng 1; `POST /api/v1/admin/marketplace/dispatch/auto` giao hàng loạt. |
| ✅ GET | `/api/v1/admin/marketplace/stats` | `MarketplaceAdminStatsResponse`: đơn theo trạng thái (`pendingDispatchCount, pendingProviderCount, scheduledCount, inFlightCount, deliveredCount, completedCount, cancelledCount`), đội bay hoạt động (`verifiedProvidersCount, pendingProvidersCount`), tin đăng (`publishedListingsCount, pendingListingsCount`), và số liệu minh hoạ (`illustrativeGrossVolumeVnd, illustrativePlatformFeeVnd`). |
| ✅ GET/POST | `/api/v1/admin/marketplace/payouts` | Giữ nguyên, nhãn minh hoạ |

## 5. Realtime

✅ WebSocket `/api/v1/ws/realtime` (`transport/websocket`): phát frame `ORDER_UPDATED` với payload `{ missionId, status, statusGroup }` **chỉ tới** khách hàng sở hữu đơn, chủ đội bay / kỹ sư được giao và nhân sự có quyền `MARKETPLACE_MODERATE` (lọc người nhận cô lập theo phiên giống `NOTIFICATION_CREATED`).

## 6. Tài khoản Dev Seed kiểm thử tự động (`app.dev-seed.enabled=true`)

Khi chạy local với `APP_DEV_SEED_ENABLED=true` và `APP_DEV_SEED_PASSWORD=<mật khẩu>` (mặc định tắt ở production):
- `demo_customer` (`ROLE_PILOT`, có sẵn 1 dự án mẫu)
- `demo_fleet` (`ROLE_PILOT`, hồ sơ đối tác `VERIFIED`, 10 UAV, 2 kỹ sư điều khiển)
- `demo_admin` (`ROLE_ADMIN`, đủ quyền quản trị nền tảng & `MARKETPLACE_MODERATE`)
