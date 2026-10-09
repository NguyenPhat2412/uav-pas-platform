# UAV PAS M1–M6 — checklist cho phiên thực thi

Baseline code: ca8a36bbbd12742f75c3c61d2ae5045d38bde753. Goal: `docs/goals/M1_M6_COMPLETION_GOAL.md`.

## Đã chuẩn bị trong lượt lập Goal

- [x] Đọc handoff M1–M6 gaps, M6 evidence và kiến trúc auth/deployment.
- [x] Ghi Goal, draft BA acceptance, plan/dependencies và completion ledger.
- [~] Source boundary inventory đã lập trong `docs/ba/M1_M6_SOURCE_INVENTORY.md`; BA gốc/denominator và row-level FE→API→permission→DB→test mapping vẫn chưa chốt, nên T01 còn mở.

## Thực thi

- [~] T01 — Baseline/source inventory đã có; tiếp tục row-level BA traceability và chốt các unknown/approval.
- [~] T02 — Isolated full-stack runtime đúng API origin cho browser; portal auth smoke PASS ở `evidence/tests/authenticated-browser-direct-origin.json`, nhưng business UI/staging/SSO còn mở.
- [~] T03 — Schema inventory/ERD/dictionary đã lập ở `docs/architecture/UAV_PAS_SCHEMA_INVENTORY.md`; constraint/index/query-plan và BA cardinality verification còn mở.
- [ ] T04 — Fresh migration + upgrade data-preservation test.
- [ ] T05 — SSO/CSRF/revocation ADR và approval cụ thể.
- [ ] T06 — Users/permissions/lock/revoke end-to-end.
- [ ] T07 — Station vertical slice.
- [ ] T08 — UAV/maintenance/history vertical slice.
- [ ] T09 — Inventory/reserve/release/transfer/concurrency.
- [ ] T10 — Customer catalog/create/edit draft/submit.
- [ ] T11 — Mission assignment/operator acceptance/readiness.
- [ ] T12 — Complete/cancel/reject/fail/conflict/retry/rollback.
- [ ] T13 — Private media + expiry/ownership qua UI/API/MinIO.
- [ ] T14 — Dashboard counts + audit completeness/permission.
- [ ] T15 — Public content/SEO/CTA + responsive/accessibility.
- [ ] T16 — Approved SSO/CSRF implementation + legacy regression.
- [ ] T17 — Persistence/restart/backup/restore dữ liệu test.
- [ ] T18 — Dependency remediation + full security coverage.
- [ ] T19 — Hosted CI + staging evidence.
- [ ] T20 — Final clean-code review/regression/docs/commits/handoff.

## Checkpoint hiện tại

M6 vẫn PARTIAL / NOT_READY. API E2E PASS là bằng chứng đầu vào, không đóng toàn bộ các task trên. Auth contract, pricing/legal content, scope chưa có BA và staging access phải được làm rõ tại task tương ứng. Chưa thực hiện code/product changes trong lượt viết Goal. Phiên tiếp theo bắt đầu T01/T02 và chuẩn bị T05; không chạy lại mọi kiểm thử chỉ để tạo số lượng evidence trước khi xác định coverage cần bổ sung.
