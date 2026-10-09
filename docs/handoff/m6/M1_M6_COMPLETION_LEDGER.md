# UAV PAS — Sổ hoàn thiện M1–M6

Mục đích: ghi những việc thực sự hoàn thiện, không biến kế hoạch thành báo cáo PASS. Ngày mở: 2026-10-09. Status tổng thể: **PARTIAL / NOT_READY**.

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
