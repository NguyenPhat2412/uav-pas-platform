# Cô lập và bảo toàn dữ liệu — 17/10/2026

Preview cuối kiểm tra customerA thấy kết quả của mình; customerB và operator không được giao bị chặn mission/timeline/media/download. Tệp terminal chỉ đọc/tải, signedPUT cũ không ghi đèobject. Backup/adoption main kiểm22bảng117dòng cũ,25tệpMinIO; đây là bảo toàn dữ liệu local, không phải bằng chứng multi-tenant production.

Xem [báo cáo hiện tại và bảng PASS/FAIL/BLOCKED](M6_FULL_PRIORITIES_2026_10_17.md) và [index evidence](evidence/tests/full-priorities-20261017/README.md). Các giới hạn có trong báo cáo hiện tại được giữ nguyên; không suy từ kết quả local thành production-ready.

<details>
<summary>Hồ sơ lịch sử trước 17/10/2026 — không phải trạng thái hiện tại</summary>

Những tiêu đề “mới nhất”, số test, cấu trúc thư mục và trạng thái auth trong phần lưu trữ dưới đây chỉ đúng tại ngày/bản nguồn được ghi. Báo cáo hiện tại phía trên có ưu tiên khi đọc trạng thái hôm nay.

# M6 data isolation report

> **Cập nhật tích hợp main — 16/10/2026:** xem [M6_MAIN_INTEGRATION_2026_10_16.md](M6_MAIN_INTEGRATION_2026_10_16.md) cho source và kiểm chứng mới nhất. Phần dưới giữ lịch sử của nhánh/lượt kiểm tương ứng; migration hồ sơ hiện là V10, bảo trì là V9, auth browser giữ cookie của main. Toàn hệ thống vẫn PARTIAL / NOT_READY.

## Điều phối operator, trạm và thiết bị — 2026-10-16 (mới nhất)

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

## Latest continuation — 2026-10-15

Customer B is denied direct access to customer A’s mission (observed 403 and UI denial), sees no A missions in its list, and has no download control. Customer A downloads actual owned media. Operator cannot see the admin user table. This adds local browser evidence; complete cross-user media endpoint and deployed-origin coverage remain separate gates. See [2026-10-15 business UI report](M6_BUSINESS_UI_E2E_2026_10_15.md).

## Earlier verification record (historical)

**Status: PASS for isolated synthetic API ownership checks; browser/staging cross-portal scope remains NOT_VERIFIED.**

The shared query layer scopes the permission key by user id, clears/cancels queries when the subject changes, resets private queries when the permission signature changes, and reloads on storage-driven account changes. The legacy API client test suite passes refresh race, logout-during-refresh, late previous-account response, failed refresh and forbidden retry scenarios.

Live isolated checks now prove customer A can read the synthetic mission while customer B receives 403 for mission, timeline, media and signed download URL. Operator and admin receive the expected mission/media/timeline access. The complete synthetic mission flow and audit count are recorded in `evidence/tests/m6-current-isolated-runtime.json`.

What is still missing:

- Authenticated browser proof across the four deployed origins.
- Staging-like concurrency and production storage/CORS evidence.
- Cookie SSO/CSRF behavior after the approved contract is implemented.

No private data was fabricated or exposed in M6 evidence.


</details>
