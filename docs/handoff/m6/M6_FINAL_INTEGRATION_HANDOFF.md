# UAV PAS — M6 final integration handoff

## Bảo vệ bản nháp và unknown route — 2026-10-16 (mới nhất)

Đã chặn ghi đè DRAFT từ hai tab bằng phiên bản đi cùng nội dung biểu mẫu; backend khóa giao dịch và trả 409 khi bản cũ. UI giữ dữ liệu đang nhập, chỉ thay khi người dùng chọn tải bản mới. Đường dẫn không tồn tại trả 404; anonymous trên đường dẫn bảo vệ vẫn 401. **530 backend tests PASS, 0 skip; root/legacy đủ bốn gate PASS (78/7 lượt test); 13 nhóm browser/API hỗ trợ PASS** cho tạo/sửa/gửi/hủy, hai tab, mất phản hồi và quyền sở hữu. Auth contract/schema/dependencies không đổi; API nghiệp vụ PATCH mission mới yêu cầu `expectedVersion`. Xem [báo cáo bản nháp](M6_DRAFT_SAFETY_2026_10_16.md) và `evidence/tests/draft-safety-2026-10-16/`. Phạm vi **COMPLETE_LOCAL**; toàn dự án **PARTIAL / NOT_READY**. Baseline `f7b9f13`; mã nguồn kiểm chứng đã được đóng gói trong `dc83c67` (bản nháp) và `9f1bbfa` (404), cùng commit tài liệu/evidence đi sau. Môi trường thử nghiệm đã dọn. Các kết quả phía dưới là lịch sử của source tương ứng, không cộng lượt chạy lặp.

## Điều phối operator, trạm và thiết bị — 2026-10-16 (lịch sử, 494 tests)

Đã bổ sung thay/gỡ operator và trạm, đổi số lượng/thiết bị và hoàn trả từng khoản giữ; kiểm tra lịch, phiên bản màn hình, số dư kho, rollback và audit. Sửa eligibility operator và kiểm tra lại tài nguyên ở READY/START. **494/494 backend tests PASS, 0 skip**; root/legacy đủ bốn gates PASS (76/7 lượt test); **21 nhóm browser/API bổ trợ và 2 nhóm audit UI PASS**. Auth contract, schema và dependencies không đổi. Xem [báo cáo điều phối tài nguyên](M6_RESOURCE_REDISPATCH_2026_10_16.md) để biết phạm vi thực tế, evidence và giới hạn. Phạm vi này COMPLETE cục bộ; toàn hệ thống **PARTIAL / NOT_READY**. Các kết quả bên dưới là lịch sử, không cộng lượt chạy lặp.

## Ưu tiên 1 — ghi chú, quyền, kho và media — 2026-10-16

Đã sửa backend trả 400 cho ghi chú quá dài, biểu mẫu quyền bị khóa sau lưu, thao tác mở khóa tài khoản và thông báo/phục hồi media trên UI. **444/444 backend tests PASS, 0 skip**; root và legacy lint/typecheck/test/build PASS; **30/30 nhóm browser và API bổ trợ PASS** cho quyền, kho, media, upload/gắn kết quả tại nhiệm vụ và đổi tài khoản cùng browser. Giữ nguyên auth contract, schema và dependencies. Phạm vi, evidence trước/sau và giới hạn tại [báo cáo ưu tiên 1](M6_PRIORITY1_2026_10_16.md). Các kết quả cũ bên dưới là lịch sử; không cộng lượt chạy lặp. Toàn dự án vẫn **PARTIAL / NOT_READY**.

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

## UI continuation — 2026-10-15 (latest)

Vietnamese portal UI, lifecycle/permission-aware controls, compact history and mobile improvements are now verified on local standalone builds: 27 main UI checks, 5 ownership/stale-state checks, 3 rejection checks, 15 responsive cases and 3 logout/protected-route cases PASS. Root lint/typecheck/test/build PASS. See [M6_UI_POLISH_2026_10_15.md](M6_UI_POLISH_2026_10_15.md) and `evidence/tests/ui-polish-2026-10-15/summary.json` for exact source fingerprints and limits. Backend/auth contract unchanged; overall **PARTIAL / NOT_READY**. Earlier results below are historical snapshots of their stated source versions.


## Current status — 2026-10-15

**PARTIAL / NOT_READY.** The main synthetic mission workflow now passes through authenticated Customer, Operations and Admin interfaces against disposable PostgreSQL/MinIO. Three real frontend/API-client defects were fixed and verified. SSO/CSRF, full lifecycle/role coverage, hosted CI, staging and full security closure remain open.

Preceding integration report: [M6_BUSINESS_UI_E2E_2026_10_15.md](M6_BUSINESS_UI_E2E_2026_10_15.md). Evidence directory below: `evidence/tests/ui-business-2026-10-15/`.

## Repository and change boundary

- Branch: `codex/m1-monorepo-foundation`; HEAD: `65d1b23da3d888d1ef8120462f2689da8cffd7cb`.
- Worktree: `/Volumes/D/Codex/projects/uav-pas-platform`.
- HEAD was pushed and verified on 2026-10-10. Current product/test/documentation changes are uncommitted; no new push or PR in this continuation.
- Tested source is HEAD plus the working-tree patch, identified by product file SHA-256 hashes in `summary.json`. Earlier `ca8a36b` evidence remains historical and is not relabeled as a new run.
- Changed product behavior: shared/legacy clients restrict automatic credentials/session recovery to the API origin; customer stale actions display an error and refetch state; operator overview respects effective dashboard permissions.
- Backend source, JSON bearer contract, schema and dependency versions unchanged. No Git reset/merge/rebase/commit, production deploy or unrelated-service changes.

## Acceptance matrix

| Group | Result | Command / endpoint | Latest evidence | Limit |
|---|---|---|---|---|
| Frontend workspace | PASS | root npm lint/typecheck/test/build | `root-*.log`, `checks.json` | 4 apps + 7 shared packages; builds do not prove all features |
| Legacy frontend | PASS | same four commands under frontend | `legacy-*.log` | 5 existing session tests + 2 boundary tests; no full legacy browser run |
| Backend default tests | PASS with skips | `./mvnw test` | `backend-tests-summary.log` | 205 tests, 0 failures/errors, 7 infrastructure skips |
| Disposable infrastructure | PASS | StabilizationPostgresTest, StabilizationMinioTest, MigrationUpgradePostgresTest | `infra-tests-summary.log` | 7 tests, 0 skips/failures/errors; all skipped infrastructure cases run separately |
| Main business UI | PASS — local synthetic | browser create/submit/confirm/assign/accept/ready/start/upload/complete/download/audit | `browser-result.json` | 23 checks; admin readiness in current UI; separate portal logins |
| Ownership/error UI | PASS — selected cases | customer B direct mission/list; stale second submit; cancellation recovery; audit | `negative-result.json` | 5 checks; not every permission/lifecycle combination |
| Session browser | PASS — natural expiry | auth login, me 401, refresh 200, logout 200, protected-route denial | `session-result.json` | 3 portals; test TTL 5 seconds; no SSO claim |
| Admin access denial | PASS — selected case | operator opens Admin users page | `session-result.json` | Table hidden/denial shown; lock/revoke UI remains open |
| Desktop/mobile | PASS — selected pages | 1440×1000 and 390×844 | `screenshots/` | No page overflow; audit table scrolls horizontally; not a full accessibility audit |
| API-origin security regression | PASS | origin-boundary tests + real signed media PUT/download | root/legacy test logs, browser evidence | Prevents automatic credential forwarding; not a full security scan |
| Persistence/restore | PASS — earlier synthetic drill | named-volume restart and DB/object restore | `evidence/tests/backend-durability-restore-current-summary.json` | Earlier evidence, not rerun in this continuation; production recovery policy remains open |
| Cross-domain SSO / CSRF | BLOCKED pending approval | current JSON bearer/localStorage contract | `M6_AUTH_SSO_REPORT.md` | No implementation change without reviewed auth-contract approval |
| Dependency/security closure | PARTIAL | previous audit/partial scan only | earlier audit/security evidence | Previous 5 high development-toolchain entries; no new full audit/scan in this continuation |
| Hosted CI / staging | NOT_VERIFIED | no hosted/staging run | `M6_CICD_REPORT.md`, `M6_DEPLOYMENT_READINESS.md` | Local pass is not deployment readiness |

## Environment and cleanup

Customer `3101`, Operations `3102`, Admin `3103` used backend `18080`, PostgreSQL `55444` and MinIO `9014`. Web `3100` was started/build-checked; its public content browser checks were not repeated. Synthetic users and resources only. Browser plugin unavailable; dedicated Playwright Chromium contexts used. No credential/token/storage-state dumps, signed URLs or secrets are included in evidence.

Frontend/backend test processes were stopped and the disposable Compose project removed. Port 8080 and unrelated services were untouched. Temporary credentials/raw backend logs were removed after sanitization. Screenshots have output copies at `/Volumes/D/Codex/outputs/uav-ui-business-20261015/`.

## Remaining work

- Complete draft editing, cancel/reject/fail/resource conflict/rollback and remaining resource CRUD UI cases.
- Review terminal-mission controls/detail tabs; this main workflow does not validate every visible control.
- Complete user lock/revoke and full permission/media-expiry/audit-count acceptance.
- Obtain explicit approval before changing SSO/CSRF auth contract, then verify HTTPS cross-origin behavior.
- Remediate dependency findings, complete security coverage, run hosted CI and staging/rollback checks.
- Finish BA traceability and final same-source completion audit. Goal remains active; no product-wide percentage or COMPLETE claim.

The ledger, task checklist and all scope reports distinguish the new browser evidence from earlier API/auth-smoke evidence. AI/SAR/Payment remain outside the implemented M6 scope; unapproved BA unknowns are not silently counted as delivered.
