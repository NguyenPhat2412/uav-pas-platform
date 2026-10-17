# Kế hoạch thực thi Goal hoàn thiện UAV PAS M1–M6

Đọc `docs/goals/M1_M6_COMPLETION_GOAL.md` và `docs/ba/M1_M6_ACCEPTANCE_BASELINE.md` trước khi triển khai. Lượt lập kế hoạch này chỉ tạo tài liệu, không chứng nhận code đã clean/complete.

## Thứ tự và quy tắc

Làm theo vertical slice. Mỗi task dưới đây là work package cần chia thành patch nhỏ khoảng 1–5 file/concern trước khi code; migrations/auth/package boundaries có dependency thì làm tuần tự. Dùng implementation/pattern hiện có, không phát minh framework mới. Chỉ hỏi người dùng khi cần quyết định thật (auth contract, thiếu BA/content, major/destructive change hoặc access), tiếp tục việc độc lập khi chờ.

## Work packages

| Task | Phạm vi / dependency | Acceptance trước khi đóng | Verification và files có thể chạm |
|---|---|---|---|
| T01 | Baseline + BA; không dependency | Kiểm kê source/routes/APIs/domain, map requirement và chốt in/out/unknown; không suy ra % tùy ý | Graph/source review, handoff; docs/ba, architecture, tasks |
| T02 | Test environment; T01 | Backend, PG/MinIO và frontend test runtime tách instance, đúng API origin; không ảnh hưởng Expo | health/CORS/browser login probe; compose/test config/env examples |
| T03 | Schema inventory; T01 | ERD/dictionary/constraints/indexes khớp entities/Flyway và BA | inspect schema thật, schema validate; backend db/mapping docs |
| T04 | Migration regression; T02,T03 | Fresh install + upgrade baseline test copy đạt, checksum/data giữ nguyên | PostgreSQL integration tests, Flyway scripts, synthetic fixtures |
| T05 | SSO/revocation ADR; T01 | Contract/cookie/CSRF/logout semantics/legacy/rollback reviewable và ghi approval trước code auth | docs/architecture, contract diff, auth test design |
| T06 | Users/permissions; T02,T03 | CRUD/access/lock/revoke đúng BA, deny case qua UI/API kể cả stale client | user module + admin/shared client + security tests |
| T07 | Station slice; T02,T03 | Create/edit/state/links hợp lệ và validation/permission chạy qua UI | station module, operations/admin pages, integration/browser tests |
| T08 | UAV slice; T07 | Fleet/station/state/maintenance/history nhất quán | uav module, fleet UI, tests |
| T09 | Inventory slice; T07 | Stock/reserve/release/transfer atomic, không âm, conflict/retry có test thật | inventory module/UI + PG concurrency tests |
| T10 | Customer draft slice; T02,T03 | Catalog đúng contract, create/edit draft/submit/validation hoạt động thật | mission/service module, customer forms/query, browser tests |
| T11 | Mission assignment slice; T08,T09,T10 | Confirm/assign/reserve/accept/ready đúng permission/precondition | mission commands, operations/admin UI, API/PG tests |
| T12 | Mission completion/negative paths; T11 | Start/complete/cancel/reject/fail + overlap/retry/rollback đúng state machine | mission/inventory/UAV calls, UI feedback, concurrency tests |
| T13 | Media slice; T02,T10 | Upload/confirm/private download/expiry/ownership đủ success/error | media module/MinIO, customer/operations UI, storage integration |
| T14 | Dashboard/audit slice; T06–T13 | Counts/events/actor/filter/page đúng dữ liệu, không lộ quyền | dashboard/audit module + admin/operations UI + query tests |
| T15 | Public/content/UX; T01,T10 | Capability/SEO/CTA đúng, draft content có quyết định; responsive/keyboard/errors đúng | apps/web, shared UI, existing docs/content, browser/a11y evidence |
| T16 | Implement approved SSO/CSRF; T02,T05 approval | HTTPS cross-origin session + CSRF + refresh/logout/revoke, legacy regression đạt | security/auth/shared packages/clients; API + browser contract tests |
| T17 | Database durability/restore; T04,T12,T13 | Restart có giữ data; backup/restore synthetic DB + media references đạt | isolated volumes, backup/restore fixtures/runbook |
| T18 | Dependency/security closure; T01, iterate after code edits | 5 dev-toolchain entries xử lý/policy đúng; security inventory coverage đầy đủ, findings validated/retested | lockfiles/compatible fixes, security evidence, CI gates |
| T19 | Hosted CI/staging; T02,T04,T16,T18 | All units/shared consumers/backend/PG/MinIO/browser run hosted; staging same revision verified | .github/workflows, artifact/env/runbook; hosted run links |
| T20 | End-to-end acceptance/clean code; T06–T19 | Review touched code/callers, all required requirements verified or honest blockers; docs synced, final regression same revision | all touched tests + M1–M6 handoffs + completion ledger |

## Checkpoints

- C1 sau T01–T05: nguồn BA, môi trường và schema/contract/approval plan reviewable; không sửa auth trước approval.
- C2 sau từng T06–T15: vertical slice có UI/API/DB evidence, regression và commit; không phải chỉ API happy path.
- C3 sau T16–T19: SSO/CSRF + DB restore + security + hosted/staging có evidence. Thiếu approval/credentials thì vẫn PARTIAL, làm tiếp việc khác.
- C4 sau T20: tally requirement, clean working tree thuộc phạm vi task, commit/push verified và handoff cuối. Không deploy production.

## Rủi ro và xử lý

| Rủi ro | Cách xử lý |
|---|---|
| BA gốc thiếu, scope tương lai trộn M1–M6 | Dùng source references, đánh dấu unknown, hỏi quyết định cụ thể; không tự giảm scope |
| Test API origin/dev lock | Dựng runtime/env/output riêng; không dừng process không thuộc task |
| Auth change phá legacy hoặc CSRF | ADR/approval trước code; contract tests và rollback flag có test |
| Migration/stock concurrency làm mất dữ liệu | Fresh/upgrade copy, transactions/constraints/locking, replay/restore evidence |
| Security zero findings bị coi sạch | Coverage inventory + explicit exclusions; không dùng summary count thay review |
| Remote/working tree có thay đổi khác | Stage file cụ thể; kiểm tra diff/secret scan; không merge/rebase/force |

## Output quản trị tiến độ

`tasks/todo.md` giữ checkpoint hiện tại. `docs/handoff/m6/M1_M6_COMPLETION_LEDGER.md` ghi requirement → thay đổi → test/evidence → commit. Phần trăm chỉ xuất sau khi chốt denominator BA, không dùng số app/service hay số test để suy ra feature completeness.
