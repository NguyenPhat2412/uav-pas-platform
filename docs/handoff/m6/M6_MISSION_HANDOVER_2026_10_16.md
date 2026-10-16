# UAV PAS — Tiếp nhận và bàn giao nhiệm vụ

**Ngày kiểm chứng: 16/10/2026. Phạm vi yêu cầu: COMPLETE_LOCAL. Toàn hệ thống: PARTIAL / NOT_READY.**

## Quy tắc đã được chủ dự án chốt

1. Người vận hành được phân công phải tiếp nhận trước **Sẵn sàng**; thay đổi nguồn lực làm mất hiệu lực tiếp nhận và phải tiếp nhận lại. Báo vướng mắc sau Sẵn sàng đưa nhiệm vụ về bước chuẩn bị.
2. **Hoàn tất** bắt buộc ghi chú kết quả và tình trạng thiết bị, mỗi trường có nội dung và tối đa 500 ký tự. Kiểm tra khu vực, ghi hình trên không và thu thập dữ liệu cần ít nhất một tệp kết quả/báo cáo đã tải, xác nhận và gắn thành công. Thuê UAV và loại Khác không bắt buộc tệp.
3. **Hoàn tất, Thất bại, Hủy, Từ chối:** chỉ xem/tải tệp; backend chặn thêm, xác nhận, gắn, cấp lại URL tải lên và xóa, kể cả admin. Giao diện chi tiết ẩn thao tác tải lên. Thư viện tệp giải thích rõ khi thao tác bị chặn.

Đối chiếu baseline BA: BA-08 (media), BA-15 (điều kiện READY), BA-16 (operator/lifecycle), BA-17 (terminal/retry), BA-18 (cạnh tranh). Đây là nghiệm thu phạm vi các quy tắc trên ở môi trường cục bộ, không đánh dấu toàn bộ các hàng BA hoặc toàn sản phẩm đã hoàn tất.

## Thay đổi và lỗi thực tế đã sửa

- Backend khóa nhiệm vụ khi kiểm điều kiện/chuyển trạng thái. READY và START đều kiểm tiếp nhận; chỉ operator được phân công có thể nhận. Tiếp nhận từ tab đang hiển thị phân công cũ trả 409, không tự nhận thay trên dữ liệu mới.
- Thêm/đổi tài nguyên làm mất hiệu lực tiếp nhận. Báo vướng mắc giữ nội dung do người dùng nhập, hủy tiếp nhận và ghi đúng trạng thái trước/sau vào timeline.
- Hoàn tất kiểm điều kiện trước khi hoàn trả kho/UAV. Hai lệnh hoàn tất, hoặc hoàn tất cạnh tranh với thất bại, chỉ có một kết quả kết thúc thắng; lỗi audit rollback trạng thái, tài nguyên và timeline.
- Tệp bàn giao hợp lệ có vai trò **OUTPUT hoặc DOCUMENT**, đã xác nhận, chưa xóa và gắn đúng nhiệm vụ. INPUT, OTHER hoặc FLIGHT_DATA riêng lẻ không đáp ứng điều kiện. Operations có lựa chọn vai trò rõ ràng; tải lên từ giao diện legacy mặc định OUTPUT.
- URL PUT ký kèm điều kiện `If-None-Match: *`; các client hiện có gửi header này. Dùng lại URL không ghi đè nội dung đã bàn giao. Đã kiểm trên MinIO thật: PUT lần hai trả 412; bỏ header đã ký bị từ chối; tải xuống vẫn là nội dung gốc.
- Operations có checklist trước Hoàn tất, hai ô nhập bắt buộc, giữ ghi chú khi tải tệp lỗi và tải lại danh sách sau kết quả chưa chắc chắn. Customer thấy kết quả, tình trạng thiết bị, timeline và tải tệp.
- Legacy trước sửa bị kẹt 409 khi tiếp nhận từ tab cũ. Đã sửa tải lại sau cả thành công/thất bại/mất phản hồi; chống gửi đồng thời và khóa ghi nếu chưa tải được trạng thái mới. Người dùng có nút tải lại. Không tự tạo ghi chú hoàn tất thay người vận hành.
- Thư viện media trước sửa hiện mã `MISSION_MEDIA_LOCKED`; đã thay bằng thông báo tiếng Việt về quyền chỉ xem/tải.

## Baseline và API nghiệp vụ

Repository `/Volumes/D/Codex/projects/uav-pas-platform`, nhánh `codex/m1-monorepo-foundation`, HEAD `15936b939b4b0f6c251ad272ffbbc649a464e9dc`; working tree sạch khi bắt đầu. Không đổi lịch sử Git, không commit/push/deploy.

**Auth contract không đổi.** Đối chiếu 48 tệp bảo vệ lúc bắt đầu và mở rộng 53 tệp auth/security/CORS/config/dependency với HEAD đều không đổi. Không đổi login, token, refresh, logout, cookie, SSO/CSRF hoặc permission registry. Không thêm migration hay nâng dependency.

API nghiệp vụ có thay đổi cần phát hành cùng client:

| Endpoint | Yêu cầu / phản hồi |
|---|---|
| `POST /api/v1/missions/{id}/accept` | Body `{"expectedVersion": <mission.version đang hiển thị>}` bắt buộc. Thiếu/null/âm: 400. Bản cũ hoặc đã nhận: 409 `MISSION_ACCEPTANCE_STALE`. |
| `POST /api/v1/missions/{id}/ready`, `/start` | Thiếu tiếp nhận hợp lệ: 409 `MISSION_ACCEPTANCE_REQUIRED`. Quyền và trạng thái vẫn được kiểm. |
| `POST /api/v1/missions/{id}/complete` | `completionNote` và `equipmentCondition` bắt buộc. Không đủ tệp bàn giao theo loại: 409 `MISSION_HANDOVER_RESULT_REQUIRED`. |
| API ghi media gắn mission | Khi nhiệm vụ kết thúc: 409 `MISSION_MEDIA_LOCKED`; actor không có quyền vẫn bị chặn theo quyền. |
| PUT vào URL lưu trữ được cấp | Bắt buộc header `If-None-Match: *` cùng Content-Type. Không lưu URL có chữ ký vào evidence. |

Client ngoài repository cũng cần cập nhật body tiếp nhận/header PUT khi phát hành. Thay đổi này thuộc API nghiệp vụ/lưu trữ, không phải auth contract.

## Kết quả kiểm chứng

Evidence trong `evidence/tests/mission-handover-2026-10-16/`.

| Nhóm | Kết quả | Lệnh / phạm vi | Evidence |
|---|---|---|---|
| Tái hiện trước sửa | **48 FAIL / 54 ca**, 0 error/skip | Thiếu gate tiếp nhận, hoàn tất, khóa media | `regression-before-summary.json`, `regression-before-failures.json` |
| Hồi quy ban đầu sau sửa | **54/54 PASS** | H2 và PostgreSQL | `regression-after-summary.json` |
| Backend cuối cùng | **592/592 PASS**, 0 failure/error/skip | `./mvnw -Duav.build.directory=<isolated-target> test`, có PostgreSQL/MinIO disposable | `backend-final-summary.json`, `backend-final-sanitized.log` |
| Bốn app và shared packages | **4 gate PASS; 81 lượt test** | Root: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` | `root-gates.json`, `root-*.log` |
| Legacy frontend | **4 gate PASS; 7 tests** | Cùng bốn lệnh tại `frontend/` | `legacy-gates.json`, `legacy-*.log` |
| Helper Operations | **20/20 PASS**, ba ca mới FAIL trước sửa | Payload phiên bản, gate nút, ghi chú bắt buộc | `frontend-before.log`, `frontend-after.log` |
| Luồng giao diện chính + API bổ trợ | **13 nhóm PASS** | `node work/uav-mission-handover-20261016/browser-handover.mjs` | `browser-handover.json`, `screenshots/` |
| Legacy thực tế + fixture API | **4 nhóm PASS** | `node work/uav-mission-handover-20261016/browser-legacy.mjs` | `browser-legacy-before.json`, `browser-legacy.json` |
| Thư viện media sau kết thúc | **1 nhóm PASS** | `node work/uav-mission-handover-20261016/browser-media-lock.mjs` | `browser-media-lock-before.json`, `browser-media-lock.json` |
| Console/route bổ sung | **4 màn PASS** | Login + trang Customer/Operations/Admin/legacy | `browser-diagnostics.json` |
| Auth/dependency và nguồn | **PASS** | So sánh byte với HEAD, SHA-256 633 tệp nguồn | `source-manifest.json`, `baseline.json` |
| Dọn môi trường / diff | **PASS** | Dừng process/container riêng, xóa dữ liệu/credential/raw log; `git diff --check` | `cleanup.json`, `final-verification.json` |

62 lượt kiểm thử bàn giao (31 H2 + 31 PostgreSQL) đã nằm trong 592. Ba helper mới đã nằm trong 81 lượt frontend. Không cộng lại các lần chạy trước/sau; các nhóm browser có fixture/read-back/ca âm bằng API, không gọi tất cả là UI thuần túy.

## Luồng giao diện thực tế

Customer A đăng nhập, tạo/gửi nhiệm vụ → điều phối xác nhận và gán trạm/UAV/operator/thiết bị → tab operator cũ bị chặn khi thiết bị đổi → tải lại và tiếp nhận → Sẵn sàng → báo vướng mắc, quay về chuẩn bị → tiếp nhận lại/Sẵn sàng/Bắt đầu → thiếu ghi chú/tệp bị chặn → tải FLIGHT_DATA chưa đủ → giả lập upload lỗi, giữ ghi chú → tải DOCUMENT, tải xuống thực tế → Hoàn tất và hoàn trả một lần → Customer thấy kết quả/tình trạng/timeline, tải đúng tệp → admin xem audit.

Customer B và operator không được phân công bị chặn khi đọc mission/timeline/media/URL tải xuống. Customer B mở trực tiếp màn hình không thấy dữ liệu của A. Ma trận backend kiểm đủ bốn trạng thái kết thúc và các đường ghi media chung/riêng; browser terminal tập trung COMPLETED, không giả nhận đã bấm đủ mọi tổ hợp trên UI.

Legacy kiểm tab cũ 409 rồi thử lại thành công, mất phản hồi sau khi backend đã tiếp nhận nhưng UI tải lại đúng trạng thái, tải tệp OUTPUT và hoàn tất với nội dung tự nhập. Thư viện media kiểm admin không xóa được tệp đã bàn giao và nhận thông báo đúng.

Môi trường riêng: PostgreSQL 55444; MinIO 9014/9015; backend 18080; Customer 3101, Operations 3102, Admin 3103; legacy dùng 3100 sau khi dừng public app thuộc lượt kiểm tra. Không chiếm 8080. Dữ liệu/tài khoản tổng hợp. Desktop 1440×1000; mobile 375×812 ở biểu mẫu bàn giao và màn Customer. Đã xem ảnh trực tiếp; các màn mobile được kiểm không tràn ngang.

Không có Browser plugin/skill chuyên dụng trong phiên; dùng Playwright/Chromium có sẵn, không cài dependency. Bốn frontend và packages được build/test; public web không có browser hồi quy riêng trong lượt bàn giao này.

Không có JavaScript exception hoặc API 5xx trong các lượt browser cuối. Có 409/403 và lỗi mạng do ca âm/ngắt phản hồi chủ đích. Chẩn đoán bổ sung xác nhận 404 còn thấy ở **`/favicon.ico`** của ba portal; không phải lỗi API hay trang nghiệp vụ. Chưa sửa biểu tượng tab trong phạm vi này.

## Phân loại lần chạy chưa đạt

- Lần biên dịch regression đầu thiếu import trong test; đã sửa harness trước khi thu 54 ca FAIL/PASS thực tế.
- Full suite lần đầu: 584 tests, 3 failures, 31 errors. Những fixture cũ chưa tiếp nhận, thiếu tệp/ghi chú bắt buộc hoặc chưa gửi header PUT mới. Đã cập nhật fixture dương, giữ kiểm tra rollback/giới hạn. Không bỏ qua test; lượt cuối 592, skip 0.
- Browser chính lần 1 khởi chạy trước backend readiness; lần 2 chọn option sai cách do label lồng nhau. Đã sửa thứ tự/chờ và selector của harness; giữ JSON lần thử, không gọi là lỗi sản phẩm.
- Setup legacy thử đầu thiếu quantity bắt buộc; đã sửa fixture. Lỗi legacy 409 lặp sau đó được tái hiện thật và đã sửa ở sản phẩm.
- Chẩn đoán bổ sung thử nhầm `/audit` thay vì route `/audit-logs`; sửa đường dẫn kiểm tra. Lượt cuối đúng route chỉ còn favicon 404.
- Nghi ngờ response phiên bản sau báo vướng mắc đã được kiểm: 2/2 H2/PostgreSQL đạt trên service hiện có; không thêm refactor ngoài nhu cầu. Hai ca này đã nằm trong full suite cuối.

## Giới hạn và việc tiếp theo

Phạm vi tiếp nhận/bàn giao nêu trên đã hoàn tất cục bộ. Chưa nghiệm thu staging HTTPS, hosted CI, full security scan/npm audit, Safari/Firefox, đầy đủ accessibility và mọi tổ hợp role/viewport. Không thay bearer localStorage thành SSO hoặc triển khai CSRF mới; nếu cần đổi auth contract phải chốt riêng trước khi làm.

Không thêm bước khách hàng ký nghiệm thu, chính sách lưu giữ/xóa tệp nền hay quy trình mở lại nhiệm vụ. URL upload đã cấp trước kết thúc có thể tạo object mồ côi nếu object chưa tồn tại, nhưng không thể confirm/gắn sau kết thúc hoặc ghi đè tệp đã bàn giao; không tự đặt retention policy. Dữ liệu hoàn tất cũ thiếu hai trường được hiển thị trung thực là chưa ghi nhận, không tự bịa nội dung.

Evidence không chứa mật khẩu, token hoặc signed URL. Runtime disposable và raw logs đã dọn. Source thay đổi để review tại working tree; **chưa commit/push**. Không tuyên bố production-ready.


## Đóng gói theo yêu cầu commit/push — 16/10/2026

- Người dùng đã yêu cầu commit và push sau khi nghiệm thu phần triển khai cục bộ. Ràng buộc không commit/push trong phần trên mô tả lượt kiểm chứng trước yêu cầu này.
- Commit mã nguồn `02d4d18`: gate tiếp nhận, điều kiện bàn giao, khóa media, cập nhật ba client và kiểm thử hồi quy.
- Commit tài liệu đi kèm giữ evidence của lần chạy thực tế. Không chạy lại 592 tests chỉ để đóng gói: 632/633 tệp nguồn khớp byte; một tệp test chỉ bỏ dòng trống cuối theo `git diff --cached --check`, không đổi hành vi. Hai SHA trước/sau nằm trong `publish-verification.json`; không viết lại manifest lịch sử.
- Auth/config/dependency vẫn không đổi so với baseline. Đích push: `origin/codex/m1-monorepo-foundation`; không merge/rebase/reset/force-push/deploy. Việc push không đồng nghĩa hosted CI hoặc staging đã đạt.
