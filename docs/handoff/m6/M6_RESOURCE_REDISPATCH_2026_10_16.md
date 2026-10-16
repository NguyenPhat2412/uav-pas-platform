# UAV PAS — Điều phối lại operator, trạm và thiết bị

Ngày kiểm chứng: 16/10/2026. **Phạm vi chức năng này: COMPLETE trong môi trường cục bộ cô lập. Toàn dự án: PARTIAL / NOT_READY.**

## Baseline và phạm vi

- Repository: `/Volumes/D/Codex/projects/uav-pas-platform`; branch `codex/m1-monorepo-foundation`; baseline `86bdd1244d63d2dc78fa315a6e785aeee36f5e55`, working tree sạch khi bắt đầu.
- Người dùng yêu cầu hoàn thiện điều phối lại operator, trạm, thiết bị, kiểm tra trên giao diện, xử lý lịch trùng và hoàn trả; sau đó yêu cầu commit/push khi kiểm tra xong.
- Backend `18080`, PostgreSQL `55444`, MinIO `9014/9015`, bốn frontend `3100–3103`; Compose project riêng `uav-resource-redispatch-20261016`; toàn bộ tài khoản và dữ liệu kiểm thử là synthetic. Không dùng port 8080 hoặc production.
- Đối chiếu SHA-256 **661 tệp nguồn**; **89 tệp auth/config/schema/dependency giữ nguyên**. Không đổi token, refresh, logout, CORS, cookie, permission registry hoặc auth contract. Không thêm dependency hay migration.

## Chức năng đã hoàn thiện

1. **Người vận hành:** thay hoặc gỡ trước bay; chọn người có đúng vai trò, đang hoạt động và không bị khóa. Giao diện kiểm tra lịch trước khi xác nhận, backend kiểm tra lại trong giao dịch. Lịch liền kề được phép, lịch chồng lấn bị chặn; không tính chính nhiệm vụ đang điều phối là lịch trùng.
2. **Trạm:** thay/gỡ có lý do. Khi đổi trạm, phải gỡ UAV hoặc hoàn trả thiết bị không phù hợp với trạm mới trước. Gỡ trạm yêu cầu gỡ UAV và trả hết thiết bị đang giữ. Không ngầm giải phóng tài nguyên bằng quyền gán trạm. Giữ nguyên người vận hành.
3. **Thiết bị:** xem từng khoản đang giữ và các khoản đã trả; thay thiết bị, tăng/giảm số lượng hoặc hoàn trả toàn bộ khoản được chọn. Đổi số lượng được thực hiện bằng trả khoản cũ và giữ khoản mới trong cùng giao dịch; lưu lại khoản cũ để tra cứu.
4. **Trạng thái:** chỉ áp dụng ở CONFIRMED, RESOURCE_RESERVED, READY. Thay đổi đặt lại tiếp nhận/vướng mắc operator; quay về RESOURCE_RESERVED nếu đủ tài nguyên, hoặc CONFIRMED nếu còn thiếu. Không tự chuyển READY; giữ chính sách hiện tại chưa bắt buộc accept trước READY.
5. **Màn hình cũ và lặp thao tác:** dùng phiên bản mission lấy cùng snapshot tài nguyên; thay đổi số lượng cũng tăng phiên bản. Yêu cầu cũ nhận 409, giao diện tải lại. Sau mất phản hồi, tải trạng thái đã lưu trước khi cho thao tác tiếp; không hoàn trả hai lần.
6. **Kho và lịch sử:** khóa mission và tài nguyên theo thứ tự nhất quán; kiểm tra tổng giữ của các nhiệm vụ. Hoàn trả kho chung không được lấy phần đang giữ cho mission. Audit, timeline, biến động kho và phân công rollback cùng nhau. Timeline tiếng Việt giữ nguyên lý do; metadata ghi đúng khoản giữ, thiết bị và số lượng trước/sau.

Trạm hiện được dùng chung, không có chính sách độc quyền trạm hoặc giới hạn số chuyến đồng thời. Kho dùng số lượng giữ thực tế hiện hành, chưa phải bộ lập lịch tồn kho theo khoảng thời gian tương lai. Tài nguyên chưa gán trạm được giữ theo chính sách dùng chung sẵn có. Không tự bổ sung chính sách kinh doanh chưa được thống nhất.

## Lỗi đã tái hiện và sửa

- Gán tài khoản bị khóa hoặc tài khoản khách hàng làm operator.
- READY chấp nhận danh sách thiết bị rỗng do `allMatch` trên danh sách rỗng.
- READY không phát hiện operator bị khóa sau phân công.
- START không kiểm tra lại trạm/tài nguyên sau READY.
- Hoàn trả kho chung có thể làm lệch phần thiết bị thuộc nhiệm vụ; đã bổ sung bảo vệ và hướng dẫn tiếng Việt trên UI.
- Luồng mới ban đầu ghi lý do 500 ký tự vào cột note kho chỉ chứa 255: kiểm thử H2 và PostgreSQL tái hiện lỗi. Đã sửa bằng tham chiếu ngắn trong biến động kho; lý do đầy đủ vẫn ở timeline/audit, không cắt nội dung.
- Bổ sung dịch tên sự kiện và giữ lý do các thay đổi mới trên timeline; lọc thiết bị bảo trì khỏi lựa chọn mới.

## Kết quả kiểm chứng cuối

| Nhóm | Kết quả | Lệnh/thao tác | Evidence |
|---|---|---|---|
| Maven đầy đủ, có PostgreSQL/MinIO | PASS — **494 tests, 0 failure/error/skip** | `./mvnw -Duav.build.directory=<isolated-target> test` qua script `backend-tests.py` | `backend-verified-summary.json`, `backend-verified-sanitized.log` |
| Điều phối mới trên H2 và PostgreSQL | PASS — **25 ca × 2 database**; nằm trong 494 | `MissionResourceRedispatchIntegrationTest`, `MissionResourceRedispatchPostgresTest` | Hai suite trong summary Maven |
| Root: web/customer/operations/admin và shared packages | PASS — lint/typecheck/test/build; **76 lượt test** | `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` | `root-gates.json`, `root-*.log` |
| Legacy frontend | PASS — bốn gates; **7 tests** | Cùng bốn lệnh tại `frontend/` | `legacy-gates.json`, `legacy-*.log` |
| Luồng nghiệp vụ trình duyệt và API bổ trợ | PASS — **21 nhóm** | `node work/uav-resource-redispatch-20261016/browser-redispatch.mjs` | `browser-redispatch.json` |
| Nhật ký quản trị trên UI | PASS — **2 nhóm**, đủ 6 loại điều phối của đúng mission | `node work/uav-resource-redispatch-20261016/browser-audit.mjs` | `browser-audit.json` |
| Health/readiness và đúng backend đang chạy | PASS | GET `/actuator/health`, `/actuator/health/readiness`; xác minh process group sở hữu listener | `runtime-verified.json` |
| Auth contract/config/schema/dependencies | PASS — 89 tệp không đổi | So sánh byte với baseline Git | `source-manifest.json` |
| Dọn runtime và vệ sinh Git | PASS sau bước đóng gói | Dừng tiến trình sở hữu, xóa Compose/volumes riêng; `git diff --check` và kiểm tra staged | `cleanup.json`, `summary.json` |
| Staging/hosted CI/full security scan/SSO/CSRF | **CHƯA KIỂM CHỨNG trong lượt này** | Không thay auth contract, không deploy | Các báo cáo readiness/security M6 giữ nguyên giới hạn |

Không cộng các lượt chạy trước/sau hoặc lặp vào tổng cuối. Evidence nằm tại `evidence/tests/resource-redispatch-2026-10-16/`.

### Phạm vi UI và concurrency

Khách tạo mission → gửi xác nhận → admin xác nhận/gán tài nguyên → operator nhận → READY → phát hiện người thay có lịch trùng → giải phóng lịch thử nghiệm → thay operator → giảm/tăng thiết bị → kiểm tra hai tab và mất phản hồi → thay/hoàn trả thiết bị → đổi/gỡ/gán trạm → gỡ/gán operator → bố trí UAV và thiết bị mới → operator nhận/START → upload MinIO → COMPLETE → trả đủ thiết bị → khách xem timeline/tải kết quả → admin xem audit.

Kiểm tra thêm trên UI kho: thao tác giải phóng chung nhận 409 khi thiết bị thuộc nhiệm vụ, hiện đúng hướng dẫn, số dư không đổi. Mobile 375×812 kiểm tra biểu mẫu đổi thiết bị, các nút xác nhận và không tràn ngang; desktop 1440×1000. Đây không phải chứng nhận toàn bộ viewport/accessibility.

Maven kiểm tra: tranh cùng operator giữa API mới và API gán cũ; lịch liền kề/chồng lấn; hai nhiệm vụ tranh một lô thiết bị; hai thay đổi từ cùng snapshot; hoàn trả đồng thời hủy; khoản giữ thuộc mission khác; số dư không nhất quán; rollback khi audit lỗi; sai quyền, trạng thái và giới hạn ghi chú. Permission trên HTTP còn được kiểm tra bằng customer B và operator, không coi việc ẩn nút là kiểm soát quyền.

Browser dùng Playwright/Chromium vì không có browser skill/plugin chuyên dụng trong phiên. Fixture và một số read-back/negative tests dùng API, được ghi rõ trong từng nhóm; không gọi toàn bộ 21 nhóm là thao tác UI thuần túy. Không mock API nghiệp vụ. Ca mất phản hồi dùng phản hồi backend đã commit rồi ngắt kết nối có chủ đích.

### Endpoint mới và quyền hiện có

| Endpoint dưới `/api/v1/missions/{id}` | Quyền | Nội dung |
|---|---|---|
| GET `/dispatch-resources` | MISSION_VIEW + visibility mission | Mission, version và từng khoản thiết bị đang giữ/đã trả |
| POST `/redispatch-operator` | MISSION_ASSIGN_OPERATOR | expectedVersion, replacementId (null = gỡ), reason |
| POST `/redispatch-station` | MISSION_ASSIGN_STATION | expectedVersion, replacementId (null = gỡ), reason |
| POST `/redispatch-equipment` | MISSION_RESERVE_EQUIPMENT | expectedVersion, reservationId, replacementId, quantity, reason; null replacement/quantity = hoàn trả |

`assign-station` cũ chỉ dùng khi chưa gán trạm; điều phối lại dùng endpoint mới. `reserve-equipment` cũ kiểm tra trạm, khóa số dư và làm hết hiệu lực snapshot cũ. READY/START kiểm tra lại tài nguyên; cancel/fail/complete vẫn hoàn trả theo lifecycle cũ với bảo vệ số dư.

## Phân loại lỗi công cụ và giới hạn

- Năm ca regression đầu được viết và chạy trước sửa: **10/10 FAIL** trên hai database, không phải lỗi thiết lập. Giữ evidence `regression-before-*`.
- Một assertion rollback ban đầu tính cả audit của fixture tạo sau snapshot; đã sửa thứ tự fixture. Một kiểm thử kho cũ cần giữ đúng loại lỗi cho phần giữ thủ công; bản sửa vẫn bảo toàn hành vi cũ khi không có reservation mission.
- Script browser lần đầu gọi sai URL gán trạm UAV; URL thật là `/uavs/{id}/station/{stationId}`. Server hiện trả 500 cho URL tài nguyên không tồn tại này; xử lý 404 tổng quát là vấn đề riêng còn mở, không xảy ra trong luồng UI hợp lệ đã nghiệm thu.
- Hai lỗi harness khác: chưa đợi bảng audit tải và chọn label trùng với checkbox bảng kho; đã sửa chờ và selector đúng combobox.
- Một lần chạy chồng với build gây timeout. Đã chạy lại sau khi build kết thúc và khởi động lại cả bốn frontend. Script runtime cũ có thể nhận health của backend cũ; đã sửa để từ chối port bận và xác minh process group, rồi chạy lại toàn bộ luồng cuối trên bản mới.
- Console cuối có 3 favicon 404 và các 403/409/ERR_FAILED thuộc ca âm hoặc ngắt phản hồi có chủ đích. **Không có JavaScript exception hoặc API 5xx trong luồng cuối.**
- Không có npm audit/full security scan mới, staging HTTPS, SSO/CSRF, CI hosted, tải lớn hay rollout production trong lượt này. Không tuyên bố production-ready.

Bản sao hình ảnh và báo cáo cho người dùng: `/Volumes/D/Codex/outputs/uav-resource-redispatch-20261016/`.

## Đóng gói mã nguồn theo yêu cầu

- `85778d3`: backend điều phối, bảo vệ tài nguyên và kiểm thử hồi quy.
- `228cfd6`: giao diện Operations, nhãn tiếng Việt và kiểm thử frontend.
- Commit documentation/evidence theo sau hai commit nguồn trên. SHA-256 toàn bộ nguồn vẫn khớp bản đã kiểm thử. Không reset, merge, rebase, force-push hoặc deploy production.
