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
- [x] T04 — Fresh migration + V1→V2 upgrade data-preservation test PASS trên PostgreSQL disposable; evidence `docs/handoff/m6/evidence/tests/backend-migration-upgrade-current-summary.json`.
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

M6 vẫn PARTIAL / NOT_READY. API E2E PASS và portal auth smoke là bằng chứng đầu vào, không đóng toàn bộ các task trên. T01 source map, T02 isolated browser auth smoke và T03 schema inventory đã có checkpoint; T04 migration fresh/upgrade, T05 auth approval, business UI E2E, SSO/CSRF, security closure, hosted CI và staging vẫn mở. Auth contract, pricing/legal content, scope chưa có BA và staging access phải được làm rõ tại task tương ứng.
