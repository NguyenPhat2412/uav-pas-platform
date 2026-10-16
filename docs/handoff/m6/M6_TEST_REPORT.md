# M6 test report

## Hồ sơ khách hàng — 2026-10-16 (mới nhất)

Đã chốt và hoàn thiện tự sửa **họ tên/số điện thoại**; backend chặn trường nhạy cảm và ghi đè giữa hai tab, có unique phone index V4, audit không lưu giá trị cá nhân. **620 backend tests, 0 skip; root/legacy đủ bốn gate PASS (85/7 lượt test); 15 nhóm browser/API hỗ trợ PASS**. Auth contract không đổi; schema có thêm index, cần kiểm dữ liệu trùng trước khi nâng cấp môi trường thật. Xem [báo cáo hồ sơ khách hàng](M6_CUSTOMER_PROFILE_2026_10_16.md) và evidence `evidence/tests/customer-profile-2026-10-16/`. Phạm vi **COMPLETE_LOCAL**; toàn dự án **PARTIAL / NOT_READY**. Chưa commit/push. Các kết quả bên dưới là lịch sử; không cộng lượt chạy lặp.

## Tiếp nhận và bàn giao — 2026-10-16 (lịch sử)

Kết quả mới nhất: **592/592 backend tests, 0 failure/error/skip**, bao gồm 62 lượt bàn giao H2/PostgreSQL và kiểm MinIO thật. Root và legacy lint/typecheck/test/build PASS, **81/7 lượt frontend test**. **13 nhóm luồng chính + 4 legacy + 1 thư viện media PASS**, có API fixture/read-back. Các lỗi thực tế, lần thử harness, console favicon 404 và giới hạn được tách trong [báo cáo tiếp nhận/bàn giao](M6_MISSION_HANDOVER_2026_10_16.md); evidence tại `evidence/tests/mission-handover-2026-10-16/`. Không cộng các lượt lịch sử bên dưới.

Các kết quả phía dưới là lịch sử của revision tương ứng.

## Bảo vệ bản nháp và unknown route — 2026-10-16 (lịch sử, 530 tests)

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


## Latest continuation — 2026-10-15

Local authenticated mission UI now passes 23 checks, with 5 negative checks and natural-expiry refresh/logout across three portals. Three reproduced product bugs were fixed. Root and legacy lint/typecheck/test/build all exit 0. Backend: 205 tests, 0 failures/errors, 7 skipped; the 7 infrastructure tests run separately pass with 0 skips. See [2026-10-15 business UI report](M6_BUSINESS_UI_E2E_2026_10_15.md) and `evidence/tests/ui-business-2026-10-15/`. No new npm audit/full security scan/hosted CI run; older results below retain their original dates/scope.

## Earlier verification record (historical)

## Passing checks

- Current isolated runtime: actuator health 200, protected API health 401, anonymous/invalid-token 401, correct CORS preflight/rejection, synthetic 401/403/ownership matrix, complete customer -> operations -> admin mission flow, signed upload/download and admin audit all pass; evidence is in `evidence/tests/m6-current-isolated-runtime.json`.

- Root workspace rerun: lint, typecheck, test and build all exit 0; logs are `root-*-current.log`.
- Existing M1-M5 structural tests remain included in the root test run.
- Legacy frontend rerun: lint, typecheck, 5 session/API tests and build all pass; logs are `legacy-*-current.log`.
- Backend default suite rerun: 204 tests, 0 failures, 0 errors, 6 skipped; exit 0.
- Disposable infrastructure rerun: PostgreSQL stabilization 5/5 and MinIO stabilization 1/1; evidence is `backend-stabilization-current.log` and its summary JSON.
- Flyway migration regression: fresh V1+V2 and V1→V2 upgrade with synthetic-row preservation pass on PostgreSQL; 1 test, 0 skipped; evidence `backend-migration-upgrade-current-summary.json`.
- Persistence/restore drill: PostgreSQL named-volume restart + `pg_dump/pg_restore` and MinIO named-volume restart + delete/restore preserve the synthetic media row/object SHA; evidence `backend-durability-restore-current-summary.json`.
- Browser smoke rerun: four apps, guarded routes, 16 viewport checks, fixed-origin navigation and no overflow; PASS (`browser.json`).
- Authenticated browser portal smoke now passes for customer/operator/admin login, protected routes, refresh recovery, logout and post-logout guard on isolated direct API origin; evidence is `evidence/tests/authenticated-browser-direct-origin.json`. Mission business UI, SSO, CSRF and staging remain unverified.

## Not passed or not claimable

- npm audit exits 1 for 5 high-severity development-toolchain findings in both root and legacy lockfiles; production-only audits are clean. No automatic major upgrade was applied. Evidence: `evidence/tests/npm-audit-summary.json`.
- Hosted CI was not run.
- Durability/restore evidence is disposable synthetic storage only; it does not close production backup policy, cross-region recovery or object-lock acceptance.
- Authenticated browser portal smoke is PASS, but authenticated business UI E2E and cross-domain SSO are not verified; direct isolated API authorization and business E2E are verified.
- Current Codex Security scan `3b9f81ce-188c-4aa8-ad16-4d0be497515c` is complete with 0 reportable findings in 5 reviewed surfaces, but coverage is partial (827 files) and is not a clean full-repository attestation.

Evidence files are in evidence/tests/, evidence/runtime/ and evidence/screenshots/.
