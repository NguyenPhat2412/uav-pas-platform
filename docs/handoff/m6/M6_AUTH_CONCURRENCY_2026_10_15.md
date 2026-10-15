# UAV PAS — Sửa đồng thời đăng nhập, refresh và đăng xuất

**Ngày 15/10/2026.** Yêu cầu: sửa lỗi đăng nhập đồng thời cùng tài khoản, kiểm tra lại login/refresh/logout, **không đổi auth contract**.

## Baseline và phạm vi

Branch `codex/m1-monorepo-foundation`, HEAD `65d1b23da3d888d1ef8120462f2689da8cffd7cb`. Working tree chứa các thay đổi BA/UI/bảo trì của những lượt trước; giữ nguyên, không reset/merge/rebase/commit/push/deploy. Snapshot SHA-256 theo file phân biệt thay đổi của lượt này với baseline đã có.

Môi trường chỉ dùng tài khoản và dữ liệu synthetic: PostgreSQL/MinIO disposable thuộc Compose `uav-auth-concurrency-20261015`, backend `127.0.0.1:18080`, database 55444, storage 9014/9015, frontend 3100–3103. Không sử dụng port 8080. PostgreSQL cho regression Maven tách database/schema với runtime browser.

## Lỗi thật trước sửa

Lỗi M6-B9 từ lượt bảo trì được tái hiện lại trên source auth chưa sửa: **6/6 cặp đăng nhập có một 200, một 500**, constraint `refresh_tokens_user_id_key`. Bộ HTTP mở rộng có 14 nhóm, 10 PASS và 4 FAIL:

| Tình huống | Lỗi trước sửa | Nguyên nhân |
|---|---|---|
| Đăng nhập đồng thời cùng tài khoản | Có HTTP 500 | Cùng xóa rồi chèn refresh token, trong khi `user_id` là unique; chưa có khóa trên tài khoản |
| Gửi cùng refresh token đồng thời | Có HTTP 500 | Đọc/xác thực token trước khi tuần tự hóa; nhiều request cùng đi vào rotation |
| Đăng xuất đồng thời cùng token | Có HTTP 500 | Kiểm token chưa nằm trong blacklist rồi cùng chèn, đụng unique token ID |
| Năm lần nhập sai đồng thời | Sau đó mật khẩu đúng vẫn đăng nhập 200 | Các transaction ghi đè số lần nhập sai từ snapshot cũ, không đạt ngưỡng khóa hiện có |

Evidence trước sửa: `auth-login-before-result.json`, `api-auth-before-result.json`, và red regression PostgreSQL trong thư mục evidence của lượt này. Không ghi response auth, token, password hoặc cookie vào evidence.

## Cách sửa và điều giữ nguyên

- Dùng khóa ghi trên **row tài khoản đã tồn tại** để xử lý cả tình huống chưa có row refresh. Khóa nằm trong transaction và được giữ đến commit/rollback; có hiệu lực giữa nhiều instance dùng chung database, không dùng mutex chỉ có tác dụng trong một JVM.
- Login đọc lại trạng thái tài khoản sau khi lấy khóa, rồi kiểm mật khẩu/trạng thái/đếm sai và phát hành token. Username và email của cùng tài khoản được tuần tự hóa trên cùng ID.
- Refresh chỉ dùng token string để tìm ID chủ sở hữu; khóa tài khoản trước, rồi **đọc lại đúng token** và xác minh hạn/revocation. Nếu login/refresh khác đã thay token trong lúc chờ, trả 401 theo quy tắc token không còn hợp lệ.
- Logout xác định chủ sở hữu của access và refresh token được gửi lên; lấy các khóa tài khoản theo thứ tự ID, rồi mới invalidate/revoke. Cách này tránh vòng chờ khi hai payload dùng chéo token của hai tài khoản. Token cũ không được đổi thành thao tác thu hồi token mới theo user ID.
- Đọc lại entity sau khóa để không dùng snapshot trong persistence context trước khi chờ. Các thao tác cấp mới, đọc để rotation, revoke và delete refresh dùng cùng thứ tự khóa.

**API công khai giữ nguyên:** endpoint, request/response DTO, mapper, JSON bearer, định dạng JWT, cấu hình JWT, CORS/security configuration, schema/migration và client/frontend. Không thêm cookie, SSO, CSRF hoặc đổi nơi lưu token. `RefreshTokenService` chỉ thêm phương thức nội bộ để đồng bộ hóa; không phải đổi HTTP contract.

**Chính sách phiên giữ nguyên:** mỗi tài khoản có một refresh token. Các login hợp lệ đồng thời đều có thể trả 200; refresh token của lần commit cuối còn hiệu lực, token cũ trả 401. Access token đã phát hành vẫn có vòng đời riêng cho đến khi hết hạn hoặc bị invalidate. Logout chỉ thu hồi access/refresh được gửi trong request; không trở thành logout-all. Nếu rotation thắng trước logout token cũ, cặp mới vẫn hợp lệ. Đây là hành vi đã có, được kiểm lại và ghi rõ, không gọi là đa phiên refresh hoặc SSO.

## Kết quả kiểm chứng cuối

**Phạm vi sửa auth: COMPLETE. M6-B9 đã được giải quyết trên môi trường kiểm chứng cục bộ. Toàn dự án: PARTIAL / NOT_READY.**

| Nhóm | Kết quả | Evidence trong `evidence/tests/auth-concurrency-2026-10-15/` |
|---|---|---|
| Reproduction trước sửa | **FAIL được giữ lại**: 6/6 cặp login lỗi 500; 4/14 nhóm HTTP thất bại; 3/3 regression PostgreSQL đỏ | `auth-login-before-result.json`, `api-auth-before-result.json`, `backend-before-summary.json` |
| Auth targeted H2 + PostgreSQL | **PASS 77/77**, gồm 17 ca mới chạy ở mỗi DB và các test auth/controller/architecture hiện có | `backend-auth-scoped-summary.json`, `backend-final-summary.json` |
| Full Maven với PostgreSQL/MinIO | **PASS 390/390**, 0 failure/error/skip; đã gồm targeted tests | `backend-suite-summary.json`, `backend-suite-sanitized.log` |
| Root 4 frontend apps + 7 packages | **PASS** lint/typecheck/test/build; 73 lượt test | `root-gates.json`, `root-*.log` |
| Legacy frontend | **PASS** lint/typecheck/test/build; 7 tests | `legacy-gates.json`, `legacy-*.log` |
| API thực tế sau sửa | **PASS 14/14 nhóm**, 813 phản hồi, **0 HTTP 5xx** | `api-auth-after-result.json` |
| Login đồng thời | **PASS 96 yêu cầu** trong 16 đợt 6 yêu cầu, có cả tài khoản chưa có phiên và đã có phiên; username/email cùng ID; một row refresh, một refresh còn dùng được | Nhóm concurrent login trong `api-auth-after-result.json` |
| Cùng refresh đồng thời | **PASS 72 yêu cầu** trong 12 đợt: mỗi đợt một 200, năm 401; một replacement | Nhóm same-refresh trong `api-auth-after-result.json` |
| Logout/refresh/login giao nhau | **PASS** logout lặp có/không refresh, login↔refresh, logout↔login, logout↔refresh, token chéo hai tài khoản, sai mật khẩu đồng thời | Các nhóm tương ứng trong `api-auth-after-result.json`; regression PG/H2 |
| Browser Customer/Operations/Admin | **PASS 13/13**: login thật → expiry tự nhiên → refresh → dữ liệu bảo vệ → logout → guard; hai browser cùng tài khoản và đăng nhập lại | `browser-auth-result.json`, `screenshots/` |
| Public contract/frontend/schema/config | **PASS — không đổi**, kiểm bằng hash so với baseline | `source-manifest.json` |
| Cleanup và source cuối | **PASS**; source được kiểm thử không đổi, branch/HEAD không đổi; `git diff --check` đạt; runtime/container/volume/credential/raw test target đã dọn | [summary.json](evidence/tests/auth-concurrency-2026-10-15/summary.json) |

HTTP có các 400/401/403 âm kỳ vọng, không tính chúng thành lỗi máy chủ. Browser ghi nhận 61 phản hồi (50 × 200, 11 × 401 kỳ vọng), không lỗi JavaScript hoặc 5xx. Có 10 request bị hủy khi chuyển trang/query; lưu rõ `ABORTED`, **0 lỗi truyền tải ngoài nhóm hủy này**, không tuyên bố mọi request đều nhận response.

Hai lỗi bổ sung ngoài login ban đầu — logout đồng thời và số lần sai mật khẩu bị đếm thiếu — đều có bằng chứng trước/sau. Lỗi fixture PostgreSQL về kiểu JDBC `Instant` được đổi sang `Timestamp`; lưu trong `harness-corrections.json`, không dùng thay đổi fixture để che lỗi sản phẩm. Bộ HTTP và browser dùng cùng source backend final; TTL 5 giây chỉ được bật cho runtime browser sau khi hoàn tất HTTP concurrency.


Các script API giữ token trong bộ nhớ để gửi request/so sánh nhưng chỉ lưu method/path/status và kết quả assertion. SQL chỉ dùng để tạo điều kiện hết hạn/thu hồi trong database synthetic và kiểm số row; không lưu giá trị token. Browser sử dụng thao tác đăng nhập trên giao diện thật và chờ access token **hết hạn tự nhiên**, không sửa localStorage hay giả response auth. Barrier trong ca login song song chỉ đồng bộ thời điểm gửi nguyên request thật.

Backend browser dùng TTL thử nghiệm ngắn qua biến môi trường riêng; mặc định/config source của sản phẩm không đổi. Ba portal đăng nhập riêng theo origin. Khi hai browser độc lập đăng nhập cùng tài khoản, cả hai login thành công; sau expiry chỉ bên giữ refresh hiện tại tiếp tục, bên kia quay lại đăng nhập theo chính sách một refresh/tài khoản.

## Lệnh và endpoint

- Maven: `./mvnw -Duav.build.directory=<isolated test target> test`; bật PostgreSQL/MinIO opt-in. Regression có bản H2 và PostgreSQL dùng schema riêng, không gọi H2 là bằng chứng concurrency PostgreSQL.
- Frontend root và legacy: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` với Node 20.20.2; không cài/nâng dependency.
- HTTP: `GET /actuator/health/readiness`, `POST /api/v1/auth/register` (fixture), `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, OPTIONS CORS.
- Script `api-auth.mjs`: chạy `UAV_AUTH_PHASE=before|after` cùng `UAV_BROWSER_WORK`; kết quả tách trước/sau. `browser-auth.mjs` dùng thêm `UAV_BROWSER_SCREENSHOTS`, `PLAYWRIGHT_MODULE`, `CHROMIUM_EXECUTABLE`, `UAV_AUTH_ACCESS_TTL_MS`.
- Playwright/Chromium có sẵn, fallback do browser plugin không khả dụng trong phiên. Không cài trình duyệt/dependency mới.

## Giới hạn

Không kiểm Zalo với nhà cung cấp thật, không chạy staging/HTTPS cross-domain SSO, không đổi CSRF, không có hosted CI hay full security scan/npm audit mới. Test request đồng thời trên HTTP/PostgreSQL cục bộ không phải kiểm tải production hoặc bằng chứng đã chạy nhiều replica. Cơ chế khóa database đã được review; triển khai nhiều replica vẫn cần kiểm ở staging.

Các thiếu hụt rộng hơn của M6 giữ nguyên. Kết quả auth của lượt này không biến toàn dự án thành production-ready. Evidence trước sửa và báo cáo bảo trì cũ được giữ như lịch sử, không xóa lỗi để chỉ còn PASS.
