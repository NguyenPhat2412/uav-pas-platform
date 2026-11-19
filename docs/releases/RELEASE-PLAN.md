# Các mốc tiến độ (GitHub Releases) — bản nháp

Chỉ gắn tag lên commit **đã có trên GitHub** (`origin/main` = `3ffef87c`). Việc từ 17/11 trở đi chưa push → sẽ là
`v0.7.0` sau khi push. Tất cả đánh dấu **Pre-release** (đồ án demo).

| Tag | Ngày | Commit | Tiêu đề |
|---|---|---|---|
| v0.1.0 | 10/10/2026 | `bf84c192` | Nền móng monorepo |
| v0.2.0 | 19/10/2026 | `92b5da9a` | Chuẩn hoá backend & luồng nhiệm vụ |
| v0.3.0 | 31/10/2026 | `f742e78f` | Cổng quản trị, trợ lý AI, đăng nhập Google, đào tạo, thời tiết |
| v0.4.0 | 08/11/2026 | `9e84b73d` | App iPhone, mô phỏng bay, tách 3 cổng, CI/CD |
| v0.5.0 | 14/11/2026 | `16398a8f` | Realtime, chat hỗ trợ, multi-zones, iOS |
| v0.6.0 | 16/11/2026 | `3ffef87c` | Chợ dịch vụ UAV & thông báo đa kênh (bản đang chạy production) |

---

## v0.1.0 — Nền móng monorepo
- Khởi tạo backend Spring Boot + frontend, gộp thành monorepo (PR #1).
- Kiểm kê schema PostgreSQL, kiểm thử nâng cấp migration và khôi phục lưu trữ.
- Bằng chứng smoke test các cổng đã đăng nhập.

## v0.2.0 — Chuẩn hoá backend & luồng nhiệm vụ
- Bảo mật: sửa JWT role claim, siết whitelist, Flyway làm mặc định.
- Luồng khách hàng đầu-cuối, điều phối lại trạm/thiết bị có giao dịch, bàn giao nhiệm vụ.
- Mã nhiệm vụ cấp phát nguyên tử bằng sequence; chuẩn hoá service/controller/DTO/MapStruct.

## v0.3.0 — Cổng quản trị, trợ lý AI, đăng nhập Google, đào tạo, thời tiết
- Admin: thống kê, quản lý người dùng, gói dịch vụ, sức khoẻ hệ thống.
- Trợ lý AI nổi (qua 9router), đính kèm ảnh/video.
- OTP email, 2FA, đăng nhập Google.
- Khoá học đào tạo kiểu Udemy (video, slide, PDF).
- Module thời tiết an toàn bay; Postman API test + GitHub Actions.

## v0.4.0 — App iPhone, mô phỏng bay, tách 3 cổng, CI/CD
- App Expo cho khách hàng và vận hành.
- Trình mô phỏng bay UAV đi qua pipeline telemetry thật.
- Phân quyền theo chức năng, vùng trời & giấy phép bay, thông báo push/email.
- Agent biên Kria KV260 (Vitis AI DPU + MAVLink).
- Tách web thành 3 cổng customer / operations / admin; pipeline Staging → Production (GHCR).

## v0.5.0 — Realtime, chat hỗ trợ, multi-zones, iOS
- Chat hỗ trợ trực tiếp + trả lời nhanh trên web và iOS.
- WebSocket realtime cho hỗ trợ, hoá đơn, thông báo.
- 3 cổng chạy multi-zones trên một tên miền; API tại api.uav.all1.vn.
- iOS: Sign in with Apple, push notification thật, cấu hình EAS/TestFlight.

## v0.6.0 — Chợ dịch vụ UAV & thông báo đa kênh
- Chợ dịch vụ UAV hai phía, Seller Studio cho đội bay, luồng escrow (minh hoạ).
- Thời tiết nhiều ngày, kho lưu trữ Google Drive.
- Hệ thống thông báo theo module + chính sách kênh, popup 3 lớp, Dynamic Island.
- Chat: trạng thái đã gửi/đã xem, hàng đợi FIFO, gửi lại.
