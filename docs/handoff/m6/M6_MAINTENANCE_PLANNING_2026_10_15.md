# UAV PAS — Lịch bảo trì, phiếu sửa chữa và chi phí vật tư

**Cập nhật kế tiếp ngày 15/10/2026 — auth concurrency:** Báo cáo này giữ kết quả lịch sử của lượt bảo trì (356 backend tests), bao gồm lỗi login đồng thời và evidence FAIL trước sửa. Lỗi đó đã được sửa trong lượt auth kế tiếp: **M6-B9 RESOLVED trên môi trường cục bộ**, với 390/390 backend tests, 14/14 nhóm HTTP (813 phản hồi, không có 500) và 13/13 browser checks PASS. Xem [báo cáo auth concurrency](M6_AUTH_CONCURRENCY_2026_10_15.md) để biết bản vá, phạm vi và evidence cuối; các dòng “còn mở” phía dưới phản ánh thời điểm trước bản vá. Auth contract không đổi; toàn dự án vẫn **PARTIAL / NOT_READY** do các giới hạn SSO/CSRF, staging, hosted CI và full security coverage.

**Ngày:** 15/10/2026. **Yêu cầu:** tiếp tục BA và luồng UAV, bổ sung lịch định kỳ, phiếu sửa chữa và chi phí vật tư; kiểm tra qua giao diện và không đổi auth contract. Người dùng xác nhận ghi vật tư/số lượng/đơn giá VND trong phiếu, **chưa trừ kho thiết bị**.

## Phạm vi đã triển khai

Trang **Bảo trì và sửa chữa** tại Operations `/maintenance`, cùng liên kết từ chi tiết UAV. Hai danh sách phân trang theo UAV, trạng thái lịch hoặc phiếu; có trạng thái tải, rỗng, lỗi/thử lại, khóa thao tác đang gửi và xử lý dữ liệu cũ.

| Chức năng | Quy tắc thực hiện |
|---|---|
| Lịch định kỳ | Tên lịch, UAV, chu kỳ 1–3650 ngày, ngày đến hạn; tạo/sửa/tạm dừng/kích hoạt lại. Có thể có nhiều lịch cho một UAV |
| Đến hạn/quá hạn | Tính theo ngày Việt Nam (`Asia/Ho_Chi_Minh`); lọc UPCOMING/DUE/OVERDUE/PAUSED. Đây là nhắc việc trong ứng dụng, không tự khóa UAV hoặc tự gửi thông báo |
| Kỳ kế tiếp | Chỉ khi phiếu liên kết hoàn tất: ngày hoàn tất + chu kỳ. Không dùng `lastMaintenanceAt` cũ vì trường đó ghi thời điểm bắt đầu. Các lịch khác không đổi |
| Phiếu sửa chữa | Phiếu theo lịch hoặc đột xuất; tiêu đề, mô tả, ngày dự kiến, người phụ trách; OPEN → IN_PROGRESS → COMPLETED, hoặc CANCELLED |
| UAV bận | Có thể lập phiếu OPEN để lên kế hoạch, nhưng không bắt đầu khi UAV đang thuộc nhiệm vụ chưa kết thúc |
| Bắt đầu sửa | Giữ UAV ở MAINTENANCE; một UAV chỉ có tối đa một phiếu OPEN/IN_PROGRESS, kể cả hai yêu cầu đồng thời |
| Hoàn tất | Bắt buộc kết quả kiểm tra và xác nhận đã kiểm tra; cập nhật phiếu, UAV AVAILABLE, lịch liên kết và audit trong một giao dịch |
| Hủy | Hủy OPEN không đổi UAV; hủy IN_PROGRESS vẫn giữ MAINTENANCE. Chi phí đã ghi và ngày đến hạn được giữ nguyên |
| Vật tư | Thêm/sửa/xóa dòng tên, đơn vị, số lượng, đơn giá. Tối đa 100 dòng; số lượng >0, tối đa 10000 và 3 số lẻ; giá 0–1.000.000.000 VND nguyên |
| Tiền | Server dùng BigDecimal, làm tròn HALF_UP từng dòng đến đồng rồi cộng tổng; DTO trả chuỗi số chuẩn. Không nhận tổng tiền từ client. Tổng trần theo giới hạn dòng là 10^15 VND |
| Phiếu đã đóng | Không sửa thông tin/vật tư, không bắt đầu/hoàn tất lặp. Lưu trạng thái, người ghi qua audit, thời điểm và nội dung để tra cứu |
| Phiên bản cũ | Mọi sửa đổi yêu cầu expectedVersion; xung đột 409 không ghi đè. Chi phí chỉ được tính/hiển thị là đã lưu sau phản hồi thành công |
| Quyền riêng tư | Mọi endpoint mới, kể cả đọc giá, dùng **UAV_MANAGE** hiện có. Không dùng UAV_READ vì khách hàng có quyền đó. Lịch sử đội UAV chỉ ghi ID phiếu và bắt đầu/hoàn tất, không chứa giá/chẩn đoán |

Tên người phụ trách là nội dung ghi trong phiếu; danh tính tài khoản thực hiện thao tác được ghi trong audit. Xác nhận kiểm tra là xác nhận của người dùng, không phải chứng nhận kiểm định tự động.

## Thiết kế, migration và tương thích

- Thiết kế API/quy tắc chi tiết: [UAV_MAINTENANCE_PLANNING_DESIGN.md](../../architecture/UAV_MAINTENANCE_PLANNING_DESIGN.md).
- Flyway **V3** thêm `maintenance_schedules`, `repair_orders`, `repair_materials`; giữ nguyên V1/V2. Có unique partial index bảo vệ một phiếu hoạt động/UAV trên PostgreSQL.
- Khóa UAV trước rồi mới khóa phiếu/lịch; không lấy khóa mission sau UAV. Cập nhật vật tư làm tăng version phiếu, kể cả danh sách rỗng hoặc giá trị không đổi; flush trước khi trả DTO.
- API UAV cũ không thể đưa UAV về AVAILABLE hoặc chuyển trạm để vượt qua phiếu IN_PROGRESS. OPEN chỉ là kế hoạch, không giữ khả dụng của UAV.
- Auth, JWT, refresh, CORS, registry quyền và dependency giữ nguyên. Không commit/push/reset/merge/rebase hoặc deploy.
- Baseline branch `codex/m1-monorepo-foundation`, HEAD `65d1b23da3d888d1ef8120462f2689da8cffd7cb`; working tree đã có thay đổi từ các lượt trước. `source-manifest.json` phân biệt thay đổi của lượt này và xác định source được kiểm thử.

## Kiểm chứng và lỗi tìm được

Kết quả cuối trong [summary.json](evidence/tests/maintenance-planning-2026-10-15/summary.json). Các test targeted chạy lặp không cộng thêm vào tổng Maven; số nhóm browser không tương đương số assertion hay toàn bộ coverage sản phẩm.

| Nhóm kiểm tra | Kết quả | Lệnh / thao tác thực tế | Evidence trong thư mục lượt này |
|---|---|---|---|
| Root: 4 apps + 7 shared packages | **PASS** | `npm run lint/typecheck/test/build`; 73 lượt test thực thi trong workspace | `root-gates.json`, `root-*.log` |
| Legacy frontend | **PASS** | Bốn lệnh tương ứng dưới `frontend`; 7 tests; không chạy lại full legacy browser | `legacy-gates.json`, `legacy-*.log` |
| Full backend + PostgreSQL/MinIO | **PASS** | `./mvnw -Duav.build.directory=<isolated target> test`; 356 tests, 0 fail/error/skip, có fresh schema và V2→V3 | `backend-suite-summary.json`, `backend-suite-sanitized.log` |
| API bảo trì mới | **PASS — 9 nhóm** | `/maintenance/schedules`, `/orders`, `/start`, `/materials`, `/complete`, `/cancel`; DB thật, concurrent requests | `api-maintenance-result.json` |
| UI luồng bảo trì chính | **PASS — 14 nhóm** | Tạo/sửa/tạm dừng lịch, lập phiếu, vật tư, bắt đầu, nghiệm thu mobile, hủy, lịch sử; gồm 1 nhóm setup API | `maintenance-happy-ui-result.json` |
| Nhánh âm UI | **PASS — 10 nhóm** | Hai tab sửa cũ, UAV bận, lịch có phiếu, hủy đang sửa giữ chi phí, lọc/phân trang, mobile, 403; gồm 1 nhóm setup API | `browser-maintenance-negative-result.json` |
| Nhật ký tiếng Việt | **PASS — 2 nhóm** | Tra cứu hoàn tất phiếu và cập nhật lịch, actor/time, nhãn và diễn giải tiếng Việt | `maintenance-audit-ui-result.json` |
| Phân trang sau thay đổi trạng thái | **PASS — 1 nhóm** | Tạm dừng mục cuối trang 2, trở về trang hợp lệ, 20 thẻ và tổng 20 lấy lại từ server | `maintenance-pagination-result.json`; hai file `*-before-result.json` giữ lỗi thật trước sửa |
| Mission E2E hồi quy | **PASS — 27 nhóm** | Customer tạo/submit → admin confirm/assign → operator accept/start/upload/complete → customer timeline/download → admin audit | `browser-result.json` |
| Bảo trì thủ công/điều phối hồi quy | **PASS — 16 nhóm** | UI giữ AVAILABLE khi gán trạm, bảo trì có lý do, thay/gỡ UAV và trạng thái nhiệm vụ; gồm 1 nhóm setup API | `maintenance-dispatch-ui-result.json` |
| API điều phối hồi quy | **PASS — 8 nhóm** | Input validation, stale command, concurrent assignment/replacement/maintenance, IN_PROGRESS guards | `api-negative-result.json` |
| Login đồng thời cùng tài khoản | **FAIL — còn mở** | Hai `POST /api/v1/auth/login` đồng thời; 6/6 vòng một 200, một 500 | `auth-concurrency-observation.json` |
| Auth contract, baseline và cleanup | **PASS** | Hash auth/security/V1/V2/lockfile không đổi; branch/HEAD giữ nguyên; dọn runtime/container/volume/secret; `git diff --check` | `source-manifest.json`, `summary.json` |
| Staging/SSO/CSRF/hosted CI/full security | **BLOCKED / chưa nghiệm thu trong lượt này** | Không có thay đổi auth contract hoặc triển khai staging/production; không chạy lại full security scan/npm audit | Các giới hạn bên dưới và các báo cáo M6 liên quan |

**Kết luận phạm vi yêu cầu: COMPLETE. Toàn dự án: PARTIAL / NOT_READY.** Các suite API/browser chạy trên cùng source final đã build; fingerprint sau build cuối và sau kiểm chứng khớp. Full Maven được chạy trên backend final; các sửa sau đó chỉ ở frontend. Những ca âm kỳ vọng 400/403/409 được kiểm cả dữ liệu không đổi; lỗi auth 500 được phân loại FAIL riêng, không gộp vào PASS.


- **Migration thực tế:** kiểm fresh schema và nâng V2→V3, bảo toàn UAV/trạm/kho cũ; kiểm partial unique index trả SQL23505 khi chèn phiếu hoạt động trùng.
- **H2:** không chạy Flyway PostgreSQL-specific partial index; dùng Hibernate create-drop cho kiểm thử H2. Toàn bộ migration/index được kiểm riêng trên PostgreSQL, không bỏ qua gate PostgreSQL để lấy PASS.
- **DTO số lượng:** chuẩn hóa chuỗi số để mutation và đọc lại từ DB không khác `1`/`1.000`; không nhầm khác biệt định dạng với lỗi rollback.
- **Quy ước kiến trúc:** lượt full Maven đầu phát hiện controller/repository mới chưa ở đúng package. Đã chuyển toàn bộ module về đúng lớp chức năng, không sửa yếu `ArchitecturePackageTest`; build lại bằng target sạch tránh class cũ.
- **Biểu mẫu cũ:** sửa map thông báo lỗi và khóa biểu mẫu sửa lịch khi xung đột; đóng/mở lại từ danh sách mới, không tiếp tục gửi version cũ.
- **Nhật ký:** phát hiện mã kỹ thuật của lịch/phiếu hiện trực tiếp trên UI; bổ sung nhãn và diễn giải tiếng Việt, giữ khả năng tra cứu giá trị gốc.
- **Phân trang sau thay đổi trạng thái:** tạm dừng lịch cuối ở trang 2 của bộ lọc quá hạn khiến trang trống, không còn nút quay lại dù còn 20 lịch. Đã đưa trang hiện tại về phạm vi còn hợp lệ. Kiểm tra tiếp phát hiện trang đích lấy cache cũ, vẫn hiện tổng 21; đã làm hết hiệu lực cache danh sách trước khi tải lại. Ca cuối kiểm cả 20 thẻ và tổng 20, không chỉ kiểm trang hết trống. Hai kết quả lỗi trước sửa được giữ riêng trong evidence.

### Lỗi auth ngoài phạm vi bảo trì — còn mở

Hai login đồng thời cho **cùng tài khoản synthetic** được thử sáu lần; mỗi lần có một 200 và một 500 do unique constraint `refresh_tokens_user_id_key`. Auth source không thay đổi so baseline. Đây là lỗi thật đã tái hiện, **không phải lỗi locator/harness**, và không được tính là PASS. Lần kiểm tra phát hiện khi hai script cùng đăng nhập; các suite nghiệp vụ được chạy tuần tự để kiểm phần bảo trì riêng. Evidence `auth-concurrency-observation.json` chỉ lưu status và tên constraint, không lưu response/token/password.

Lỗi này cần lượt xử lý concurrency auth riêng. Không suy từ việc login đơn lẻ hoặc bộ unit tests PASS rằng auth đồng thời đã an toàn.

## Môi trường và lệnh tái chạy

PostgreSQL/MinIO disposable thuộc Compose `uav-maint-planning-20261015`; backend `127.0.0.1:18080`; database 55444; MinIO 9014/9015; bốn frontend 3100–3103. Không dùng port 8080. Dữ liệu và tài khoản đều synthetic. Không có hệ thống bay thật hoặc dữ liệu sản xuất.

- Root/legacy: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, Node 20.20.2.
- Backend: `./mvnw -Duav.build.directory=<isolated target> test`, bật PostgreSQL/MinIO opt-in. Build target backend runtime và test tách riêng.
- Browser plugin không có trong phiên; dùng Playwright/Chromium đã cài, desktop 1440px và mobile 375×812. Không cài dependency mới.
- API mới: GET/POST `/api/v1/maintenance/schedules`, PUT `/schedules/{id}`; GET/POST `/orders`, GET/PUT `/orders/{id}`, POST `/start`, PUT `/materials`, POST `/complete`, POST `/cancel` dưới `/orders/{id}`.
- Các script evidence phân biệt API tạo fixture/read-back, SQL fixture và thao tác UI; không gọi kiểm thử API là browser E2E. Luồng chính dùng API/PostgreSQL/MinIO thật, không giả phản hồi thành công.

## Giới hạn và kết luận

Phạm vi này chưa gồm lịch theo giờ bay/số chu kỳ bay, tháng/năm theo lịch, email/push tự động, phiếu mua vật tư, kho vật tư/giá vốn, thuế/hóa đơn/thanh toán, chi phí nhân công, tệp chứng từ hoặc ký duyệt kỹ thuật. Lịch chỉ nhắc việc trong ứng dụng; quá hạn không tự chặn nhiệm vụ.

SSO/CSRF, staging browser, hosted CI, toàn bộ security coverage, kiểm tải và Safari/Firefox chưa được nghiệm thu trong lượt này. Chưa chạy lại npm audit. Lỗi login đồng thời nêu trên còn mở. Toàn dự án vẫn **PARTIAL / NOT_READY**, không tuyên bố production-ready.

Evidence đã loại secret tại `docs/handoff/m6/evidence/tests/maintenance-planning-2026-10-15/`; ảnh tại `/Volumes/D/Codex/outputs/uav-maintenance-planning-20261015/`. Cleanup, source freeze, branch/HEAD và `git diff --check` được xác nhận trong summary cuối.

Cleanup cuối: backend và bốn frontend do lượt này mở đã dừng; Compose disposable, volume và test target thô đã xóa; credential/raw private log đã xóa. Port 8080 không được sử dụng. Không commit/push/deploy. `sourceFreeze`, `evidenceHygiene`, `diffCheck` đều PASS trong summary.
