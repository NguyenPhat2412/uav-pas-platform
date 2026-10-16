# UAV PAS — Hoàn thiện luồng giao diện theo BA, 15/10/2026

> **Cập nhật tích hợp main — 16/10/2026:** xem [M6_MAIN_INTEGRATION_2026_10_16.md](M6_MAIN_INTEGRATION_2026_10_16.md) cho source và kiểm chứng mới nhất. Phần dưới giữ lịch sử của nhánh/lượt kiểm tương ứng; migration hồ sơ hiện là V10, bảo trì là V9, auth browser giữ cookie của main. Toàn hệ thống vẫn PARTIAL / NOT_READY.

> Cập nhật tiếp theo: policy bảo trì/gán trạm, thay/gỡ UAV, UAT-X15 và một phần UAT-X16 đã được xử lý/kiểm tra trong [báo cáo bảo trì và điều phối](M6_UAV_MAINTENANCE_REDISPATCH_2026_10_15.md). Nội dung dưới đây là snapshot của lượt BA workflow trước.

**Phạm vi:** bản BA v2 của Nguyễn Xuân Phát (23110209), ưu tiên chức năng khách hàng/vận hành và lỗi có bằng chứng. Báo cáo này là phần cập nhật sau BA v2; không thay đổi kết quả lịch sử trong PDF/Word đã xuất.

**Kết luận:** đợt chức năng nêu dưới đã triển khai và kiểm tra cục bộ; toàn dự án vẫn **PARTIAL / NOT_READY**. Auth contract giữ nguyên. Không commit, push, đổi lịch sử Git hoặc deploy.

## 1. Baseline và môi trường

- Repository: `/Volumes/D/Codex/projects/uav-pas-platform`.
- Branch: `codex/m1-monorepo-foundation`; HEAD `65d1b23da3d888d1ef8120462f2689da8cffd7cb`.
- Working tree đã có thay đổi từ các lượt trước; giữ nguyên, bổ sung trên đó. `summary.json` và `source-manifest.json` xác định phiên bản thực tế bằng hash, không chỉ HEAD.
- Spring: `127.0.0.1:18080`; PostgreSQL disposable: `55444`; MinIO disposable: `9014/9015`. Không dùng cổng 8080.
- DB browser `uav_stabilization`; DB Maven `uav_ba_test_suite`; bucket browser và test riêng.
- Bốn frontend standalone tại 3100–3103. Chromium headless thật, API/PostgreSQL/MinIO thật; không giả phản hồi nghiệp vụ cho luồng chính.
- Browser plugin không có trong phiên; dùng Playwright đã cài sẵn. Không thêm/nâng dependency.
- Tài khoản, trạm, UAV, thiết bị, nhiệm vụ và tệp đều synthetic. API setup/read-back được ghi riêng với thao tác UI, không cộng setup thành bằng chứng UI.

## 2. Chức năng đã bổ sung

| Nhóm BA | Thay đổi thực tế | Phạm vi kiểm chứng |
|---|---|---|
| FR-19, UC03 — sửa nháp | Trang chỉnh sửa đủ trường, giữ nguyên service/type; kiểm owner, permission và DRAFT; kiểm đầu vào; thông báo 409 và nạp trạng thái mới | Lưu qua UI và đối chiếu API/timeline; sai owner; tab cũ sau submit; mobile |
| FR-18,21,38 — danh sách | Phân trang server, lọc trạng thái/tìm kiếm đưa về trang đầu, tổng số/range, trạng thái rỗng/lỗi | Tập >20 nhiệm vụ, trang sau, tìm kiếm, đổi/xóa lọc, mobile |
| FR-17,18 — tạo yêu cầu | Mã dịch vụ không còn bị ép thành enum MissionType; review đầy đủ mô tả/ghi chú/tọa độ; validation và thông báo availability đúng phạm vi | Tạo thật với service code CUSTOM_SURVEY_BA, MissionType hợp lệ |
| FR-29, UC11 — thất bại | Operator được phân công có MISSION_STATUS_UPDATE được báo thất bại đúng trạng thái; lý do bắt buộc, ghi chú tùy chọn, xác nhận, khóa khi đang gửi | Nhánh IN_PROGRESS → FAILED qua UI, lý do/ghi chú/timeline; kho/UAV được trả lại |
| FR-28 — hoàn tất | Ghi nhận tình trạng thiết bị và hiển thị kết quả thực hiện; không tự biến ghi chú thành nghiệp vụ bảo trì | Luồng hoàn tất có tệp kết quả thật; payload test cho equipmentCondition |
| FR-14,24 — thiết bị | Nhập số lượng giữ, kiểm số nguyên dương và lượng khả dụng; tải đủ các trang tài nguyên để chọn | Giữ 2 thiết bị và kiểm số dư trước/sau reject/fail |
| FR-10,12,16 — quản lý tài nguyên | Chọn trạm khi tạo thiết bị; phân trang lịch sử kho/UAV; tìm UAV theo cả model và serial; xử lý lỗi mutation UAV | Tạo qua UI, stationId persisted; lịch sử nhiều trang |
| FR-23, UAT-X13 — reject phân công dở | Trả UAV và mọi reservation trong transaction reject, không để tài nguyên bị giữ vô chủ | Regression transaction + UI/PostgreSQL với station/UAV/equipment chưa có operator |
| FR-30,38 — phản hồi/lỗi | Khóa thao tác chồng nhau; response load cũ không ghi đè dữ liệu mới; reset snapshot khi đổi mission | Workflow bình thường; thử GET thật bị trì hoãn; stale submit/edit 409 |

Dashboard khách hàng được đổi cách gọi số liệu để không trình bày số đếm của 20 bản ghi đầu thành toàn bộ nhiệm vụ đang xử lý. Trang dịch vụ không hiển thị “không có dữ liệu” cùng lúc với lỗi tải.

## 3. Lỗi có bằng chứng và cách xử lý

**Reject giữ tài nguyên:** trước sửa, integration test tái hiện trạng thái nhiệm vụ REJECTED nhưng UAV vẫn ASSIGNED. Sau sửa, dùng lại `releaseResources()` sau transition hợp lệ, cùng transaction. Các ca kiểm tra trả nhiều reservation đúng một lần, reject không có tài nguyên, reject trạng thái không hợp lệ, lặp reject và rollback khi audit lỗi. Browser kiểm riêng trên PostgreSQL: lượng khả dụng 8 → 6 → 8, lượng giữ 0 → 2 → 0, UAV AVAILABLE → ASSIGNED → AVAILABLE.

**Ghi chú vượt dung lượng timeline:** reject/conflict/complete với 501 ký tự gây `DataIntegrityViolationException`; 500 ký tự thành công. UI và service client nay chặn quá 500. `failureNotes` riêng vẫn 2.000, `equipmentCondition` 500. **Giới hạn:** API trực tiếp vượt 500 vẫn có hành vi persistence cũ; chưa thêm backend DTO validation/schema. Các test âm chứng minh hiện trạng và rollback, không phải khẳng định backend đã trả 400 thân thiện.

**Response đến muộn:** trước đây load cũ có thể ghi đè snapshot sau mutation. Trang Operations nay chỉ nhận response của lần load mới nhất, vô hiệu hóa load cũ khi mutation/upload bắt đầu, khóa retry khi đang xử lý, reset theo mission id. Kiểm thử có điều khiển lỗi timeline 503 và giữ response GET thật cũ, xác nhận qua UI rồi trả response cũ; trạng thái mới phải còn nguyên. Đây là kiểm thử lỗi mạng có kiểm soát, tách khỏi luồng không giả lập.

**Tìm UAV theo serial:** kiểm thử thật phát hiện serial hiển thị trong bảng nhưng nhập serial vào ô tìm kiếm không ra dòng tương ứng, vì bộ lọc chỉ đọc model. Đã đưa cả model và serial vào giá trị lọc, giữ cách trình bày ô như cũ. Kiểm tra lại theo serial và lịch sử UAV trên build mới.

## 4. Kết quả kiểm tra

Bảng và số lượng cuối được đối chiếu trong `evidence/tests/ba-workflows-2026-10-15/summary.json`.

| Nhóm | Kết quả | Evidence |
|---|---|---|
| Root: 4 apps + 7 packages lint/typecheck/test/build | PASS — 55 test executions | root-gates.json, root-*.log |
| Legacy frontend lint/typecheck/test/build | PASS — 7 tests | legacy-gates.json, legacy-*.log |
| Maven đầy đủ, PG stabilization/migration, MinIO thật | PASS — 212 tests, 0 failure/error/skip | backend-rejection-summary.json, backend-maven-full-sanitized.log |
| Luồng tạo → submit → confirm → assign → accept → ready → start → media → complete → customer/audit | PASS — 27 checks | browser-result.json |
| Customer mở rộng | PASS — 12 checks, gồm setup/read-back được ghi rõ | customer-extended-result.json |
| Operations mở rộng | PASS — 13 checks, gồm setup/read-back được ghi rõ | operations-extended-result.json |
| Ownership/stale submit/cancel | PASS — 5 checks | negative-result.json |
| Responsive + logout/guard | PASS — 15 viewport cases + 3 portal logout/guard | visual-result.json |
| Operations sau sửa tìm serial: lint/typecheck/test/build | PASS | operations-final-gates.json |
| Tìm UAV theo model và serial | PASS — cùng một UAV tìm được bằng cả hai | operations-uav-search-found.json |
| Lịch sử kho/UAV nhiều trang | PASS — 7 checks, có API setup | operations-history-result.json |
| Public web, response đến muộn, note boundary | PASS — 3 checks | final-ui-result.json |
| Staging, CI hosted, SSO/CSRF, full security scan | NOT RUN trong lượt này | Giữ mở; không suy từ local PASS |

Các lần đầu bị lỗi locator/synchronization của harness được sửa rồi chạy lại. Không sửa kỳ vọng nghiệp vụ để biến lỗi sản phẩm thành PASS. Tình huống âm 403/409 và 503 tổng hợp có chủ đích được phân loại riêng; không tính là lỗi không mong đợi.

## 5. Lệnh/endpoint đã thực thi

- Node 20.20.2; `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` tại root và legacy. Build đặt `NEXT_PUBLIC_API_URL=http://127.0.0.1:18080`.
- Backend: `./mvnw test` với cờ opt-in PostgreSQL/MinIO, cấu hình bí mật được cấp riêng; targeted `MissionRejectionIntegrationTest` và các integration hiện có.
- Các script browser được lưu trong thư mục evidence `scripts/`; chỉ đọc thông tin đăng nhập từ fixture riêng, không ghi token/storage state/signed URL.
- UI dùng các endpoint mission hiện có: POST `/api/v1/missions`, PATCH `/{id}`, POST `/{id}/submit`, `/confirm`, `/assign-station`, `/assign-uav`, `/assign-operator`, `/reserve-equipment`, `/accept`, `/report-conflict`, `/ready`, `/start`, `/complete`, `/fail`, `/reject`, `/cancel`; GET chi tiết/timeline/media; đăng ký/confirm/link media và tải bytes từ MinIO.
- GET inventory/UAV history với `page=1`; POST tạo thiết bị, stock-in/status làm fixture lịch sử.
- Login/logout và guard qua ba portal; audit admin. Không gọi auth localStorage bearer là SSO. Không đo lại natural-expiry refresh trong lượt này; evidence trước vẫn có ngày/phạm vi riêng.

## 6. Đối chiếu UAT BA và phần chưa hoàn tất

- **UAT-X06:** PASS cục bộ cho sửa sau submit, 409/no overwrite/status reload. Không chứng minh chống ghi đè giữa hai bản DRAFT tuần tự: payload PATCH chưa mang version/If-Match.
- **UAT-X13:** PASS cục bộ cho reject sau phân công một phần; transaction/rollback và browser số dư có evidence.
- **UAT-X15:** PARTIAL. UI đã xác minh fail ở IN_PROGRESS; logic hiển thị ở RESOURCE_RESERVED/READY có unit tests. Chưa chạy đầy đủ ba trạng thái với lệnh lặp theo đúng toàn bộ UAT-X15.
- **UAT-X16:** PARTIAL. UI terminal ẩn mutation được kiểm tra; chưa xác minh toàn bộ API terminal upload/link/accept/conflict.
- **FR-10/FR-24 còn policy gap:** gán UAV vào trạm đang đổi AVAILABLE → ASSIGNED trong khi mission assignment đòi AVAILABLE. Chưa tự quyết định lại ý nghĩa hai trạng thái.
- **Bảo trì UAV còn gap:** source cho phép chuyển MAINTENANCE từ mọi trạng thái, kể cả ASSIGNED/IN_USE. Được xác nhận qua code review, chưa runtime test/đổi chính sách trong lượt này.
- Unassign/reassign có hoàn trả tài nguyên, bắt buộc media trước complete, timezone policy, backend validation đồng bộ, toàn bộ permission matrix và giao dịch đồng thời vẫn cần triển khai/kiểm thử riêng theo BA.
- Audit hiện lọc trong trang; không gọi là tìm toàn bộ audit. Load/performance, Safari/Firefox, accessibility toàn diện, staging browser, hosted CI gate, supply-chain audit và security coverage đầy đủ chưa được nghiệm thu ở lượt này.
- SSO/CSRF giữ nguyên phạm vi thiết kế chưa triển khai. Nếu cần đổi auth contract sẽ báo người dùng trước.

## 7. Evidence và dọn dẹp

Evidence chỉ gồm path/method/status, ID/số lượng synthetic, logs kiểm thử đã lọc và ảnh giao diện không chứa bí mật. Không lưu access/refresh token, password, signed URL hoặc storage state. Nguồn ảnh tại `/Volumes/D/Codex/outputs/uav-ba-workflows-20261015/`; một số ảnh đại diện được kèm thư mục evidence.

Đã dọn môi trường disposable; kết quả cleanup và `git diff --check` được ghi trong `summary.json`. Chỉ dừng process/container/volume thuộc lượt thử; các dịch vụ khác trên máy được giữ nguyên. Source/product được sửa trong phạm vi người dùng đã yêu cầu, nên lượt này không phải documentation-only.
