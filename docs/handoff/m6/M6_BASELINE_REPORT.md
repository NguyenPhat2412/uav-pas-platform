# M6 baseline report

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

## Latest continuation — 2026-10-15

New continuation began clean at branch codex/m1-monorepo-foundation, HEAD 65d1b23da3d888d1ef8120462f2689da8cffd7cb. Product/test/documentation changes now remain uncommitted. No reset, merge, rebase, commit, push or deploy occurred. The earlier push of 65d1b23 was verified on 2026-10-10. Tested source fingerprints: `evidence/tests/ui-business-2026-10-15/`summary.json. See [2026-10-15 business UI report](M6_BUSINESS_UI_E2E_2026_10_15.md).

## Earlier verification record (historical)

**Status: PARTIAL.** The baseline branch is clean at the requested commit; M6 evidence and handoff edits are the only current working-tree changes. No source or backend auth contract was changed.

- Branch: codex/m1-monorepo-foundation
- HEAD: ca8a36bbbd12742f75c3c61d2ae5045d38bde753
- Worktree: /Volumes/D/Codex/projects/uav-pas-platform
- Worktrees: one checkout
- Working-tree: clean before the handoff/evidence documentation edits
- M1-M6 source and handoff files are present at the requested baseline.
- M6 changes: only independent start ports and local app origins for customer, operations and admin. Backend source was not changed by M6.

The code baseline is the requested clean HEAD; this handoff adds documentation/evidence after runtime verification and is not a release commit. Architecture documents and M1-M5 handoffs were reviewed.

## Current verification

The frontend, legacy, Maven and disposable infrastructure checks below were rerun in this continuation. Current logs and summaries are under `evidence/tests/`; no product source was changed.

| Scope | Command | Result |
|---|---|---|
| Root workspaces | npm run lint | PASS, exit 0 |
| Root workspaces | npm run typecheck | PASS, exit 0 |
| Root workspaces | npm test | PASS, exit 0 |
| Root workspaces | npm run build | PASS, exit 0 |
| Legacy frontend | npm run lint | PASS, exit 0 |
| Legacy frontend | npm run typecheck | PASS, exit 0 |
| Legacy frontend | npm run test | PASS, exit 0; 5 tests |
| Legacy frontend | npm run build | PASS, exit 0 |
| Backend | ./mvnw test -q | PASS, exit 0; 204 tests, 0 failures, 0 errors, 6 skipped |
| Backend infra | disposable PostgreSQL 16 + MinIO stack, targeted stabilization tests | PASS, exit 0; PostgreSQL 5 and MinIO 1 |

Evidence is under evidence/tests/. The npm commands used the pinned Node 20 runtime directly because the desktop npm shim pointed at an unavailable application path; this is an environment/tooling issue, not a source failure. Browser smoke is recorded in `evidence/tests/browser.json`; authenticated browser E2E remains NOT_VERIFIED because the existing dev servers are locked to the 3100-series API configuration.
