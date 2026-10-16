# UAV PAS — Sổ hoàn thiện M1–M6

## Bảo vệ bản nháp và unknown route — 2026-10-16 (mới nhất)

Đã chặn ghi đè DRAFT từ hai tab bằng phiên bản đi cùng nội dung biểu mẫu; backend khóa giao dịch và trả 409 khi bản cũ. UI giữ dữ liệu đang nhập, chỉ thay khi người dùng chọn tải bản mới. Đường dẫn không tồn tại trả 404; anonymous trên đường dẫn bảo vệ vẫn 401. **530 backend tests PASS, 0 skip; root/legacy đủ bốn gate PASS (78/7 lượt test); 13 nhóm browser/API hỗ trợ PASS** cho tạo/sửa/gửi/hủy, hai tab, mất phản hồi và quyền sở hữu. Auth contract/schema/dependencies không đổi; API nghiệp vụ PATCH mission mới yêu cầu `expectedVersion`. Xem [báo cáo bản nháp](M6_DRAFT_SAFETY_2026_10_16.md) và `evidence/tests/draft-safety-2026-10-16/`. Phạm vi **COMPLETE_LOCAL**; toàn dự án **PARTIAL / NOT_READY**. Baseline `f7b9f13`; mã nguồn kiểm chứng đã được đóng gói trong `dc83c67` (bản nháp) và `9f1bbfa` (404), cùng commit tài liệu/evidence đi sau. Môi trường thử nghiệm đã dọn. Các kết quả phía dưới là lịch sử của source tương ứng, không cộng lượt chạy lặp.

## Điều phối operator, trạm và thiết bị — 2026-10-16 (lịch sử, 494 tests)

Đã bổ sung thay/gỡ operator và trạm, đổi số lượng/thiết bị và hoàn trả từng khoản giữ; kiểm tra lịch, phiên bản màn hình, số dư kho, rollback và audit. Sửa eligibility operator và kiểm tra lại tài nguyên ở READY/START. **494/494 backend tests PASS, 0 skip**; root/legacy đủ bốn gates PASS (76/7 lượt test); **21 nhóm browser/API bổ trợ và 2 nhóm audit UI PASS**. Auth contract, schema và dependencies không đổi. Xem [báo cáo điều phối tài nguyên](M6_RESOURCE_REDISPATCH_2026_10_16.md) để biết phạm vi thực tế, evidence và giới hạn. Phạm vi này COMPLETE cục bộ; toàn hệ thống **PARTIAL / NOT_READY**. Các kết quả bên dưới là lịch sử, không cộng lượt chạy lặp.

## Login, refresh và logout đồng thời — 2026-10-15 (lượt hiện tại)

Bản vá dùng khóa giao dịch theo tài khoản để tuần tự hóa login/refresh/logout, đọc lại đúng refresh token sau khi chờ khóa và giữ đúng số lần nhập sai. Giữ nguyên một refresh token hiện hành/tài khoản, logout theo token được cung cấp và **auth contract JSON bearer hiện có**; không đổi endpoint, DTO, schema, cookie, SSO hoặc CSRF.

Kết quả cuối: **390/390 backend tests PASS, 0 skip**; **14/14 nhóm HTTP PASS, 813 phản hồi không có 500**; **13/13 browser checks PASS** cho login, refresh khi hết hạn tự nhiên, logout/guard trên ba portal và chính sách cùng tài khoản trong hai trình duyệt. **M6-B9 RESOLVED trong môi trường kiểm chứng cục bộ**; phạm vi, chính sách phiên và evidence tại [báo cáo auth concurrency](M6_AUTH_CONCURRENCY_2026_10_15.md). Các khối bảo trì 356/297 bên dưới là lịch sử của source tương ứng. SSO/CSRF, staging, hosted CI và security coverage đầy đủ chưa được nghiệm thu; toàn dự án vẫn **PARTIAL / NOT_READY**.

## Lịch bảo trì, phiếu sửa chữa và chi phí vật tư — 2026-10-15 (lịch sử, 356 tests)

Đã bổ sung lịch định kỳ theo ngày, phiếu sửa chữa và vật tư/số lượng/đơn giá VND; tổng tiền do server tính, **không trừ kho thiết bị**. API UAV cũ không thể vượt qua phiếu IN_PROGRESS. Mọi API mới, kể cả đọc chi phí, dùng quyền **UAV_MANAGE** hiện có; **auth contract không đổi**.

Kết quả của lượt bảo trì trước: **356 backend tests PASS, 0 skip**; root/legacy lint, typecheck, test và build PASS. Phạm vi, số nhóm browser và evidence cuối được đối chiếu tại [báo cáo lịch bảo trì và sửa chữa](M6_MAINTENANCE_PLANNING_2026_10_15.md), không cộng các lượt kiểm thử lặp vào tổng.

Tại thời điểm lượt bảo trì, lỗi đăng nhập đồng thời cùng tài khoản còn mở: **6/6 lần** có một 200 và một 500 do `refresh_tokens_user_id_key`. Bản vá và kết quả hiện tại được theo dõi trong [báo cáo auth concurrency](M6_AUTH_CONCURRENCY_2026_10_15.md). SSO/CSRF, staging, hosted CI và security coverage đầy đủ chưa được nghiệm thu. Toàn dự án **PARTIAL / NOT_READY**. Các khối 297/212 và các kết quả cũ bên dưới là lịch sử của source tương ứng.

## Bảo trì và điều phối lại UAV — 2026-10-15 (lịch sử, 297 tests)

Đã hoàn thiện bảo trì/hoàn tất bảo trì có lý do, gán trạm giữ AVAILABLE, thay/gỡ UAV trước bay và khôi phục ASSIGNED vô chủ có bảo vệ. Sửa chặn UAV bận, dữ liệu cũ/tranh cùng UAV, tiếp nhận/báo vướng mắc sau terminal, sở hữu UAV trùng khi READY/START, số lượng phân công thiếu/null trả 500 và thông báo xung đột ngoài viewport. **Auth contract không đổi.**

Kết quả của lượt trước: root/legacy gates PASS; **297 backend tests PASS, 0 skip** với PostgreSQL/MinIO; **27** checks luồng chính; **16** nhóm bảo trì/điều phối (1 nhóm setup API); **12** nhóm nhánh âm UI; **8** nhóm API validation/concurrency PASS. Các nhóm phân biệt fixture/read-back và UI. Fail UI ở RESOURCE_RESERVED/READY/IN_PROGRESS cùng lệnh lặp, cancel phân công dở/đủ/READY đã kiểm tài nguyên. Xem [báo cáo chi tiết](M6_UAV_MAINTENANCE_REDISPATCH_2026_10_15.md) và `evidence/tests/uav-maintenance-dispatch-2026-10-15/summary.json`.

Đợt chức năng này **COMPLETE theo phạm vi**; toàn dự án **PARTIAL / NOT_READY**. Lịch định kỳ theo ngày, phiếu sửa chữa và chi phí vật tư đã được bổ sung trong lượt tiếp theo nêu trên; các policy media/acceptance còn mở; SSO/CSRF, staging, hosted CI và security coverage đầy đủ chưa đạt. Các phần bên dưới giữ nguyên như lịch sử, không đại diện source mới nhất.

## BA workflow continuation — 2026-10-15 (historical)

Đã bổ sung sửa nháp/phân trang Customer, fail workflow và số lượng thiết bị Operations, lịch sử kho/UAV và tìm serial. Sửa reject phân công dở giữ tài nguyên, giới hạn note timeline và response cũ ghi đè trạng thái. **Auth contract giữ nguyên.** Root/legacy gates PASS; backend **212 tests PASS, 0 skip**, PostgreSQL/MinIO thật. Browser: 27 luồng chính, 12 Customer mở rộng, 13 Operations mở rộng, 7 history, 5 ownership/stale, 15 viewport + 3 logout/guard và 3 public/recovery/boundary checks PASS; các ca setup/API được tách rõ. Xem [báo cáo BA workflow](M6_BA_WORKFLOWS_2026_10_15.md) và `evidence/tests/ba-workflows-2026-10-15/summary.json`.

Đợt chức năng này đã hoàn tất; toàn dự án vẫn **PARTIAL / NOT_READY**. SSO/CSRF, staging/CI và full security coverage chưa đóng. Hai tab sửa DRAFT tuần tự, policy bảo trì/gán trạm UAV và nhiều nhánh UAT còn mở. Các mục bên dưới là snapshot trước lượt BA này, không phải kết quả của source mới nhất.

Mục đích: ghi những việc thực sự hoàn thiện, không biến kế hoạch thành báo cáo PASS. Ngày mở: 2026-10-09. Status tổng thể: **PARTIAL / NOT_READY**.

## UI continuation — 2026-10-15

- CODE-13: Vietnamese mission presentation, compact expandable history, semantic section links, current-stage guidance and readable resource names.
- CODE-14: permission/stage-aware controls, terminal mutation suppression, confirmation/reason forms and disabled pending actions; no backend/auth contract changes.
- CODE-15: customer bottom navigation/mobile lists, portal focus-safe mobile menus, responsive audit records and labelled current-page filtering; fixed dead Operations registration link.
- QA-11: final local standalone build verified by 27 business, 5 ownership/stale, 3 rejection, 15 responsive and 3 logout/protected-route checks. Root lint/typecheck/test/build PASS. Evidence in `M6_UI_POLISH_2026_10_15.md`.
- Remaining M1–M6 tasks stay partial. No commit/push/deploy or production-ready claim.

## Latest execution — 2026-10-15

- CODE-10: fixed automatic bearer forwarding to storage origins in shared + legacy clients; failing-before/passing-after unit boundary tests and real browser upload/download.
- CODE-11: fixed unhandled stale customer submit/cancel errors, pending buttons and mission revalidation; real two-tab 409 recovery verified.
- CODE-12: fixed operator aggregate dashboard calls without permission; real browser overview verified with zero unexpected 403.
- QA-10: 23 main UI checks, 5 ownership/error checks, natural-expiry refresh/logout on 3 portals and operator admin-users denial PASS. All root/legacy gates, 205 default backend tests (7 infra skips), and those 7 infrastructure tests separately PASS.
- Evidence: `M6_BUSINESS_UI_E2E_2026_10_15.md` and `evidence/tests/ui-business-2026-10-15/`. Baseline 65d1b23 plus uncommitted patch; no new commit/push/deploy. Backend auth contract unchanged.
- T02/T06/T10–T14/T18 advanced but remain partial; no claim of all lifecycle branches, staging, approved SSO/CSRF or full security closure.

## Historical ledger through 2026-10-09

## Baseline có evidence

| Scope | Kết quả hiện có | Evidence / giới hạn |
|---|---|---|
| FE 4 app + legacy/shared | Lint/typecheck/test/build PASS theo lượt verification trước | M6_TEST_REPORT.md và root/legacy current logs; không chứng minh mọi feature |
| Spring default tests | 204 tests; 0 failures/errors; 6 skipped | backend-maven-current-summary.json; infra skips được chạy riêng theo báo cáo |
| PostgreSQL/MinIO stabilization | 5 PG + 1 MinIO PASS theo báo cáo | backend-stabilization-current-summary.json |
| API business/auth/ownership/media/audit | PASS tại baseline ca8a36b | m6-current-isolated-runtime.json; API scope, không phải authenticated browser |
| SSO/CSRF/browser/hosted staging/security | Còn mở | M6_REMAINING_GAPS.md; audit 5 high dev entries, security partial |

## Hoàn thiện trong lượt tạo Goal

| ID | Trước → sau | Thay đổi | Verification | Commit |
|---|---|---|---|---|
| DOC-01 | Yêu cầu tổng quát → Goal có scope/gates/DoD/authority | docs/goals/M1_M6_COMPLETION_GOAL.md | Đối chiếu handoff/specs; không tuyên bố code hoàn tất | pending commit |
| DOC-02 | Chưa có BA completion mapping → 32 nhóm acceptance sơ bộ với nguồn/unknowns | docs/ba/M1_M6_ACCEPTANCE_BASELINE.md | IDs liên tục, status và acceptance; vẫn DRAFT | pending commit |
| DOC-03 | Chưa có execution checklist chung → 20 work packages/dependencies/checkpoints | tasks/plan.md, tasks/todo.md | Coverage BA/FE/BE/DB/auth/security/CI | pending commit |
| DOC-04 | Evidence/handoff chưa commit → bộ báo cáo đã review, log secrets được loại trước commit | docs/handoff/m6/ | JSON parse, diff check, secret pattern scan; screenshots reviewed | pending commit |
| DOC-05 | Boundary chưa có source map → inventory 4 app, legacy, 7 package, 8 backend domain, 12 production controller, 16 logical service và migration/test boundary | docs/ba/M1_M6_SOURCE_INVENTORY.md | Graph index ready; source directory/controller/migration inventory; status còn mở theo từng acceptance | `ba969ac` |
| DOC-06 | Authenticated browser trước đây NOT_VERIFIED → portal smoke có direct API origin cho customer/operator/admin với login/refresh/logout/guard | docs/handoff/m6/evidence/tests/authenticated-browser-direct-origin.json, `evidence/tests/scripts/authenticated-browser-smoke.mjs`, M6 handoffs | Ba portal smoke PASS; business UI/SSO/CSRF/staging vẫn chưa VERIFIED | `7968ad0` |
| DOC-07 | Migration-only source boundary → schema inventory 19 tables/23 FK/index/time/constraint gaps được ghi rõ | docs/architecture/UAV_PAS_SCHEMA_INVENTORY.md | Đối chiếu V1/V2 và entity boundary; fresh/upgrade/concurrency/restore vẫn mở | `512940a` |
| DOC-08 | Fresh/upgrade migration trước đây chưa có current PostgreSQL evidence → Flyway test V1+V2 và V1→V2 giữ synthetic row | backend/src/test/java/com/uav/platform/stabilization/MigrationUpgradePostgresTest.java, docs/handoff/m6/evidence/tests/backend-migration-upgrade-current-summary.json | 1 test PASS, 0 skipped; restart/backup/restore/concurrency full còn mở | `9f9027f` |
| DOC-09 | Persistence/restore trước đây chưa có evidence → named-volume PostgreSQL/MinIO restart và synthetic backup/restore giữ row/object SHA | docs/handoff/m6/evidence/tests/backend-durability-restore-current-summary.json, `evidence/tests/scripts/postgres-minio-durability-restore.sh` | PG dump/restore, MinIO object delete/restore và restart PASS; production recovery policy/concurrency vẫn mở | `f280943` |

## Mẫu mỗi lần triển khai

Ghi ngày, requirement/task ID, mô tả trước/sau, files/FE/API/schema affected, approval cần thiết, test command/exit code, evidence path/source revision và commit SHA thực tế. Nếu record được tạo trong chính commit đó, dùng pending commit rồi cập nhật SHA trong checkpoint sau. Không sửa evidence cũ để làm nó có vẻ test revision mới; bổ sung lần chạy mới.

## Kết luận phạm vi lượt này

Đây là commit tài liệu/goal/evidence. Không thay FE, BE, schema, auth contract hoặc triển khai production; chưa có cơ sở gọi code clean 100%. Không công bố phần trăm toàn sản phẩm trước khi BA denominator được chốt.
## Acceptance status at Goal creation

| Requirement group | Current status | What is actually complete | Remaining proof/work |
|---|---|---|---|
| BA-01–BA-02 foundation/config | PARTIAL | Workspace/apps/packages build evidence; isolated runtime exists | Full traceability and release-secret/config gates |
| BA-03–BA-04 identity/permissions | PARTIAL | Direct API login/refresh/logout/401/403 role matrix | Browser flow, lock/revoke semantics and approved SSO |
| BA-05–BA-10 resource/media/dashboard/audit | PARTIAL | Core APIs and selected synthetic resource/media/audit flow | Full CRUD/dashboard/event completeness and browser coverage |
| BA-11–BA-18 customer/mission workflow | PARTIAL | Isolated mission create→complete and ownership flow | Draft edit UI, negative/concurrency/release cases and browser flow |
| BA-19–BA-20 profile/admin scope | BLOCKED/UNKNOWN | No verified contract for several requested areas | BA decision and backend support before implementation |
| BA-21–BA-23 public/UX/content | PARTIAL | Public/SEO/anonymous viewport smoke | Approved content, authenticated states and accessibility evidence |
| BA-24–BA-25 SSO/full UI business E2E | BLOCKED/PARTIAL | API business E2E | Auth contract approval and authenticated browser E2E |
| BA-26–BA-28 database/evidence | PARTIAL | Flyway/stabilization checks and redacted evidence | ERD/dictionary, upgrade/durability/restore and replayable suite |
| BA-29–BA-31 security/CI/staging | PARTIAL/BLOCKED | Partial scan and dependency split | 5 high policy, full coverage, hosted CI/staging gates |
| BA-32 clean code/release docs | NOT_VERIFIED | Goal/plan/ledger now define the bar | Review every touched slice and final same-SHA regression |

These statuses are a starting ledger, not a completion claim. Update them with test/evidence and commit SHA as each task closes.
