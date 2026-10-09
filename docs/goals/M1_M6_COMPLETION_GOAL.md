# UAV PAS — Goal hoàn thiện M1–M6 cho phiên Ultra

Ngày lập: 2026-10-09. Đây là mục tiêu triển khai/nghiệm thu, không phải chứng nhận sản phẩm đã hoàn thiện.

## 1. Mục tiêu

Hoàn thiện phạm vi M1–M6 đã được xác nhận từ tài liệu nghiệp vụ (BA), frontend, backend, PostgreSQL và MinIO thành hệ thống hoạt động xuyên suốt với dữ liệu thật trong môi trường test/staging. Sửa lỗi và khoảng trống trong phạm vi, làm sạch code có kiểm chứng, chạy kiểm thử thực tế, cập nhật toàn bộ tài liệu và commit/push thay đổi có chủ đích lên nhánh làm việc. Không chỉ kiểm tra rồi liệt kê thiếu sót; tiếp tục xử lý các việc đã được phép cho đến khi đạt tiêu chí nghiệm thu hoặc còn trở ngại cần quyết định/quyền truy cập bên ngoài.

Người dùng chọn mức reasoning **Ultra** trước khi gửi mục tiêu. Ultra không tự cấp quyền deploy, không thay thế test và không bảo đảm hoàn thành trong một lượt. Không tự đổi model hay mở chat mới.

## 2. Baseline và tài liệu bắt buộc

- Repository: `/Volumes/D/Codex/projects/uav-pas-platform`.
- Remote: `https://github.com/NguyenPhat2412/uav-pas-platform.git`.
- Nhánh: `codex/m1-monorepo-foundation`.
- Baseline sản phẩm đã kiểm chứng: `ca8a36bbbd12742f75c3c61d2ae5045d38bde753`. Có thể có commit tài liệu mới hơn; không checkout lùi hoặc reset về baseline.
- Kiểm tra branch, HEAD, remote, staged/unstaged/untracked trước khi sửa. Phân biệt thay đổi sẵn có và thay đổi của lượt này.
- Đọc AGENTS.md áp dụng, toàn bộ `docs/handoff/` cho M1–M6, `docs/architecture/`, `docs/ba/M1_M6_ACCEPTANCE_BASELINE.md`, `tasks/plan.md`, `tasks/todo.md` và các specs nghiệp vụ trong `docs/superpowers/specs/`.
- Evidence API hiện hành: `docs/handoff/m6/evidence/tests/m6-current-isolated-runtime.json`. Kiểm tra revision, thời điểm và phạm vi trước khi tái sử dụng; evidence cũ không chứng minh code mới.
- Ưu tiên codebase-memory-mcp cho discovery; index repository nếu cần. Đọc source/test/caller thực tế trước khi thay đổi.

Kiến trúc baseline theo handoff: 4 app mới (`web`, `customer`, `operations`, `admin`), legacy `frontend`, 1 Spring Boot backend, PostgreSQL/MinIO, 8 domain (`user`, `mission`, `station`, `uav`, `inventory`, `media`, `audit`, `dashboard`), 16 logical services dạng interface/implementation và 7 shared packages. Xác minh số lượng/boundary trong repo; không tạo thêm service chỉ để khớp con số. Đây không phải yêu cầu tách microservices.

## 3. Quyền và giới hạn

- Được hoàn thiện code, test, tài liệu và dữ liệu synthetic trong phạm vi BA M1–M6; được tạo commit nhỏ và push thông thường lên nhánh đã xác nhận sau các check phù hợp.
- Không reset, merge, rebase, force-push, xóa thay đổi người khác hoặc deploy production. Không tự merge PR.
- Giữ legacy compatibility. Không tự nâng major dependency, đổi public API contract, thay schema phá hủy dữ liệu hoặc bỏ chức năng để làm test xanh.
- Giới hạn cũ về backend auth vẫn còn: chưa đổi auth contract nếu chưa được người dùng phê duyệt cụ thể. Chuẩn bị ADR, contract diff, test/rollback plan rồi hỏi một lần về quyết định cần thiết; tiếp tục phần không phụ thuộc trong khi chờ. Việc giao Goal này không tự thay thế phê duyệt đó.
- Mọi DB/storage mutation chỉ dùng môi trường test có danh tính rõ ràng. Không dùng dữ liệu, credentials, bucket hoặc volume production. Không dừng Expo/các dịch vụ của dự án khác.
- Không ghi token, password, secret, signed URL hay dữ liệu cá nhân vào repo, screenshots, browser traces, log hoặc PR. Quét và loại secrets trước stage/commit/push.
- Giữ source/work dưới `/Volumes/D/Codex/projects`; tài liệu kỹ thuật ở repo, bản giao người dùng nếu cần ở `/Volumes/D/Codex/outputs`. Không commit `.env`, dependency cache, build output hoặc DB dump chứa thông tin nhạy cảm.

## 4. Xác định thế nào là “đầy đủ”

1. Dùng bảng BA làm danh mục requirement có ID, actor, business rule, acceptance criteria, milestone, FE route, API, permission, entity/migration, test và evidence.
2. Kiểm kê mọi route/action/API/domain có thật; mở rộng bảng theo nguồn đã xác minh. Không chỉ kiểm tra các hàng mẫu rồi tuyên bố toàn bộ sản phẩm hoàn tất.
3. Phân biệt `IMPLEMENTED`, `VERIFIED`, `FAIL`, `BLOCKED`, `NOT_VERIFIED`, `OUT_OF_SCOPE`. Có code/build xanh chưa đồng nghĩa VERIFIED.
4. Nếu thiếu tài liệu BA gốc hoặc cần quyết định nghiệp vụ, ghi rõ nguồn thiếu/giả định và chuẩn bị đề xuất. Không tự bịa requirement, pricing, chính sách pháp lý, SLA hay quyền truy cập.
5. AI, SAR, Payment, e-learning/certificates/training và các tính năng tương lai chỉ được thêm khi BA đã xác nhận chúng thuộc M1–M6. Việc ghi OUT_OF_SCOPE phải có nguồn/approval; không tự chuyển yêu cầu bắt buộc ra ngoài để đạt 100%.
6. Không tái dùng tỷ lệ 75% ước lượng trong chat. Báo tỷ lệ `số requirement bắt buộc VERIFIED / tổng requirement bắt buộc đã chốt`, công khai mẫu số, các blocker và phần chưa có BA. Chưa chốt mẫu số thì ghi “chưa xác định”, không đưa % toàn sản phẩm.

## 5. Phạm vi hoàn thiện

### BA và các milestone

- M1: monorepo, build unit độc lập, shared packages, env contract, architecture và legacy compatibility.
- M2: Operations với trạm, UAV, kho, mission/operator, media, dashboard theo quyền; đủ happy path, lỗi, loading/empty/forbidden và responsive/accessibility.
- M3: Admin users/roles/permissions, khóa tài khoản, quản lý tài nguyên, dashboard và audit. Những màn hình chưa có API phải ghi backend gap và giải quyết theo BA, không tạo dữ liệu giả.
- M4: Customer catalog, tạo/sửa draft/submit/cancel, list/detail, tracking/timeline/media và ownership. Profile/password/preferences chỉ đưa vào khi contract/phạm vi đã được xác nhận.
- M5: Public website, nội dung đúng năng lực, SEO, link đăng nhập/đặt dịch vụ, responsive và accessibility. Pricing/privacy/terms/contact thiếu nội dung/contract phải có quyết định rõ ràng, không xuất bản placeholder như nội dung hoàn chỉnh.
- M6: tích hợp thật, SSO/CSRF sau approval, browser E2E, security, CI/staging, migration/restore và handoff nghiệm thu.

### Backend và clean code

- Đọc controller/service/repository/DTO, permission, validation, exception mapping, transactions và callers của từng vertical slice.
- Đóng gap theo BA; server là nơi quyết định authz, ownership, state transition và resource availability.
- Kiểm tra mission draft/update/submit/confirm/assign/reserve/accept/ready/start/complete cùng cancel/reject/fail và request không hợp lệ theo state machine thực tế.
- Kiểm tra lock/revoke, tài khoản thay đổi quyền, refresh rotation/reuse/race, logout trong refresh và account switch. Chốt kỳ vọng logout một token, một session hay mọi session trước khi sửa; token cũ còn sống phải được ghi nhận, không gọi là global logout.
- Sửa root cause ở nơi dùng chung, giữ validation và error handling. Không refactor toàn repo chỉ để đổi style, không thêm abstraction/service không cần thiết.
- Loại dead code/duplication/mock production khi đã kiểm tra callers; không blanket-disable lint, TypeScript, tests hoặc security checks. Giữ interface/implementation có vai trò rõ; không đổi kiến trúc vì sở thích.
- Mỗi thay đổi logic có test chứng minh hành vi và regression phù hợp. Structural tests không thay được nghiệp vụ integration tests.

### PostgreSQL và MinIO thật

- Cập nhật ERD/data dictionary: PK/FK, quan hệ, cardinality, constraints, indexes, nullability, timestamp/timezone, trạng thái và vòng đời dữ liệu.
- Dùng Flyway có version; không sửa migration đã áp dụng ở môi trường chia sẻ. Chứng minh fresh install và nâng cấp từ baseline copy chứa dữ liệu synthetic; migration/checksum/data preservation đều có evidence.
- Schema phải khớp entities/DTO/BA. Kiểm tra orphan, uniqueness, số lượng âm, tồn khả dụng/reserved, transaction rollback và lifecycle của tài nguyên.
- Chạy concurrency thực trên PostgreSQL: reserve quá tồn, trùng UAV/operator trong time window, retry/repeat mutation, complete/cancel/fail đồng thời nếu relevant. Chỉ một kết quả hợp lệ được commit; không rò rỉ reservation hay audit sai.
- Dùng MinIO private bucket thật: signed upload/download, MIME/size/checksum nếu contract có, confirm khi object tồn tại, ownership, URL expiry và không đọc object trái quyền.
- Kiểm chứng persistence qua restart không xóa volume test, rồi backup/restore test DB và object metadata/object data liên quan. Phân biệt stack tmpfs dùng disposable test với phép thử durability dùng volume riêng; không lấy tmpfs loss làm bằng chứng persistence.
- Seed idempotent cho customer A/B, operator assigned/unassigned, admin, quyền hạn chế và tài khoản khóa; secrets ngẫu nhiên cục bộ. Không tạo password mặc định hay bypass auth trong code production.

### Frontend và authenticated browser E2E

- Cả 4 app mới, shared packages và legacy phải lint/typecheck/test/build theo scripts thực tế và lockfile; build/start từng app độc lập theo packaging đã thiết kế.
- Đảm bảo API origin đúng tại build/runtime, deep-link/reload, error/empty/loading/form validation và không cache nhầm dữ liệu riêng tư giữa tài khoản.
- Trở ngại port/dev-lock trong báo cáo trước phải được xử lý bằng runtime test tách biệt, port riêng, env riêng và build output/check-out riêng khi cần. Không coi việc 8080 bị Expo chiếm là blocker không thể giải quyết; không thay tiến trình người khác.
- Chạy browser qua UI đăng nhập thật; không chèn token vào storage để gọi đó là login/SSO. Mỗi portal có role hợp lệ; không buộc một customer truy cập Admin để chứng minh SSO.
- Kiểm thử create/edit/submit mission ở Customer, điều phối/execution theo quyền ở Operations, audit/quản trị ở Admin, public → Customer CTA. Đối chiếu API và DB bên dưới cho side effects quan trọng.
- Kiểm thử 401/403/direct-ID, list/filter/pagination/export nếu có, customer B, operator chưa được gán, account switch, logout/cache, revoked permission/locked account.
- Chụp evidence không secrets ở 1440×900, 1366×768, 1024×768 và 390×844; kiểm tra keyboard/focus/labels/errors/overflow. Ghi rõ automated so với manual accessibility coverage.

### SSO, security và dependency

- Tôn trọng phê duyệt backend auth. ADR phải nêu topology/domain/cookie scope, credentials/CORS, CSRF, session lifecycle/revocation, redirect allowlist, legacy compatibility và rollback; domain chưa có thì dùng test hostnames được đánh dấu rõ.
- Sau approval, triển khai contract đã chọn, test HTTPS nhiều origin thật, cookie flags, login/refresh/logout và CSRF thiếu/sai/hợp lệ. Unrelated domains cần cơ chế phù hợp; không mở rộng cookie domain tùy ý.
- Không gọi localStorage bearer là SSO; không truyền token qua URL hoặc tùy tiện copy giữa origins. Phần chưa approval giữ BLOCKED và tiếp tục việc độc lập.
- Chạy audit root và legacy, full vs production. Điều tra 5 high entries theo advisory/dependency chain; không coi chúng là 5 lỗ hổng độc lập. Ưu tiên bản vá tương thích; major change cần impact assessment/phê duyệt. Không dùng `audit fix --force`.
- Rà soát security toàn repository với inventory, exclusions, coverage và validation rõ ràng; scan partial/0 findings không phải clean. Findings được sửa và retest, hoặc có risk acceptance đích danh của người dùng với expiry/owner; agent không tự chấp nhận rủi ro để đóng gate.
- Full coverage nghĩa là phạm vi first-party/release assets đã thống nhất được xử lý và exclusions được giải thích; không khẳng định “không còn lỗ hổng”.

### CI, staging và release evidence

- Bổ sung CI cho backend, PostgreSQL/MinIO integration, 4 app, shared packages, legacy, dependency/secret scan và browser E2E; shared changes kích hoạt đủ consumers.
- Lockfile install tái lập, versions rõ, artifact/report gắn commit SHA và checksum khi relevant. Không truyền secrets vào `NEXT_PUBLIC_*` hoặc artifacts công khai.
- Chạy hosted CI và staging health/browser flow bằng quyền sẵn có; không giả lập local pass thành hosted pass. Nếu thiếu credentials/domain/env, cung cấp cấu hình/runbook reviewable và ghi blocker cụ thể.
- Chuẩn bị rollback app/config và DB forward-fix/restore có evidence test; không giả định đổi routing sẽ rollback được destructive migration.
- Không triển khai production trong Goal này. Sẵn sàng để review release là trạng thái riêng với đã triển khai production.

## 6. Cách triển khai

Theo `tasks/plan.md` và `tasks/todo.md`, thực hiện từng vertical slice: BA → schema/API → FE → test/evidence → docs → commit. Chia task lớn thành các patch nhỏ có acceptance cụ thể trước khi sửa. Sau mỗi slice chạy kiểm tra phù hợp; cuối cùng chạy integrated regression trên cùng revision.

Sửa lỗi/gap đã được phép ngay khi tìm thấy; không dừng ở báo cáo. Nếu cần quyết định auth, scope, legal content hoặc credentials, hỏi cụ thể kèm phương án reviewable và làm tiếp phần không phụ thuộc. Không mở rộng ngoài BA, không coi hết một lượt chat là đã xong. Giữ checkpoint để phiên sau tiếp tục.

## 7. Deliverables phải duy trì

1. `docs/ba/M1_M6_ACCEPTANCE_BASELINE.md`: traceability đầy đủ và status/evidence từng requirement.
2. `tasks/plan.md`, `tasks/todo.md`: task dependencies, pending work, blocker và checkpoint.
3. `docs/handoff/m6/M1_M6_COMPLETION_LEDGER.md`: mọi thay đổi hoàn thiện gồm requirement ID, trước/sau, FE/BE/DB impact, test, evidence, commit SHA; dùng “pending commit” rồi gắn SHA trong checkpoint sau, không tạo SHA giả/tự tham chiếu.
4. Architecture/ADR, API/permission matrix, ERD/data dictionary, env/migration/seed/backup/restore/runbook và acceptance scenarios khớp code thực tế. Tái dùng tài liệu sẵn có, không tạo bản sao mâu thuẫn.
5. Cập nhật handoff M1–M6 liên quan, phân biệt kết quả lịch sử và hiện tại. `M6_FINAL_INTEGRATION_HANDOFF.md` là đầu mối trạng thái cuối.
6. Evidence đã loại secrets có command/test ID, exit code, expected/actual, timestamp/timezone, tested source revision và test environment. Evidence phải tái chạy được bằng script/check-in test fixture; một JSON viết tay không thay cho regression suite.
7. Commit theo slice chỉ gồm thay đổi đã review; docs/evidence đi cùng code. Push nhánh thông thường và xác minh remote SHA; nếu remote tiến lên, không tự merge/rebase/force.

## 8. Definition of Done

Chỉ phân loại **COMPLETE** khi tất cả requirement bắt buộc trong baseline BA đã chốt đều VERIFIED, không còn blocker, code được review và regression đạt, DB fresh/upgrade/durability/restore đạt, browser nhiều role/origin đạt, auth/CSRF đã được phê duyệt và kiểm chứng, security/dependency gate được đóng hợp lệ, hosted CI/staging có evidence cùng revision và các tài liệu/commit đã đồng bộ.

Nếu còn bất kỳ mục bắt buộc chưa đạt, dùng **PARTIAL** và liệt kê chính xác mục còn lại. Dùng **BLOCKED** khi không còn tiến triển có ích trong phạm vi được phép vì phụ thuộc bên ngoài; không dùng BLOCKED để né việc cấu hình test có thể tự giải quyết.

Không suy ra “100% toàn UAV PAS” từ M1–M6; không tuyên bố production-ready trước khi đủ release gates và quyết định người dùng.

## 9. Báo cáo cuối

- M1–M6: status và requirement counts, phần hoàn thiện mới và chưa xong.
- BA / FE / BE / PostgreSQL / MinIO / auth / browser / security / CI: PASS, FAIL, BLOCKED hoặc NOT_VERIFIED, kèm evidence.
- Danh sách commit/push và source revision đã test; working tree còn gì, thuộc ai.
- Lỗi đã sửa, lựa chọn quan trọng, API/schema thay đổi được phê duyệt, residual risks.
- Kết quả cuối COMPLETE/PARTIAL/BLOCKED; phần trăm chỉ tính trên mẫu số đã chốt.
- Việc cần người dùng quyết định, nếu còn; không kết thúc bằng một ước lượng “gần xong”.
