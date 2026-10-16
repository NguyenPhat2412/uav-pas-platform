# UAV PAS — Bảo vệ bản nháp và xử lý đường dẫn không tồn tại

**Ngày kiểm chứng: 16/10/2026. Phạm vi yêu cầu: COMPLETE_LOCAL. Toàn hệ thống: PARTIAL / NOT_READY.**

## Baseline và thay đổi

- Repository `/Volumes/D/Codex/projects/uav-pas-platform`, nhánh `codex/m1-monorepo-foundation`, HEAD ban đầu `f7b9f1318a8c06de9cca474ed2842efe46603b5b`; working tree sạch khi bắt đầu. Lượt kiểm chứng ban đầu không commit/push; mã nguồn sau đó được đóng gói theo yêu cầu người dùng như phần cuối báo cáo. Không deploy.
- Bản nháp đọc phiên bản cùng dữ liệu. PATCH giữ khóa mission trong giao dịch, kiểm tra quyền sở hữu, phiên bản và trạng thái trước khi cập nhật. Tab cũ nhận **409**, không thay nội dung, phiên bản, timeline hoặc audit đã lưu.
- Giao diện giữ phiên bản đi cùng nội dung người dùng đang sửa; refetch nền không tự thay phiên bản này. Khi xung đột, giữ nguyên nội dung đang nhập, khóa lưu và hướng dẫn **Tải bản nháp mới nhất**. Chỉ thao tác tải lại có chủ đích mới thay nội dung/phiên bản trong biểu mẫu.
- PATCH flush trước khi tạo response để trả phiên bản thực tế đã lưu. Gửi/hủy và sửa nháp dùng cùng khóa mission; kiểm thử cạnh tranh xác nhận không có sửa nội dung sau chuyển trạng thái.
- `NoResourceFoundException` và `NoHandlerFoundException` được trả **404** với error envelope hiện có, mã `NOT_FOUND` và thông báo chung; không phản chiếu query string. Truy cập chưa đăng nhập vào đường dẫn được bảo vệ vẫn trả **401**. Không biến lỗi máy chủ thật thành 404.
- **Auth contract, permissions registry, schema và dependency không đổi:** 89 tệp được so sánh byte với HEAD. Không đổi login, token, refresh, logout, CORS, cookie, SSO hoặc CSRF.

BA đối chiếu: FR-19 (sửa DRAFT), FR-20 (gửi một lần), FR-21 (quyền sở hữu), FR-22 (hủy theo trạng thái), FR-30 (xung đột/phục hồi), FR-38–39 (phản hồi lỗi và màn hình hẹp). Phần bảo vệ hai tab và unknown-route 500 trong đánh giá trước đã được đóng ở phạm vi cục bộ.

## Hợp đồng API nghiệp vụ

`MissionResponse` bổ sung `version` dạng số. `PATCH /api/v1/missions/{id}` bắt buộc `expectedVersion` không âm, lấy từ bản mission đã dùng để mở biểu mẫu. Các trường nội dung còn lại giữ nguyên. Thiếu/null/âm trả 400; phiên bản cũ hoặc sai trả 409 (`MISSION_DRAFT_STALE`); trạng thái không còn DRAFT bị chặn.

Ví dụ phần thay đổi của request: `{"expectedVersion": 3, "title": "Nội dung đã đối chiếu", ...}`. Đây là thay đổi **API nghiệp vụ mission**, không phải auth contract. Client cũ không gửi phiên bản sẽ bị từ chối; cần cập nhật client cùng backend khi phát hành. Không lấy phiên bản mới bằng một GET ngay trước PATCH trong khi vẫn gửi nội dung cũ. Frontend Customer đã được cập nhật theo quy tắc này; repository không có client sửa nháp khác được phát hiện.

## Kiểm chứng

| Nhóm | Kết quả | Lệnh / luồng | Evidence |
|---|---|---|---|
| Tái hiện trước sửa | 19 FAIL trong 36 ca, 0 error/skip | Hai tab ghi tuần tự, phiên bản thiếu/sai, retry sau mất phản hồi và unknown route | `regression-before-summary.json`, `regression-before-failures.json` |
| Hồi quy sau sửa | 36/36 PASS | 15 ca draft trên H2 + 15 trên PostgreSQL + 6 routing | `regression-after-summary.json` |
| Backend đầy đủ | **530 tests PASS, 0 failure/error/skip** | `./mvnw -Duav.build.directory=<isolated-target> test`; có PostgreSQL/MinIO disposable | `backend-final-summary.json`, `backend-final-sanitized.log` |
| Bốn frontend và shared packages | Lint/typecheck/test/build PASS; **78 lượt test** | `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` tại root | `root-gates.json`, `root-*.log` |
| Legacy frontend | Bốn gate PASS; **7 tests** | Cùng bốn lệnh tại `frontend/` | `legacy-gates.json`, `legacy-*.log` |
| Helper payload Customer | 9/9 PASS; 2 ca mới FAIL trước sửa | `node --test tests/customer-workflows.test.mjs` | `frontend-regression-before.log`, `frontend-regression-after.log` |
| Trình duyệt và API hỗ trợ | **13 nhóm PASS** | `node work/uav-draft-safety-20261016/browser-drafts.mjs` | `browser-drafts.json`, `screenshots/` |
| Runtime và phạm vi nguồn | PASS; 664 tệp nguồn có SHA-256; 89 tệp bảo vệ không đổi | Health/readiness và kiểm tra process group sở hữu listener | `runtime.json`, `source-manifest.json` |
| Dọn môi trường | PASS | Dừng backend/Customer, xóa containers/volumes riêng, credentials và raw build/test outputs | `cleanup.json` |

36 ca mới đã nằm trong 530. Hai ca helper mới đã nằm trong 78 lượt frontend. Không cộng lại các lượt chạy trước/sau hoặc gọi tất cả 13 nhóm là UI thuần túy.

## Kiểm tra giao diện thực tế

Môi trường: Customer `http://localhost:3101`, backend `http://127.0.0.1:18080`, PostgreSQL `55444`, MinIO `9014/9015`; Compose project riêng `uav-draft-safety-20261016`. Tài khoản/dữ liệu tổng hợp; không dùng port 8080 hoặc production. Các dịch vụ thử nghiệm đã được dọn sau kiểm tra.

Không có Browser plugin/skill chuyên dụng trong phiên (**Browser plugin not available**); dùng Playwright/Chromium có sẵn. Desktop 1440×1000; mobile 375×812 ở biểu mẫu xung đột, tải lại, lưu và chi tiết nháp. Không cài dependency mới.

Luồng: truy cập chưa đăng nhập → login → nhập dữ liệu sai → sửa dữ liệu → xem lại → quay lại chỉnh → tạo nháp → mở hai tab → tab A lưu → tab B refetch nền nhưng giữ nội dung/phiên bản cũ → tab B nhận 409 → tải lại có chủ đích → sửa/lưu → giả lập mất phản hồi sau backend đã commit → thử lại không thêm lịch sử sửa lần hai → gửi → tab sửa cũ bị chặn → hủy có xác nhận. Kiểm thêm hủy trực tiếp DRAFT, gửi/hủy lặp, Customer B sửa ID và đường dẫn không tồn tại.

Ca refetch nền dùng clock của Playwright để vượt stale time 30 giây của React Query và phát `visibilitychange` trên window. Ca mất phản hồi thực sự cho backend commit trước khi ngắt phản hồi. Fixture/read-back và một số ca quyền/404 dùng API, không mock dữ liệu nghiệp vụ.

| Kiểm tra hiển thị | Kết quả |
|---|---|
| Đúng URL/title, có nội dung | PASS |
| Không trang trắng/framework error overlay | PASS |
| Không JavaScript exception | PASS |
| Không API 5xx trong lượt cuối | PASS |
| Cảnh báo xung đột giữ nội dung cũ, tải lại rồi lưu được | PASS |
| Mobile không tràn ngang trong các màn đã kiểm | PASS |
| Screenshot được xem trực tiếp | PASS — desktop conflict, mobile conflict và nháp sau lưu |

Console có 5 phản hồi 409, một 403, một 404 và một `ERR_FAILED` thuộc các ca âm/ngắt phản hồi chủ đích; không coi chúng là lỗi bất ngờ hoặc tuyên bố console hoàn toàn trống.

## Phân loại các lượt chưa đạt

- Backend đầy đủ lần đầu có hai ca note-boundary không gửi phiên bản mới. Đã cập nhật fixture của `NoteLengthIntegrationTest`; giữ nguyên assertion ghi chú tối đa phải lưu đầy đủ. H2 và PostgreSQL đều đạt ở lượt cuối.
- Lượt browser 1 phát visibility event lên document thay vì window, nên không có refetch mong đợi. Lượt 2 selector alert trùng với Next route announcer. Lượt 3–4 kiểm giá trị quá sớm khi nút tải lại vừa chuyển sang “Đang tải…”. Đã sửa harness để chờ trường nhập thực sự được mở lại; giữ các JSON lượt thử. Không thay assertion nghiệp vụ để bỏ qua lỗi và không gọi các lỗi harness là lỗi sản phẩm.

## Giới hạn còn lại

Không có staging HTTPS, hosted CI, full security scan/npm audit, Safari/Firefox hoặc hồi quy toàn bộ UI Operations/Admin/public trong lượt này. Root build/test đã bao gồm các app đó nhưng không thay thế browser E2E. Quy tắc múi giờ nghiệp vụ không đổi; ca UI xác minh thời gian được giữ nguyên như lúc nhập. Không bổ sung chính sách accept/media hoặc SSO/CSRF.

Không bảo đảm tự phục hồi nội dung chưa lưu sau khi đóng/reload cả tab; nội dung được giữ khi nhận xung đột trong phiên biểu mẫu hiện tại. Tải bản nháp mới nhất là thao tác người dùng chọn và có cảnh báo sẽ thay nội dung đang nhập; chưa có giao diện hợp nhất từng trường.

Evidence tại `evidence/tests/draft-safety-2026-10-16/`. Bản người dùng và ảnh tại `/Volumes/D/Codex/outputs/uav-draft-safety-20261016/`. Phạm vi yêu cầu đã hoàn tất cục bộ; **không tuyên bố production-ready**.


## Đóng gói theo yêu cầu commit/push

- `dc83c67`: bảo vệ bản nháp giữa hai tab, cập nhật Customer và các kiểm thử liên quan.
- `9f1bbfa`: trả 404 cho đường dẫn không tồn tại, giữ nguyên kiểm soát xác thực.
- Commit tài liệu/evidence theo sau hai commit nguồn. SHA-256 của 664 tệp vẫn khớp bản đã kiểm chứng; 89 tệp auth/config/schema/dependency không đổi so với baseline.
- Đích push: `origin/codex/m1-monorepo-foundation`. Không merge, rebase, reset, force-push hoặc deploy production. Việc push nhánh này không đồng nghĩa hosted CI đã chạy.
