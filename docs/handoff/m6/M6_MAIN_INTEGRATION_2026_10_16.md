# UAV PAS — Tích hợp main, hồ sơ khách hàng và bộ ảnh giao diện

**Kết quả kiểm chứng cục bộ: PASS. Toàn hệ thống: PARTIAL / NOT_READY.**

Ngày 16/10/2026, chủ dự án Nguyễn Xuân Phát cho phép tích hợp hai nhánh, xử lý xung đột/migration, kiểm thử rồi đẩy main. Quyết định này thay thế lệnh cấm merge trước đó trong đúng phạm vi tích hợp. Không force-push, reset, rebase, nâng major dependency hoặc deploy production.

## Baseline và phạm vi

- Main: `bbcf437591e6d9ab88c4a0dd16e04b49d076c091`.
- Nhánh tính năng: `11918d5ec88cf5cefcb3334840e9f6d0ecab18b0`, gồm hồ sơ khách hàng `ba8060f` và các chức năng nghiệp vụ trước đó.
- Làm việc tại checkout riêng `codex/integrate-main-profile-20261016`; giữ nguyên checkout gốc. Giải quyết 22 file xung đột bằng cách giữ cơ chế cookie, module mới và bố cục của main, đồng thời giữ bảo vệ phiên đồng thời, bản nháp, điều phối, kho, bảo trì, bàn giao và hồ sơ của nhánh tính năng.
- Khách hàng chỉ tự sửa họ tên/số điện thoại. Email, username, mật khẩu, vai trò/quyền và trạng thái không nằm trong lệnh sửa hồ sơ. Có kiểm tra phiên bản, số điện thoại trùng, quyền sở hữu, audit và phục hồi khi mất phản hồi.

## Migration và lỗi thực tế đã sửa

Giữ nguyên migration đã xuất bản V1–V8 của main. Bảo trì chuyển sang V9; unique phone chuyển sang V10. V11 bổ sung các cột audit còn thiếu ở module AI, thông báo và cấu hình. Mapping các thuộc tính số khớp kiểu NUMERIC hiện hữu; không viết lại dữ liệu đo.

Kiểm thử PostgreSQL chứng minh cả khởi tạo mới, V1/V2 và main V8 nâng lên V11. Dữ liệu người dùng, kho, thông báo và cấu hình được giữ; duplicate phone khiến migration dừng thay vì tự sửa dữ liệu cá nhân. **Chưa chạy migration trên dữ liệu thật.**

Các lỗi được phát hiện và sửa trong tích hợp:

- Entity kế thừa audit nhưng schema thiếu cột; mapping NUMERIC/Double không khớp khiến backend không khởi động.
- Hai handler lỗi chồng nhau; unknown resource phải giữ 404 của main, xung đột điện thoại phải trả 409 có kiểm soát.
- Cookie CSRF dạng thô bị xử lý như token XOR, làm lệnh hợp lệ trả 403. Sửa cách đọc header, giữ nguyên tên cookie/header và auth contract.
- Truy vấn cấu hình không tồn tại đánh dấu transaction rollback khi hoàn tất mission. Dùng giá trị mặc định qua truy vấn optional; quota lỗi không còn bị nuốt ở lệnh hoàn tất.
- Request tới storage phải bỏ credentials/CSRF của API; legacy client được bổ sung gửi CSRF đúng contract đã có trên main.
- Các service nghiệp vụ không được trả dữ liệu hoặc thành công giả khi API lỗi. Thông báo dùng đúng `content`, enum, `unreadCount`, `PATCH /{id}/read`, `POST /read-all`; trạng thái đã đọc chỉ đổi sau server xác nhận, cache theo người dùng.
- Trang thông báo vận hành thiếu shell/guard; bỏ bypass `demo=true` ở guard dùng chung. Khôi phục menu di động, Escape/focus; sửa tràn ngang ở dashboard, media, SAR, preview và màn hình xác thực legacy.
- SAR và preview có nhãn mô phỏng rõ ràng. Hai nút SAR mô phỏng không còn gửi lệnh tới mission ID cố định hoặc báo đã điều khiển UAV thật. Dashboard admin bỏ số liệu/audit giả khi API lỗi; hai khối giám sát tĩnh được đánh dấu minh họa.
- CI dùng Java 21 đúng pom, chạy toàn bộ Maven với PostgreSQL/MinIO disposable. Loader kiểm thử frontend chạy được trên Node 20 và trong job legacy chỉ cài dependency của legacy.

## Kết quả và evidence

Evidence đã loại thông tin xác thực đặt tại `evidence/tests/main-integration-2026-10-16/`. Không cộng các lượt chạy lặp hoặc các test dùng chung giữa workspace thành số test duy nhất.

| Nhóm | Kết quả | Lệnh hoặc luồng thực tế | Evidence |
|---|---|---|---|
| Baseline/giải quyết xung đột | PASS | fetch main, đối chiếu hai parent; giữ lịch sử | verification-summary.json; báo cáo này |
| 4 apps và shared packages | PASS | `npm run lint`, `typecheck`, `test`, `build` ở root; admin kiểm lại sau chỉnh dashboard | root-gates.json; admin-final-gates.json |
| Legacy frontend | PASS | đủ 4 lệnh trong frontend | legacy-gates.json |
| Toàn bộ contract/behavior test frontend | PASS | `node --test tests/*.test.mjs`: **83/83** | all-contract-tests.txt |
| Backend đầy đủ | PASS | `./mvnw -Duav.build.directory=<isolated target> test`: **635**, không failure/error/skip | backend-release-summary.json; backend-release-sanitized.txt |
| PostgreSQL/MinIO/migration | PASS | bộ test đầy đủ; V8→V11 giữ dữ liệu, storage xác thực upload/download | các suite trong backend-release-summary.json |
| Health/CORS/auth/route alias | PASS | readiness 200; anonymous/invalid token 401; CORS cho phép 200/từ chối 403; 6 alias | browser-alias-smoke.json |
| Cookie login/CSRF/refresh/logout | PASS | CookieSessionIntegrationTest: thiếu/sai CSRF 403, đúng CSRF 200, refresh rồi logout; browser tự refresh và chuyển tài khoản | backend summary; browser-profile.json; browser-final-ui.json |
| Luồng nhiệm vụ và bàn giao | PASS | **13 nhóm**: customer tạo/gửi → confirm/phân công → accept/ready/start → upload thật → complete → timeline/media/audit; stale acceptance, lỗi upload, kho/ownership | browser-handover.json |
| Hồ sơ khách hàng | PASS | **12 nhóm**: lưu/hủy, duplicate, hai tab, mất mạng/mất phản hồi, mobile, audit, logout/account switch | browser-profile.json |
| Thông báo/menu/SAR/legacy auth | PASS | **7 nhóm** qua UI, có chặn mạng và đọc lại backend | browser-final-ui.json |
| Dashboard admin | PASS | dữ liệu thật, lỗi tải có thông báo, nhãn minh họa, desktop/mobile | browser-admin-summary.json |
| Bộ trang giao diện | PASS | **78 trang/biến thể × desktop 1440×1000 và mobile 375×812 = 156 ảnh**, không page error/tràn ngang; **21 ảnh** luồng nghiệp vụ bổ sung | page-inventory.json; route-inventory.json; danh mục ảnh trên Drive |
| npm audit production | PASS | root và legacy: `npm audit --omit=dev --json`, **0 finding** | root-audit-production.json; legacy-audit-production.json |
| npm audit dev toolchain | FAIL — còn mở | mỗi lockfile có **5 high** trong chuỗi ESLint/micromatch/braces; không tự nâng major/downgrade theo fix gợi ý | root-audit.json; legacy-audit.json |
| Review tích hợp | PASS theo phạm vi | review độc lập hai parent và thay đổi cuối; không có finding chặn tích hợp. Reviewer không chạy lại test | review-summary.json |
| SSO HTTPS/staging, CI hosted, security scan toàn diện | BLOCKED đối với nghiệm thu production | chưa có đủ evidence trong lượt local này; CI được đọc lại sau push nếu dịch vụ cho phép | phần giới hạn bên dưới; release receipt ngoài repo |

## Ảnh giao diện

[Thư mục Drive](https://drive.google.com/drive/folders/1Eu41gp704og34vP891pnbLF1eFK0vkRb) nằm trong thư mục người dùng chỉ định. Tách Web, Khách hàng, Điều phối, Người vận hành, Quản trị, Legacy và Luồng nghiệp vụ. Có bản HTML mục lục xem ảnh cục bộ, manifest và ZIP tải cả bộ.

67 file route page được đối chiếu: web 14, customer 12, operations 17, admin 13, legacy 11. Dynamic route có dữ liệu đại diện; 6 route chỉ redirect được kiểm chuyển hướng và dùng ảnh của trang đích. Các slug public và tab legacy được chụp riêng. **Không có nghĩa mọi tổ hợp dữ liệu, dialog hoặc mọi trạng thái lỗi của mỗi module đều đã được chụp/kiểm nghiệp vụ.**

Ảnh là giao diện thật chạy local với dữ liệu tổng hợp; không phải môi trường production hay dữ liệu khách hàng thật. Viewport mobile trên Chromium không thay thế kiểm iOS/Android thật. SAR, preview và các khối monitor tĩnh có nhãn minh họa. Chụp trang billing/settings/webhooks không chứng minh thanh toán, delivery hay thiết bị bên ngoài đã hoạt động.

## Auth contract và giới hạn

Main đã có cookie HttpOnly trước tích hợp: `uav_access_token` path `/`, `uav_refresh_token` path `/api/v1/auth`, JSON response và bearer API tương thích. Bản tích hợp giữ cơ chế đó; không giữ lại localStorage bearer làm cơ chế browser chính của nhánh cũ. Sửa CSRF là sửa thực thi contract hiện hữu, không tạo contract xác thực mới.

Localhost khác port vẫn dùng cùng hostname; kết quả này **không chứng minh cross-domain SSO**. Cần HTTPS và các hostname staging thực, cấu hình Secure/SameSite/Domain, refresh/logout xuyên portal và đánh giá các auth/webhook CSRF exemption hiện có trên main. Không gọi localStorage bearer là SSO.

Security coverage trong lượt này gồm test quyền/ownership/cookie/CSRF/storage, dependency audit và review tích hợp. Không phải full security scan của toàn bộ SAR/AI/billing/webhook. Quota concurrency, việc nuốt một số lỗi invoice của main, callback thanh toán thực, delivery/retry webhook, giám sát thiết bị và BA traceability tổng thể vẫn cần lượt riêng. Không gọi các khoảng trống này là regression đã sửa.

## Môi trường và phát hành

Backend port 18080; frontend 3100–3104; PostgreSQL 55444; MinIO 9014/9015. Không chiếm 8080. Chỉ tạo người dùng/dữ liệu synthetic trong database/container disposable. Evidence không chứa password, access/refresh token, signed URL hoặc secret. Process/container do lượt này tạo được dọn sau bàn giao; biên nhận cleanup và remote SHA lưu cùng bộ đầu ra.

Đích phát hành mã nguồn là `origin/main`, bằng push thông thường sau test. Không deploy ứng dụng hay cơ sở dữ liệu production. SHA thực tế, trạng thái CI hosted và kết quả đối chiếu Drive được ghi trong biên nhận bàn giao sau push để tránh tài liệu tự tham chiếu SHA của chính commit.

## CI hosted sau lần push đầu

Commit ứng dụng `07d7266` đã được xác minh trên `origin/main`. [Run 38932538126](https://github.com/NguyenPhat2412/uav-pas-platform/actions/runs/38932538126) có cả hai job frontend PASS; job backend dừng trước Maven vì không kéo được image MinIO từ Docker Hub. Đây là lỗi khởi tạo môi trường CI, không được tính là backend test PASS trên hosted runner.

Follow-up chỉ sửa stack kiểm thử: dựng MinIO từ đúng release/commit và Go toolchain của binary local đã kiểm, pin checksum archive, giữ license và chạy non-root. Không thay backend/auth contract, không đổi dependency ứng dụng hoặc deploy production. Chi tiết ở `infra/minio-test/README.md`; evidence đầu tiên: `hosted-ci-initial.json`. Biên nhận bàn giao ghi kết quả run mới sau sửa, không xóa lịch sử run lỗi.

Kiểm lại local với image dựng từ source: **635/635 test backend PASS, 0 failure/error/skip**; evidence `backend-source-minio-summary.json` và `backend-source-minio-sanitized.txt`. Review độc lập phần CI-only không có finding chặn; reviewer không chạy lại test. Kết quả này chưa thay thế lần chạy trên hosted runner sạch.
