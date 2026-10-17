# UAV PAS — Hoàn thiện ưu tiên và kiểm chứng ngày 17/10/2026

**Phân loại toàn hệ thống: PARTIAL. Sẵn sàng sản xuất: NOT_READY.** Các ưu tiên triển khai trong phạm vi cục bộ đã qua kiểm thử và bản tích hợp đã được mở trên localhost. Kết quả này không chứng nhận HTTPS staging, SSO liên miền, nhà cung cấp thanh toán hay UAV vật lý.

## Bản nguồn và phạm vi

Thư mục duy nhất: `/Volumes/D/Codex/projects/uav-pas-platform` (đường dẫn `/Volumes/D/uav_platform` là alias). Nhánh `codex/m1-monorepo-foundation`, HEAD `55db26eabb0a4a0bc6b3454eb931bc3671c4ef0f`; kết quả áp dụng cho HEAD cộng các thay đổi chưa commit, được nhận diện bằng manifest. Không commit/push, reset, rebase, force-push hoặc deploy production trong gói công việc này. Giữ cơ chế cookie/bearer/CSRF đã có; không thiết kế lại auth contract.

Root có ba thư mục sản phẩm `frontend`, `backend`, `docs`; workflow nằm trong `.github`. Frontend gồm bốn app mới, bảy shared packages và legacy; backend là một ứng dụng Spring Boot modular monolith. PostgreSQL và MinIO là hạ tầng dữ liệu, không phải các microservice nghiệp vụ được tách mới.

Backend cuối: 445 tệp nguồn khớp manifest, 726 kiểm thử với **0 failures, 0 errors, 0 skips**, 94 báo cáo XML. Đối chiếu 109 path/130 operation OpenAPI không đổi request/response schema, parameter và security; bỏ qua nhãn tài liệu/tên component khi so sánh. Review cuối PASS/APPROVE, không phát hiện Critical/Important mới trong các vùng đã đọc; không phải kiểm toán mọi dòng mã.

**Mốc nguồn:** LIVE_MAIN_PASS và202hash frontend áp dụng tại thời điểm chuyển bản chính. Sau mốc này, chủ dự án yêu cầu riêng phiên runtime bổ sung ảnh con người/UAV trên frontend. Các thay đổi ảnh có manifest/build/browser evidence riêng; không gọi 202hash cũ là kiểm chứng mọi byte frontend mới. Backend445hash vẫn khớp; nhánh/HEAD giữ nguyên, `git diff --check` PASS. Xem `final-integrity-check.json` cho phạm vi sai khác được biết.

**Cập nhật ảnh sau mốc chuyển bản chính:** phiên runtime đã hoàn thành yêu cầu ảnh con người/UAV:3 ảnh tạo mới,25 tệp nguồn/tài sản;5 buildfrontend,lint,151contracts,14preview và23livechecksPASS. Backendprocess/dữliệunghiệpvụ không đổi. Root đối chiếu hợp nhất202path nền với25path overlay thành219path,0drift;445backendhash0drift. Các số này là kiểm tra định danh nguồn, không phải coverage bảo mật. Evidence `imagery-live-verification.json`, `imagery-source-manifest.json`, `final-integrity-with-imagery.json`.

## Những phần đã hoàn thiện

- Website công khai: nội dung tiếng Việt, đường đi và hiển thị desktop/mobile, metadata/ảnh chia sẻ; không mô phỏng gửi liên hệ hoặc công bố tích hợp chưa có.
- Hạn mức, hóa đơn và kho: khóa cập nhật cạnh tranh; giờ dự kiến; mặc định tắt tự lập hóa đơn; yêu cầu giá dương được duyệt trước khi bật. Hoàn tất nhiệm vụ giữ trạng thái chờ lập hóa đơn nếu worker lỗi, thử lại bền vững và không tạo trùng. Thanh toán hóa đơn nhiệm vụ không cộng giờ; thanh toán gói áp dụng định mức gói và giữ phần đã dùng/chu kỳ hiện tại. Retry kho sau mất phản hồi giữ cùng request ID.
- Báo cáo/cấu hình: sửa endpoint quota và báo cáo lệch backend, tải CSV từ dữ liệu thật, xử lý lỗi có thể thử lại; không đưa số liệu giả khi API hỏng.
- Media: JPEG/PNG/WebP/PDF tối đa 100.000.000 byte; MP4/WebM tối đa 1.000.000.000 byte. Kiểm nội dung, upload có điều kiện chống ghi đè, xác nhận thực tế, dọn upload chưa xác nhận sau 24 giờ và retry xóa bền vững. Tệp đã xác nhận/bàn giao được giữ; bốn trạng thái kết thúc khóa ghi media. Video không tự động bị gán FLIGHT_DATA: người dùng chọn vai trò tệp; FLIGHT_DATA không thay tệp bàn giao bắt buộc.
- Nghiệp vụ bàn giao: bắt buộc tiếp nhận trước READY/START, điều phối lại phải tiếp nhận lại; báo vướng mắc từ READY quay về RESOURCE_RESERVED. Hoàn tất cần ghi chú và tình trạng thiết bị; AREA_INSPECTION/AERIAL_RECORDING/DATA_COLLECTION cần tệp kết quả đã xác nhận. UAV_RENTAL/OTHER không bắt buộc tệp.
- Webhook/SAR: mặc định không gửi ra ngoài; danh sách URL được duyệt, chặn mạng riêng, cố định DNS cho kết nối, không theo redirect và giới hạn phản hồi. Outbox bền vững, thử lại công bằng, event ID ổn định, giữ lịch sử khi xóa đích. HTTP 2xx chỉ xác nhận tiếp nhận HTTP; không chứng minh cơ quan ngoài đã xử lý. SAR kiểm tra người được giao/nhiệm vụ/UAV trước tác dụng phụ; không tuyên bố điều khiển bay thật.
- CI/khôi phục: workflow cho frontend, legacy, backend, audit và browser; backend gate từ chối skip. Cleanup lỗi giữ dấu sở hữu để workflow dọn tiếp. Diễn tập lưu bền, restart vật lý, retry, restore database/object và rollback artifact đã chạy ở môi trường riêng.
- Chuẩn hóa backend theo yêu cầu riêng: DTO/package/service và định dạng được tổ chức lại; giữ 15 migration, hợp đồng API và logic auth. Không lấy 725 test trước refactor để thay cho lượt 726 test cuối.

## Bảng nghiệm thu và evidence

Các tên tệp dưới đây nằm trong [thư mục evidence an toàn](evidence/tests/full-priorities-20261017/README.md). Index ghi nguồn và SHA-256. Các lượt chạy chồng lặp không được cộng thành một tổng test duy nhất.

| Nhóm | Kết quả | Lệnh/endpoint hoặc tình huống thực tế | Evidence |
|---|---|---|---|
| Baseline và review | PASS | HEAD/manifest; review vùng tích hợp, 890 hash package và 445 hash backend | `final-source-review.md`, `backend-final-source-hashes.json` |
| Bốn app/shared và legacy | PASS | `npm run lint`, `typecheck`, `test`, `build`; workspace151, contracts151, legacy10 | `frontend-gates.json`, các layout build/review |
| Backend cuối | PASS | Maven `verify` với PostgreSQL/MinIO cô lập; 726 test, không skip | `backend-final-726-summary.json` |
| Hợp đồng API sau refactor | PASS | 109 paths, 130 operations; schema/parameter/security | `api-contract-parity.json` |
| Handover cuối qua browser | PASS | Tạo → gửi → duyệt/gán → nhận lại → READY → START → upload/complete → customer tải/audit; 14 checks | `post-refactor-handover.json` |
| Media cuối qua browser | PASS | Operations/legacy PUT thật, preview/download byte-equal, xóa, sai nội dung/expiry409 và phục hồi; 6 checks | `post-refactor-media-library.json` |
| Webhook/SAR cuối qua browser | PASS | Quyền, trạng thái gửi trung thực, lỗi mạng/phục hồi; 6 checks | `post-refactor-webhook-sar.json` |
| Auth/CORS/CSRF local cuối | PASS trong phạm vi | 15 HTTP checks: anonymous401, invalid401, login/refresh/logout, CORS200/403, cookie write thiếu CSRF bị từ chối, write hợp lệ | `post-refactor-auth-contract-probe.json` |
| Quota/report/settings/kho | PASS trước refactor | 6 browser +3 recovery: callback503 không đổi tiền/quota, CSV, settings400/403, lost-response stock retry | `task2-browser.json`, `task2-recovery-browser.json` |
| KPI báo cáo dữ liệu trống | FAIL; sửa chờ quyết định | GET reports/operations-summary và trang reports: 0 nhiệm vụ nhưng 100%; đã hỏi chính sách chỉ số | `empty-report-kpi-observation.json` |
| Portable CI/recovery | PASS trong phạm vi | Browser16, runner12; restore DB/object, restart, retry, rollback; 8 mocked CI-failure tests | `portable-browser-primary.json`, `portable-recovery-primary.json`, `portable-source-provenance.json`, `ci-review.md` |
| Backup/chuyển dữ liệu local | PASS | Restore xác minh 22 bảng/117 dòng cũ; 25 tệp MinIO khớp hash; giữ database gốc | `backup-verification.json`, `data-preservation-before-start.json`, `adoption-before-start.json` |
| Main localhost | PASS trong phạm vi | BE18082 + FE3100/3101/3102/3103/3300; GET health/readiness, anonymous/invalid, CORS, trang login | `live-readiness-root.json`, `live-ui-report.json`, `live-main-verification.json` |
| Audit production dependencies | PASS tại thời điểm kiểm | `npm audit --omit=dev --json` cho root và legacy: 0 mỗi cây | `canonical-dependency-audit-summary.json` |
| Audit đầy đủ dependencies | FAIL gate | `npm audit --json`: 5 HIGH mỗi cây, cùng chuỗi công cụ phát triển; chưa có bản vá tương thích xác minh | Cùng summary; không suppression hoặc nâng major tùy ý |
| Standard security scan | PARTIAL | 83 tệp nguồn baseline được đọc đầy đủ; 4 finding baseline và bằng chứng sửa có phạm vi riêng | `security-scan-report.md`, `security-scan-summary.json`, `security-fix-verification.md` — scan đã hoàn tất, coverage một phần |
| Hosted CI cho bản chưa commit | BLOCKED / chưa chạy | Workflow đã có; local rehearsal không phải hosted run | `PORTABLE_CI_AND_RECOVERY.md` |
| HTTPS staging / SSO thực | BLOCKED | Chủ dự án chưa có staging; chưa đổi auth contract | `M6_AUTH_SSO_REPORT.md` |

## Diễn tập và nguồn bằng chứng

Portable run5 dùng 421 tệp của bản frozen725 trước refactor. Nó chứng minh restore, restart, retry và rollback artifact của nguồn đó; không tự chứng minh mọi byte trong bản refactor cuối. Một lượt quan sát khi refactor đang thay đổi được giữ riêng, không dùng thay gate. Lượt 726/445 và 26 browser+15 auth sau refactor là bằng chứng riêng cho bản mới. Local load probe40 request, concurrency4, 0 lỗi, p95 khoảng39,6ms chỉ là phép đo nhỏ cục bộ, không phải SLA hay năng lực sản xuất.

Trước chuyển localhost, toàn bộ mã/config/Git, database và kho media đã được sao lưu và kiểm tra phục hồi. Database gốc được giữ; bản mới dùng schema V1–V15 đã nhập đủ dữ liệu cũ. Bản frontend cuối được áp dụng theo preimage, 202 hash khớp; cài từ lockfile, build đủ năm ứng dụng và chạy contracts thành công trước khi mở cổng. Không dùng port8080.

## Kiểm chứng sau chuyển localhost

Ngày17/10, runtime owner ghi LIVE_MAIN_PASS. UI đọc21trang ×2viewport1440/390 thành42checks, không tràn ngang, alert lỗi hoặc lỗi JavaScript; kiểm thêm menu/operator và từ chối direct dispatch. Main giữ dữ liệu trống của hệ thống cũ, không nhập bộ fixture nghiệp vụ; các chi tiết nhiệm vụ/media có dữ liệu được kiểm ở preview riêng. Root11HTTPchecksPASS, customer cũ đăng nhập lại thành công.

Trước startup,22bảng/117dòng cũ khớp hoàn toàn. Sau login,116dòng nghiệp vụ/cấu hình ở21bảng vẫn khớp;1dòng refresh_tokens luân chuyển theo chính sách phiên hiện có. Bootstrap chỉ thêm2tài khoản vận hành local và31permission grants, không sửa user/role template cũ. Database gốc117dòng vẫn nguyên. Preview18582/3310–3313/3330 đã dừng; database/container/volume được giữ vì có quyền sở hữu chung và yêu cầu bảo toàn dữ liệu. Mainservices vẫn chạy.

**Lỗi KPI còn mở:** trên dữ liệu0nhiệm vụ, báo cáo và CSV trả “tỷ lệ thành công100%”. Source hiện tính hoàn thành/tổng mọi trạng thái và mặc định100khi tổng0. Đây là vấn đề nghĩa chỉ số, không được che bằng kết quả layoutPASS. Đã hỏi chủ dự án chọn giữ công thức và hiển thị“Chưa có dữ liệu” khi trống, hoặc đổi mẫu số sang hoàn thành+thất bại. Chưa thay công thức/API khi chưa có câu trả lời; theo dõiQ14trongBA.

## Lỗi thực tế đã sửa và giới hạn còn lại

Lỗi đã tái hiện gồm đường dẫn quota/report404, callback thanh toán thiếu bằng chứng vẫn thanh toán hóa đơn, cập nhật quota cạnh tranh, retry bị đói khi backlog lớn, mất delivery khi xóa đích, thiếu giới hạn/lifecycle media, hai chi tiết layout mobile và hai nhánh thất bại của CI. Evidence/review giữ cả diễn biến lỗi và kiểm chứng sau sửa; lỗi selector/intercept/fixture trong harness được tách khỏi lỗi sản phẩm.

Cần tiếp tục: HTTPS staging; hosted CI cho source cuối; mở rộng security coverage; giải quyết 5 HIGH dev-toolchain khi có cách tương thích; kiểm mọi tổ hợp quyền/CRUD/phiên/browser/accessibility. Chính sách webhook hiện còn ngoại lệ backend cho admin authority hoặc USER_MANAGE, trong khi UI yêu cầu USER_MANAGE: admin bị override deny có thể được API cho phép. Đây là hành vi kế thừa đã nêu rõ, cần quyết định policy riêng, chưa âm thầm đổi quyền.

Giá dịch vụ, nhà cung cấp thanh toán thật, reset chu kỳ hạn mức, SLA/RPO/RTO và retention audit chưa được chốt. Không gọi các giới hạn này là chức năng hoàn tất. Không dùng tỷ lệ test PASS để tự đặt phần trăm hoàn thiện toàn hệ thống.

## Tài liệu và vận hành

BA3 đã bàn giao: 94 trang, 33 chương, 74 bảng, 48 FR, 27 BR, 24 UC, 35 AT và 7 sơ đồ. Toàn bộ 94 trang được kiểm tra trực quan; mục lục, liên kết, ký tự và lề đều đạt. Bản nguồn và ma trận truy vết nằm trong `docs/ba/BA_V3.md`, `TRACEABILITY_V3.md`; Word, PDF đen-trắng và ZIP nguồn nằm dưới `/Volumes/D/Codex/outputs/uav-pas-full-priorities-20261017/`. Evidence `ba-delivery-report.md`, `ba-deliverables.json`, `ba-document-validation.json` và `ba-visual-qa.json` ghi kiểm tra, phạm vi và hash. Q14 vẫn chờ quyết định, không tự ghi thành đã sửa.

Standard scan đã được công cụ niêm phong thành công:4finding baseline (1HIGH/2MEDIUM/1LOW),83tệp được đọc đầy đủ so với ước tính1.677tệp. Những finding lịch sử được giữ, bằng chứng sửa nằm trong phụ lục; trạng thái coverage vẫnPARTIAL. Bộ đếm host trả159.345.989token gộp từ22thread, thiếu2thread, không phải token riêng phát sinh của scan/lượt này; số liệu đo một phần được giữ trong security summary.

Link localhost: [Website](http://localhost:3100), [Khách hàng](http://localhost:3101), [Vận hành](http://localhost:3102), [Quản trị](http://localhost:3103), [Legacy](http://localhost:3300). Các service chính được giữ chạy theo yêu cầu; môi trường thử nghiệm chỉ dọn theo quyền sở hữu, không xóa database/bản sao/media của người dùng.

Evidence công khai không chứa mật khẩu, access/refresh token, cookie value, signed URL, private dump hoặc storage state. Raw log/config và bản sao phục hồi không được đưa vào báo cáo công khai.
