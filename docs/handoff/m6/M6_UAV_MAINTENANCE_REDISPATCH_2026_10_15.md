# UAV PAS — Bảo trì và điều phối lại UAV, 15/10/2026

> **Cập nhật tích hợp main — 16/10/2026:** xem [M6_MAIN_INTEGRATION_2026_10_16.md](M6_MAIN_INTEGRATION_2026_10_16.md) cho source và kiểm chứng mới nhất. Phần dưới giữ lịch sử của nhánh/lượt kiểm tương ứng; migration hồ sơ hiện là V10, bảo trì là V9, auth browser giữ cookie của main. Toàn hệ thống vẫn PARTIAL / NOT_READY.

**Ghi chú phiên bản:** đây là báo cáo lịch sử của lượt 297 backend tests. Lượt tiếp theo đã bổ sung lịch định kỳ theo ngày, phiếu sửa chữa và chi phí vật tư VND, không trừ kho, giữ nguyên auth contract; xem [báo cáo hiện tại](M6_MAINTENANCE_PLANNING_2026_10_15.md). Kết quả và giới hạn của lượt mới, gồm lỗi login đồng thời còn mở, được ghi riêng; không dùng số kiểm thử bên dưới làm số hiện tại.

**Phạm vi:** tiếp tục BA v2 và lượt hoàn thiện nghiệp vụ trước; ưu tiên thao tác trên giao diện Operations và lỗi tái hiện được. **Auth contract giữ nguyên.** Không commit, push, đổi lịch sử Git hoặc deploy. Kết quả cuối và dấu vân tay source nằm trong `evidence/tests/uav-maintenance-dispatch-2026-10-15/summary.json`.

## 1. Baseline và môi trường kiểm chứng

- Repository `/Volumes/D/Codex/projects/uav-pas-platform`; branch `codex/m1-monorepo-foundation`; HEAD `65d1b23da3d888d1ef8120462f2689da8cffd7cb`.
- Working tree đã có thay đổi từ các lượt trước. Giữ nguyên các thay đổi đó; manifest phân biệt file mới/sửa trong lượt này so với hash baseline, không dùng HEAD để đại diện toàn bộ source đã thử.
- PostgreSQL và MinIO disposable; backend `127.0.0.1:18080`, database `55444`, object storage `9014/9015`. Không chiếm cổng 8080.
- Bốn frontend standalone tại 3100–3103. Tài khoản customer/customer B/operator/operator B/admin, tài nguyên và nhiệm vụ đều synthetic.
- Chromium thật qua Playwright đã cài sẵn vì browser plugin không có trong phiên. Không cài/nâng dependency. Luồng chính không giả phản hồi API; fixture, thao tác đồng thời từ người dùng khác và API read-back được phân loại riêng.

## 2. Chức năng và chính sách đã thực hiện

| Nghiệp vụ | Hành vi hiện tại | Giới hạn / bảo vệ |
|---|---|---|
| Gán/điều chuyển trạm nhà | Chọn trạm và xác nhận; UAV AVAILABLE vẫn AVAILABLE | Trạm hoạt động, UAV rảnh, không có nhiệm vụ chưa kết thúc |
| Đưa vào bảo trì | Lý do, xác nhận, trạng thái MAINTENANCE và lịch sử | Chặn ASSIGNED/IN_USE và cả dữ liệu AVAILABLE nhưng đang thuộc nhiệm vụ |
| Hoàn tất bảo trì | Ghi kết quả kiểm tra, xác nhận về AVAILABLE | Lý do tối đa 255 ký tự; kiểm trạng thái dự kiến để chặn màn hình cũ |
| Khôi phục phân công cũ | Thao tác riêng đưa ASSIGNED vô chủ về AVAILABLE, giữ trạm | Chỉ khi không có nhiệm vụ chưa kết thúc; bắt buộc lý do và expectedStatus=ASSIGNED. Không cho khôi phục IN_USE |
| Thay UAV trước bay | Chọn UAV thay thế và lý do; trả UAV cũ, giữ trạm/operator/thiết bị | Chỉ CONFIRMED/RESOURCE_RESERVED/READY; UAV mới sẵn có, đúng trạm, không có chủ sở hữu đang hoạt động |
| Gỡ UAV trước bay | Gỡ UAV và trả về AVAILABLE; mission về CONFIRMED | Giữ tài nguyên khác; phải phân công UAV lại trước READY |
| Thay UAV ở READY | Đưa về RESOURCE_RESERVED khi còn đủ tài nguyên; đặt lại operatorAccepted/conflictNote | Cần kiểm tra lại điều kiện sẵn sàng. Hiện backend chưa bắt buộc operatorAccepted=true để READY |
| Màn hình cũ / yêu cầu đồng thời | Báo xung đột bằng tiếng Việt, tải lại thông tin mới, không ghi đè phân công mới | expectedCurrentUavId; khóa mission/UAV trong giao dịch, khóa UAV theo thứ tự ID |
| Timeline, audit và lịch sử UAV | Có sự kiện thay/gỡ, lý do và ID UAV cũ/mới | Lý do timeline tối đa 500 ký tự; metadata giữ ID, không ghép lý do thành chuỗi vượt cột |
| Giao diện mobile | Biểu mẫu xác nhận, nút và lý do vừa viewport 375px | Khóa thao tác trùng khi đang gửi; không đóng/switch drawer giữa mutation |

Thay/gỡ UAV là API nghiệp vụ mới, dùng **quyền hiện có `MISSION_ASSIGN_UAV`**. Bảo trì dùng `UAV_MANAGE` hiện có. Không thêm quyền, đổi JWT, phiên đăng nhập, refresh, cookie hoặc CORS.

## 3. Lỗi thực tế đã tái hiện và sửa

1. **Gán trạm làm UAV mất khả dụng:** trước đây AVAILABLE → ASSIGNED dù không có mission. Nay trạm nhà không chiếm dụng UAV; reservation thuộc nghiệp vụ mission.
2. **UAV bận vẫn vào bảo trì / sửa trạng thái thủ công:** chặn ASSIGNED/IN_USE và chủ sở hữu nhiệm vụ đang hoạt động. Đường chuyển trạng thái nội bộ mission được tách khỏi thao tác quản trị thủ công.
3. **Thao tác cũ hoặc tranh cùng UAV:** khóa và đọc lại dữ liệu trong transaction; yêu cầu thua trả 409. Thay UAV lỗi không làm mất UAV đang gán, không giải phóng kho/operator/trạm.
4. **Tiếp nhận/báo vướng mắc sau khi bay hoặc kết thúc:** entity chỉ cho phép CONFIRMED/RESOURCE_RESERVED/READY, không ghi thêm timeline khi bị từ chối.
5. **Sở hữu UAV trùng trong dữ liệu cũ:** READY/START kiểm lại mọi nhiệm vụ chưa kết thúc dưới khóa UAV. Khi trả tài nguyên cũng không đặt UAV của nhiệm vụ khác thành AVAILABLE.

6. **Thiếu/null số lượng phân công trả 500:** đổi riêng trường `quantity` của DTO nghiệp vụ sang kiểu nullable có `@NotNull`/`@Min(1)`. Các endpoint assign-station/UAV/operator/reserve-equipment trả 400 và không thay tài nguyên khi thiếu/null số lượng. Constructor nội bộ mặc định 1 giữ nguyên; không sửa global exception handler hoặc auth.
7. **Thông báo xung đột nằm ngoài vùng nhìn:** khi mutation thất bại, đưa focus/viewport tới thông báo lỗi; bản ghi mới được tải lại để người dùng kiểm tra trước khi thử lại.

Các summary `maintenance-test-summary.json`, `dispatch-before-summary.json` và `dispatch-owner-before-summary.json` ghi lỗi trước sửa, không chỉ là kiểm tra PASS sau sửa.

## 4. Kiểm chứng cuối

**Đợt chức năng này: COMPLETE trong phạm vi nêu trên. Toàn hệ thống: PARTIAL / NOT_READY.**

| Nhóm kiểm tra | Kết quả | Evidence |
|---|---|---|
| Root: 4 apps + 7 shared packages, lint/typecheck/test/build | PASS — 61 test executions | `root-gates.json`, `root-*.log` |
| Legacy frontend, lint/typecheck/test/build | PASS — 7 tests | `legacy-gates.json`, `legacy-*.log` |
| Maven đầy đủ, PostgreSQL stabilization/migration, MinIO và redispatch PostgreSQL | PASS — 297 tests; 0 failure/error/skip | `backend-suite-summary.json`, `backend-suite-sanitized.log` |
| Luồng tạo → submit → confirm → assign → accept → ready → start → media → complete → customer/audit | PASS — 27 checks | `browser-result.json` |
| Bảo trì/gán trạm/thay/gỡ/khôi phục phân công trên UI + desktop/mobile | PASS — 16 nhóm, trong đó 1 nhóm chỉ setup API | `maintenance-dispatch-ui-result.json` |
| Màn hình cũ, khôi phục vô chủ, fail 3 trạng thái, cancel 3 trạng thái, sai operator | PASS — 12 nhóm, có read-back/API fixtures được tách rõ | `browser-negative-result.json` |
| Validation, permission, trạng thái, cạnh tranh trên PostgreSQL qua HTTP | PASS — 8 nhóm | `api-negative-result.json` |
| Stale alert focus/viewport | Trước sửa FAIL có chủ đích; sau sửa PASS | `browser-negative-ux-before-result.json`, `browser-negative-result.json` |
| Auth source so baseline, branch/HEAD, diff, cleanup, evidence hygiene | PASS — source không đổi sau verification; môi trường thử đã dọn | `summary.json`, `source-manifest.json` |
| Staging/hosted CI/SSO-CSRF/full security/new npm audit | NOT RUN trong lượt này | Không suy ra từ local PASS |

Không cộng các targeted tests vào 297 vì chúng là các lần chạy lặp cùng ca; 61 frontend test executions có các structural tests được gọi lại ở nhiều workspace. Validation số lượng chỉ đóng trường hợp thiếu/null/không dương trong DTO phân công; không tuyên bố mọi JSON sai định dạng toàn API đã được xử lý. Các thử nghiệm API đồng thời không được gọi là browser E2E.

**Đối chiếu BA:** UAT-X15 đã có UI fail ở RESOURCE_RESERVED, READY và IN_PROGRESS trên bản cuối; mỗi ca kiểm lệnh fail lặp 409, trả tài nguyên một lần và ẩn thao tác terminal. UAT-X16 chỉ đóng phần accept/conflict sau terminal và ẩn mutation; toàn bộ API media sau terminal vẫn chưa nghiệm thu. Policy gán trạm/bảo trì và thay/gỡ UAV nêu trong báo cáo BA workflow trước được đóng trong phạm vi cục bộ này.

Các ca hủy/thất bại kiểm tài nguyên trước/sau và lệnh lặp, không chỉ kiểm nhãn trạng thái. Fixture dữ liệu ASSIGNED vô chủ được tạo bằng SQL trong database disposable để mô phỏng dữ liệu cũ; thao tác khôi phục sau đó thực hiện qua giao diện. Không sửa dữ liệu thật.

## 5. Lệnh và endpoint

- Root và legacy: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`; Node 20.20.2. Build dùng API cô lập 18080.
- Backend: `./mvnw -Duav.build.directory=<isolated test target> test`, opt-in PostgreSQL/MinIO. Target riêng cho server và test.
- `POST /api/v1/missions/{id}/replace-uav`: `{expectedCurrentUavId, replacementUavId, reason}`.
- `POST /api/v1/missions/{id}/unassign-uav`: `{expectedCurrentUavId, reason}`.
- `POST /api/v1/uavs/{id}/maintenance`, `PUT /api/v1/uavs/{id}/status`: bổ sung query `reason` và `expectedStatus` cho UI mới. POST maintenance cũ không body vẫn tương thích, lưu lý do mặc định.
- `PUT /api/v1/uavs/{id}/station/{stationId}`; GET lịch sử UAV, mission/timeline, kho và audit.
- Luồng hiện có: create/submit/confirm/assign/accept/ready/start/complete/fail/cancel; signed upload/download và đọc bytes synthetic từ MinIO. Không ghi signed URL vào evidence.
- Script tái chạy nằm trong thư mục evidence `scripts/`. Biến môi trường/fixture mật được tạo riêng, không đưa vào Git/evidence.

## 6. Giới hạn còn mở

- Tại thời điểm lượt này, bảo trì chỉ gồm **trạng thái, lý do và lịch sử**. Lịch định kỳ theo ngày, phiếu sửa chữa và vật tư/chi phí đã được bổ sung ở [lượt tiếp theo](M6_MAINTENANCE_PLANNING_2026_10_15.md); chữ ký kỹ thuật và kiểm định UAV thật vẫn ngoài phạm vi.
- Không thay operator/station/equipment hàng loạt; lần này điều phối lại **UAV**. Không thay/gỡ UAV khi đang bay hoặc mission đã kết thúc.
- Đặt lại tiếp nhận sau đổi UAV không có nghĩa backend bắt buộc operator phải tiếp nhận lại; đó vẫn là policy gap cần quyết định riêng.
- Hai tab sửa DRAFT tuần tự chưa có version/If-Match. Quy tắc media bắt buộc trước hoàn tất, toàn bộ API media sau terminal, timezone và validation mọi endpoint còn cần nghiệm thu riêng.
- Kết quả Chromium/local không chứng minh Safari/Firefox, staging, hiệu năng/tải, accessibility toàn diện hoặc toàn bộ permission matrix.
- Chưa chạy lại npm audit, full security scan hoặc hosted CI trong lượt này. SSO/CSRF giữ nguyên phần thiết kế chưa triển khai; bearer localStorage theo origin không phải SSO.
- Toàn hệ thống vẫn **PARTIAL / NOT_READY**; không tuyên bố production-ready từ kết quả local.

## 7. Evidence và cleanup

Evidence tại `docs/handoff/m6/evidence/tests/uav-maintenance-dispatch-2026-10-15/`; ảnh giao diện tại `/Volumes/D/Codex/outputs/uav-dispatch-20261015/`. Chỉ xuất method/path/status, ID/số lượng synthetic, log kiểm thử đã lọc và ảnh không chứa bí mật. Không lưu token, password, signed URL hoặc storage state. Kết quả dọn process/container/volume thuộc lượt thử, kiểm tra auth source và `git diff --check` được ghi trong summary cuối.
