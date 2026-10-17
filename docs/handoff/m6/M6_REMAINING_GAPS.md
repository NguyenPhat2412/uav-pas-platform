# Các phần còn thiếu hiện tại — 17/10/2026

Đã đóng cục bộ các sửa chữa quota/report/settings/kho, media lifecycle và outbox/webhook theo phạm vi kiểm thử. Còn mở: HTTPS staging/SSO thực; hosted CI cho source cuối; full security coverage;5HIGH dev-toolchain mỗi cây; các tổ hợp UI/quyền/thiết bị chưa chạy. Cookie/CSRF hiện đã có, không còn đúng khi gọi hệ thống chỉ dùng localStorage bearer. Ngoại lệ quyền webhook adminORUSER_MANAGE so với UI cần quyết định riêng.

**KPI báo cáo chưa chốt:** dữ liệu trống hiện trả100%; đã hỏi chính sách mẫu số/hiển thị, chưa sửa khi chưa có câu trả lời. LayoutPASS không phải KPI correctnessPASS.

Xem [báo cáo hiện tại và bảng PASS/FAIL/BLOCKED](M6_FULL_PRIORITIES_2026_10_17.md) và [index evidence](evidence/tests/full-priorities-20261017/README.md). Các giới hạn có trong báo cáo hiện tại được giữ nguyên; không suy từ kết quả local thành production-ready.

<details>
<summary>Hồ sơ lịch sử trước 17/10/2026 — không phải trạng thái hiện tại</summary>

Những tiêu đề “mới nhất”, số test, cấu trúc thư mục và trạng thái auth trong phần lưu trữ dưới đây chỉ đúng tại ngày/bản nguồn được ghi. Báo cáo hiện tại phía trên có ưu tiên khi đọc trạng thái hôm nay.

# M6 remaining gaps

> **Cập nhật tích hợp main — 16/10/2026:** xem [M6_MAIN_INTEGRATION_2026_10_16.md](M6_MAIN_INTEGRATION_2026_10_16.md) cho source và kiểm chứng mới nhất. Phần dưới giữ lịch sử của nhánh/lượt kiểm tương ứng; migration hồ sơ hiện là V10, bảo trì là V9, auth browser giữ cookie của main. Toàn hệ thống vẫn PARTIAL / NOT_READY.

## Hồ sơ khách hàng — 2026-10-16 (mới nhất)

Đã chốt và hoàn thiện tự sửa **họ tên/số điện thoại**; backend chặn trường nhạy cảm và ghi đè giữa hai tab, có unique phone index V4, audit không lưu giá trị cá nhân. **620 backend tests, 0 skip; root/legacy đủ bốn gate PASS (85/7 lượt test); 15 nhóm browser/API hỗ trợ PASS**. Auth contract không đổi; schema có thêm index, cần kiểm dữ liệu trùng trước khi nâng cấp môi trường thật. Xem [báo cáo hồ sơ khách hàng](M6_CUSTOMER_PROFILE_2026_10_16.md) và evidence `evidence/tests/customer-profile-2026-10-16/`. Phạm vi **COMPLETE_LOCAL**; toàn dự án **PARTIAL / NOT_READY**. Chưa commit/push. Các kết quả bên dưới là lịch sử; không cộng lượt chạy lặp.

## Tiếp nhận và bàn giao — 2026-10-16 (lịch sử)

Đã đóng trong môi trường local các gap tiếp nhận trước READY/START, tiếp nhận lại sau đổi nguồn lực, điều kiện bàn giao theo loại và bất biến tệp sau COMPLETED/FAILED/CANCELLED/REJECTED. Xem [báo cáo tiếp nhận/bàn giao](M6_MISSION_HANDOVER_2026_10_16.md) với **592 backend tests, 18 nhóm browser/API hỗ trợ PASS**. Còn mở staging HTTPS, hosted CI đầy đủ, security coverage, SSO/CSRF cần duyệt contract, retention/orphan media và các tổ hợp UI chưa kiểm. Favicon của ba portal còn trả 404 (lỗi hiển thị nhỏ). Không coi các policy accept/media trong phần lịch sử dưới đây là chưa chốt nữa.

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


| ID | Priority | Problem / evidence | Affected area | Acceptance criteria | Owner |
|---|---|---|---|---|---|
| M6-B1 | RESOLVED for isolated verification | Spring ran on 18080 with disposable PostgreSQL/MinIO; health/auth/CORS evidence in `evidence/tests/m6-current-isolated-runtime.json` | Backend/API integration | Repeat against approved staging port/config | Backend/DevOps |
| M6-B2 | BLOCKER | Cookie/SSO/CSRF contract is not implemented; current auth is origin-local localStorage bearer | All portals/auth | Approved backend cookie or OAuth code+PKCE path, HTTPS browser test, refresh/logout/CSRF evidence | Backend/Security |
| M6-B3 | PARTIAL — isolated API + portal auth smoke passed | Local browser proves customer B direct-ID/list isolation and operator admin-page denial; complete permission combinations and staging remain open | Permissions/data isolation | Repeat ownership/direct-ID cases in staging browser flow | QA/Security |
| M6-B4 | PARTIAL — isolated API + portal auth smoke passed | Main mission flow and the documented maintenance/repair/material branches pass locally; untested lifecycle combinations, staging and SSO remain open | Business E2E | Pass mission workflow against approved staging data and origins | Product/QA |
| M6-B5 | HIGH | Historical npm audit reported 5 high development-toolchain entries in root and legacy and 0 production-only findings; not re-audited on the current revision | Supply chain | Review advisories, pin/upgrade compatible dependencies, rerun audit with policy decision | DevEx/Security |
| M6-B6 | MEDIUM | CI covers all four frontend workspaces and legacy; backend/PostgreSQL/MinIO/browser/security and staging gates remain absent | CI/CD | Reviewed workflow runs all required checks and artifacts | DevOps |
| M6-B7 | MEDIUM | Baseline 7981fde is the pre-verification snapshot; priority-1 source commits 2694f01, 72e3ef0 and 4f1877c plus the accompanying evidence commit package the 2026-10-16 fixes; no PR created | Release baseline | Review the published priority-1 commit series and create a PR when requested | Maintainer |
| M6-B8 | LOW | Authenticated desktop/mobile screenshots now exist for mission, audit, denial and conflict recovery; complete viewport/accessibility coverage remains open | UX/E2E | Complete accessibility and remaining role/viewport checks; see M6_BUSINESS_UI_E2E_2026_10_15.md | QA |
| M6-B9 | RESOLVED — local verification (2026-10-15) | Lỗi login/refresh/logout đồng thời và mất số lần nhập sai đã được sửa; 390/390 backend tests, 14/14 nhóm HTTP (813 phản hồi, 0 HTTP 500), 13/13 browser checks PASS. Evidence FAIL trước sửa được giữ nguyên; xem [báo cáo auth concurrency](M6_AUTH_CONCURRENCY_2026_10_15.md) | Backend auth/session concurrency | Đạt kiểm chứng cục bộ: một refresh hiện hành/tài khoản, refresh chỉ tiêu thụ một lần, logout đúng token và khóa tài khoản theo số lần sai; giữ nguyên auth contract. Staging/SSO/CSRF thuộc các mục còn mở riêng | Backend/Security |

2026-10-15 local evidence and repaired findings: [business UI report](M6_BUSINESS_UI_E2E_2026_10_15.md). Historical dependency/security findings were not re-audited in this continuation.


</details>
