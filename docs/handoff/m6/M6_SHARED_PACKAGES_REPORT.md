# M6 shared packages report

## Điều phối operator, trạm và thiết bị — 2026-10-16 (mới nhất)

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

## UI continuation — 2026-10-15 (latest)

Vietnamese portal UI, lifecycle/permission-aware controls, compact history and mobile improvements are now verified on local standalone builds: 27 main UI checks, 5 ownership/stale-state checks, 3 rejection checks, 15 responsive cases and 3 logout/protected-route cases PASS. Root lint/typecheck/test/build PASS. See [M6_UI_POLISH_2026_10_15.md](M6_UI_POLISH_2026_10_15.md) and `evidence/tests/ui-polish-2026-10-15/summary.json` for exact source fingerprints and limits. Backend/auth contract unchanged; overall **PARTIAL / NOT_READY**. Earlier results below are historical snapshots of their stated source versions.


## Latest continuation — 2026-10-15

@uav/api-client now restricts automatic credentials, refresh retry and permission invalidation to the configured API origin. Origin-boundary tests cover external ports/schemes/lookalike hosts and external 401/403; normal API refresh still passes. All 4 apps and 7 shared packages pass root lint/typecheck/test/build. See [2026-10-15 business UI report](M6_BUSINESS_UI_E2E_2026_10_15.md).

## Earlier verification record (historical)

**Status: PASS for compile/build compatibility.**

The workspace resolves and builds @uav/api-client, @uav/auth-contracts, @uav/config, @uav/design-tokens, @uav/query, @uav/types and @uav/ui for all four apps. Root lint, typecheck, tests and production builds pass. App configs use transpilePackages; no app-to-app dependency was introduced.

The shared auth/query boundary still exposes the current bearer/localStorage compatibility model. That is documented as an SSO blocker rather than hidden in a package wrapper.
