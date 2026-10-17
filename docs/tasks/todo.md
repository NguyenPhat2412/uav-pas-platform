# UAV PAS M1–M6 — checklist cho phiên thực thi

Latest auth continuation (2026-10-15): đã sửa M6-B9 login đồng thời và các race refresh/logout/đếm sai mật khẩu; auth contract giữ nguyên. Full Maven 390 tests PASS, 0 skip; API 14 nhóm PASS; browser 13 checks PASS. Báo cáo/evidence cuối: `docs/handoff/m6/M6_AUTH_CONCURRENCY_2026_10_15.md`. Toàn dự án PARTIAL / NOT_READY; SSO/CSRF và staging/CI/full security vẫn mở. Checklist/checkpoint cũ bên dưới là lịch sử trừ mục có cập nhật cụ thể.

Baseline code: ca8a36bbbd12742f75c3c61d2ae5045d38bde753. Goal: `docs/goals/M1_M6_COMPLETION_GOAL.md`.

## Đã chuẩn bị trong lượt lập Goal

- [x] Đọc handoff M1–M6 gaps, M6 evidence và kiến trúc auth/deployment.
- [x] Ghi Goal, draft BA acceptance, plan/dependencies và completion ledger.
- [~] Source boundary inventory đã lập trong `docs/ba/M1_M6_SOURCE_INVENTORY.md`; BA gốc/denominator và row-level FE→API→permission→DB→test mapping vẫn chưa chốt, nên T01 còn mở.

## Thực thi

- [~] T01 — Baseline/source inventory đã có; tiếp tục row-level BA traceability và chốt các unknown/approval.
- [~] T02 — Isolated full-stack runtime đúng API origin cho browser; main business UI, natural-expiry sessions và selected ownership/negative checks PASS ở `docs/handoff/m6/M6_BUSINESS_UI_E2E_2026_10_15.md`; staging/SSO còn mở.
- [~] T03 — Schema inventory/ERD/dictionary đã lập ở `docs/architecture/UAV_PAS_SCHEMA_INVENTORY.md`; constraint/index/query-plan và BA cardinality verification còn mở.
- [x] T04 — Fresh migration + V1→V2 upgrade data-preservation test PASS trên PostgreSQL disposable; evidence `docs/handoff/m6/evidence/tests/backend-migration-upgrade-current-summary.json`.
- [ ] T05 — SSO/CSRF/revocation ADR và approval cụ thể.
- [~] T06 — Browser ownership/admin-page denial PASS; users CRUD/lock/revoke end-to-end còn mở.
- [ ] T07 — Station vertical slice.
- [~] T08 — UAV maintenance/history, điều phối lại, lịch định kỳ theo ngày, phiếu sửa chữa và chi phí vật tư đã triển khai; xem `docs/handoff/m6/M6_MAINTENANCE_PLANNING_2026_10_15.md`. Không suy rộng thành mọi policy fleet/giờ bay/kiểm định đã nghiệm thu.
- [ ] T09 — Inventory/reserve/release/transfer/concurrency.
- [~] T10 — Customer create draft/submit qua UI PASS; catalog và edit-draft acceptance còn mở.
- [~] T11 — Main UI confirm/assign/accept/admin-ready PASS; đầy đủ role/resource-negative cases còn mở.
- [~] T12 — UI complete và stale-submit 409 recovery PASS; cancel/reject/fail/conflict/rollback còn mở.
- [~] T13 — UI upload/attach/customer download bytes PASS sau sửa bearer leak sang storage; signed URL expiry và full ownership matrix còn mở.
- [~] T14 — Audit COMPLETED đúng mission PASS; operator dashboard permission fix verified; full counts/audit completeness còn mở.
- [ ] T15 — Public content/SEO/CTA + responsive/accessibility.
- [ ] T16 — Approved SSO/CSRF implementation + legacy regression.
- [x] T17 — PostgreSQL/MinIO named-volume restart và synthetic DB/object backup-restore PASS; evidence `docs/handoff/m6/evidence/tests/backend-durability-restore-current-summary.json`.
- [~] T18 — API-origin credential boundary fixed/tested; dependency remediation và full security coverage còn mở.
- [ ] T19 — Hosted CI + staging evidence.
- [ ] T20 — Final clean-code review/regression/docs/commits/handoff.

## Checkpoint trước các lượt BA/bảo trì (lịch sử)

2026-10-15: M6 vẫn PARTIAL / NOT_READY. Main business UI PASS (23 checks), selected negatives PASS (5), natural-expiry refresh/logout PASS (3 portals), root/legacy gates PASS, backend 205 tests (7 skips) và 7 infra tests riêng PASS. Đã sửa signed-storage credential forwarding, customer stale-action rejection và operator dashboard forbidden request. T04/T17 giữ trạng thái đã đóng; các task khác chỉ cập nhật phần có evidence, không coi happy path là full acceptance. SSO/CSRF cần approval auth contract trước khi đổi; staging/CI/full security và BA denominator vẫn mở. Báo cáo: `docs/handoff/m6/M6_BUSINESS_UI_E2E_2026_10_15.md`.
