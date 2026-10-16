# Cross-Domain Authentication Design

## Trạng thái sau tích hợp main — 16/10/2026

Main `bbcf437` đã chuyển browser sang cookie trước lượt tích hợp. Bản tích hợp giữ contract này: login/refresh tiếp tục trả JSON `{accessToken, refreshToken, tokenType, user}` để tương thích API client; đồng thời đặt cookie HttpOnly `uav_access_token` (path `/`) và `uav_refresh_token` (path `/api/v1/auth`). JWT filter nhận bearer hoặc cookie. Browser dùng `credentials: include`, `/api/v1/auth/me`, và cache theo chủ thể; logout xóa cookie và dữ liệu phiên.

`XSRF-TOKEN` là cookie đọc được từ JavaScript; lệnh nghiệp vụ gửi `X-XSRF-TOKEN`. Cách đọc token thô được sửa để tương thích cơ chế có sẵn của main. CookieSessionIntegrationTest và browser test chứng minh login, 403 khi thiếu/sai CSRF, ghi hợp lệ, refresh và logout. Những exemption của main cho auth/webhook vẫn giữ nguyên và cần đánh giá riêng; chưa tuyên bố CSRF coverage toàn diện.

Shared/legacy API client không mang cookie hoặc CSRF của API tới signed storage URL. Bearer hỗ trợ client ngoài browser; không gọi localStorage bearer là SSO. Zalo đã bị loại khỏi main và không được khôi phục trong tích hợp.

## Điều chưa được chứng minh

Các portal local chạy cùng hostname `localhost`, khác port. Cookie chia sẻ giữa port không phải bằng chứng SSO giữa tên miền. Chưa có nghiệm thu HTTPS staging cho bốn hostname, redirect/returnTo tập trung, expiry/refresh race xuyên portal, logout đồng bộ, Safari/iOS hoặc các domain không cùng registrable domain.

Các tùy chọn backend hiện có: `APP_COOKIE_SECURE` (mặc định local false), `APP_COOKIE_SAME_SITE` (Lax), `APP_COOKIE_DOMAIN` (rỗng, host-only). Không coi mặc định local là cấu hình production.

## Topology dự kiến cần nghiệm thu

- `www.uavpas.example`: public web.
- `customer.uavpas.example`, `ops.uavpas.example`, `admin.uavpas.example`: ba portal.
- `api.uavpas.example`: một Spring Boot backend và cơ sở dữ liệu chung.

Trước cutover phải chọn phạm vi cookie đủ hẹp, bật HTTPS/Secure, cấu hình chính xác CORS origin/credentials và kiểm khả năng portal đọc CSRF cookie theo Domain đã chọn. Nếu dùng các registrable domain khác nhau, cần thiết kế authorization-code + PKCE/one-time exchange riêng; không truyền token qua URL hay mở rộng cookie tùy tiện. Mọi thay đổi auth contract phải được chủ dự án chốt trước.

## Acceptance tiếp theo

1. Đăng nhập từ từng portal, deep link, refresh sau hết hạn, đăng xuất và chuyển tài khoản trên hostname staging thật.
2. CSRF âm/dương cho toàn bộ cookie writes; xem xét login/refresh/logout và webhook exemptions thay vì suy diễn từ profile PATCH.
3. Quyền backend, ownership và cache isolation khi đổi vai trò hoặc tài khoản; không dựa riêng vào menu ẩn.
4. Kiểm cookie flags/domain/path, CORS, redirect allowlist, storage credential isolation và không lộ token trong URL/log/evidence.
5. Hosted CI, full security coverage và kiểm trên browser/thiết bị hỗ trợ trước kết luận production-ready.

Xem [báo cáo tích hợp và evidence](../handoff/m6/M6_MAIN_INTEGRATION_2026_10_16.md). Rollback là quay về artifact đã biết tốt và cấu hình tương ứng; không giả định có cờ tắt cookie chưa được triển khai, không xóa dữ liệu/refresh rows hoặc sửa migration đã xuất bản.
