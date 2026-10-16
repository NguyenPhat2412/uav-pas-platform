# M6 authentication and SSO report

> **Cập nhật tích hợp main — 16/10/2026:** xem [M6_MAIN_INTEGRATION_2026_10_16.md](M6_MAIN_INTEGRATION_2026_10_16.md) cho source và kiểm chứng mới nhất. Phần dưới giữ lịch sử của nhánh/lượt kiểm tương ứng; migration hồ sơ hiện là V10, bảo trì là V9, auth browser giữ cookie của main. Toàn hệ thống vẫn PARTIAL / NOT_READY.

## Cập nhật 2026-10-16

Lượt ưu tiên 1 giữ nguyên endpoint/DTO/mapper auth, JWT, storage token và chính sách phiên. UI dùng API khóa/mở khóa sẵn có, không suy diễn khóa truy cập từ trạng thái hồ sơ. Hash 89 file auth/config/schema/dependency được bảo vệ không đổi. Chưa triển khai SSO/CSRF; xem [báo cáo ưu tiên 1](M6_PRIORITY1_2026_10_16.md).

## Login, refresh và logout đồng thời — 2026-10-15 (lượt hiện tại)

Bản vá dùng khóa giao dịch theo tài khoản để tuần tự hóa login/refresh/logout, đọc lại đúng refresh token sau khi chờ khóa và giữ đúng số lần nhập sai. Giữ nguyên một refresh token hiện hành/tài khoản, logout theo token được cung cấp và **auth contract JSON bearer hiện có**; không đổi endpoint, DTO, schema, cookie, SSO hoặc CSRF.

Kết quả cuối: **390/390 backend tests PASS, 0 skip**; **14/14 nhóm HTTP PASS, 813 phản hồi không có 500**; **13/13 browser checks PASS** cho login, refresh khi hết hạn tự nhiên, logout/guard trên ba portal và chính sách cùng tài khoản trong hai trình duyệt. **M6-B9 RESOLVED trong môi trường kiểm chứng cục bộ**; phạm vi, chính sách phiên và evidence tại [báo cáo auth concurrency](M6_AUTH_CONCURRENCY_2026_10_15.md). Các khối bảo trì 356/297 bên dưới là lịch sử của source tương ứng. SSO/CSRF, staging, hosted CI và security coverage đầy đủ chưa được nghiệm thu; toàn dự án vẫn **PARTIAL / NOT_READY**.

## Lịch bảo trì, phiếu sửa chữa và chi phí vật tư — 2026-10-15 (lịch sử, 356 tests)

Đã bổ sung lịch định kỳ theo ngày, phiếu sửa chữa và vật tư/số lượng/đơn giá VND; tổng tiền do server tính, **không trừ kho thiết bị**. API UAV cũ không thể vượt qua phiếu IN_PROGRESS. Mọi API mới, kể cả đọc chi phí, dùng quyền **UAV_MANAGE** hiện có; **auth contract không đổi**.

Kết quả của lượt bảo trì trước: **356 backend tests PASS, 0 skip**; root/legacy lint, typecheck, test và build PASS. Phạm vi, số nhóm browser và evidence cuối được đối chiếu tại [báo cáo lịch bảo trì và sửa chữa](M6_MAINTENANCE_PLANNING_2026_10_15.md), không cộng các lượt kiểm thử lặp vào tổng.

Tại thời điểm lượt bảo trì, lỗi đăng nhập đồng thời cùng tài khoản còn mở: **6/6 lần** có một 200 và một 500 do `refresh_tokens_user_id_key`. Bản vá và kết quả hiện tại được theo dõi trong [báo cáo auth concurrency](M6_AUTH_CONCURRENCY_2026_10_15.md). SSO/CSRF, staging, hosted CI và security coverage đầy đủ chưa được nghiệm thu. Toàn dự án **PARTIAL / NOT_READY**. Các khối 297/212 và các kết quả cũ bên dưới là lịch sử của source tương ứng.

## Phát hiện auth trong lượt bảo trì (lịch sử; xem bản vá kế tiếp)

Hai yêu cầu login đồng thời cho cùng tài khoản synthetic tái hiện **6/6 lần** một phản hồi 200 và một 500 do ràng buộc duy nhất `refresh_tokens_user_id_key`. Đây là lỗi concurrency backend đã xác minh, không phải lỗi giao diện hoặc dữ liệu kiểm thử. Chưa sửa auth source trong lượt này; các luồng nghiệp vụ được chạy tuần tự để kiểm phạm vi bảo trì riêng. Evidence đã loại secret: `evidence/tests/maintenance-planning-2026-10-15/auth-concurrency-observation.json`; xem [báo cáo bảo trì tại thời điểm phát hiện](M6_MAINTENANCE_PLANNING_2026_10_15.md). Login đơn lẻ và refresh/logout đạt không chứng minh đăng nhập đồng thời an toàn; lỗi này được xử lý trong [lượt sửa và kiểm thử auth riêng](M6_AUTH_CONCURRENCY_2026_10_15.md), giữ nguyên contract hiện có. **Cập nhật 15/10/2026: M6-B9 RESOLVED trong môi trường kiểm chứng cục bộ.** Full Maven 390/390 PASS; HTTP 14/14 nhóm với 813 phản hồi, không có 500, gồm 96 yêu cầu login đồng thời đều trả 200 và 72 yêu cầu refresh cùng token (mỗi đợt đúng một 200, còn lại 401). Browser 13/13 checks PASS, 61 phản hồi API gồm 50×200 và 11×401 dự kiến; không có lỗi JavaScript, 5xx hoặc lỗi truyền tải ngoài các request bị hủy. Đã kiểm login/refresh hết hạn tự nhiên/logout/guard ở Customer, Operations và Admin cùng hành vi hai trình duyệt dùng chung tài khoản. Auth contract vẫn giữ nguyên; kết quả này không đóng các mục SSO/CSRF, staging, hosted CI hoặc full security coverage.

## Bảo trì và điều phối lại UAV — 2026-10-15 (lịch sử, 297 tests)

Đã hoàn thiện bảo trì/hoàn tất bảo trì có lý do, gán trạm giữ AVAILABLE, thay/gỡ UAV trước bay và khôi phục ASSIGNED vô chủ có bảo vệ. Sửa chặn UAV bận, dữ liệu cũ/tranh cùng UAV, tiếp nhận/báo vướng mắc sau terminal, sở hữu UAV trùng khi READY/START, số lượng phân công thiếu/null trả 500 và thông báo xung đột ngoài viewport. **Auth contract không đổi.**

Kết quả của lượt trước: root/legacy gates PASS; **297 backend tests PASS, 0 skip** với PostgreSQL/MinIO; **27** checks luồng chính; **16** nhóm bảo trì/điều phối (1 nhóm setup API); **12** nhóm nhánh âm UI; **8** nhóm API validation/concurrency PASS. Các nhóm phân biệt fixture/read-back và UI. Fail UI ở RESOURCE_RESERVED/READY/IN_PROGRESS cùng lệnh lặp, cancel phân công dở/đủ/READY đã kiểm tài nguyên. Xem [báo cáo chi tiết](M6_UAV_MAINTENANCE_REDISPATCH_2026_10_15.md) và `evidence/tests/uav-maintenance-dispatch-2026-10-15/summary.json`.

Đợt chức năng này **COMPLETE theo phạm vi**; toàn dự án **PARTIAL / NOT_READY**. Lịch định kỳ theo ngày, phiếu sửa chữa và chi phí vật tư đã được bổ sung trong lượt tiếp theo nêu trên; các policy media/acceptance còn mở; SSO/CSRF, staging, hosted CI và security coverage đầy đủ chưa đạt. Các phần bên dưới giữ nguyên như lịch sử, không đại diện source mới nhất.

## Latest continuation — 2026-10-15

Natural expiry was tested with a 5000 ms access-token TTL on the disposable backend. Customer/operator/admin each observe 401→refresh 200, remain on the protected page, logout 200 and redirect to login after revisiting it. No localStorage manipulation was used in this run. Automatic bearer/refresh handling is restricted to the configured API origin. Backend JSON bearer contract is unchanged; SSO/CSRF changes require user approval before implementation. See [2026-10-15 business UI report](M6_BUSINESS_UI_E2E_2026_10_15.md).

## Earlier verification record (historical)

**Status: PARTIAL.** Live bearer authentication, refresh/logout, CORS and role/ownership checks pass on the isolated backend; cross-origin cookie SSO remains backend-blocked.

Verified in source, tests and isolated runtime:

- Login, refresh and logout currently use JSON access/refresh tokens.
- The shared API client attaches a bearer token and refreshes once after 401.
- Logout clears the local session before calling the backend.
- Session initialization calls auth/me when a local token exists.
- Permission queries are keyed by user id and are refreshed every 15 seconds/focus.
- Account/session changes clear or reset private Query data.
- Legacy frontend session race tests pass (5/5).
- Browser route guards correctly redirect unauthenticated protected pages.
- Authenticated portal smoke passes on customer, Operations and Admin for login, protected route, refresh recovery, logout and post-logout redirect; evidence is `evidence/tests/authenticated-browser-direct-origin.json`.
- Synthetic login returns 200; anonymous/invalid bearer return 401; refresh returns 200; logout revokes the new access/refresh pair (401 afterwards).
- CORS allows the configured portal origin with credentials and rejects an unlisted origin (403).

Current live evidence is `evidence/tests/m6-current-isolated-runtime.json`; the allowed request used a real preflight (`Access-Control-Request-Method` and `Access-Control-Request-Headers`) and returned 200.

The pre-refresh access token remained valid after logging out the refreshed pair. The observed logout is token-specific; it does not establish global session revocation.

Not implemented in the current contract:

- HttpOnly session cookie issuance/clearing.
- Cookie authentication in the backend JWT filter.
- credentials: include session calls.
- CSRF protection for cookie-authenticated state changes.
- Cross-origin SSO across four independent origins.

The approved cross-domain design requires backend cookie/session support (or a reviewed OAuth/OIDC authorization-code + PKCE flow). The current localStorage bearer mode is origin-local and cannot be called SSO. No token was copied between origins or put in a URL. Do not cut over to cookie SSO until the backend contract is approved and browser-tested over HTTPS.
