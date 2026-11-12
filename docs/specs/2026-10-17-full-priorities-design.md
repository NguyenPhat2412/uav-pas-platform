# UAV PAS — Hoàn thiện ba ưu tiên sau tích hợp main

## Phạm vi và sự chấp thuận

Chủ dự án yêu cầu “chạy full các ưu tiên xử lý bên trên” ngày 17/10/2026, áp dụng ba ưu tiên và BA v3 trong báo cáo `outputs/uav-pas-assessment-20261017/DANH_GIA_SAU_TICH_HOP_MAIN.md`. Đây là chấp thuận thực hiện các phần đã mô tả. Không hỏi lại chấp thuận tổng thể; các quyết định nghiệp vụ chưa chốt được hỏi riêng và không suy diễn từ thời gian chờ.

Baseline: `55c2fd7464f6f653b89aaca3166dc39d9adf142a`, 83 contract tests PASS, backend 635 PASS trên cùng code/CI gần nhất. Nhánh làm việc `codex/full-priorities-20261017` trong linked worktree sẵn có. Localhost phục vụ người dùng vẫn chạy từ bản build baseline ở 3100–3104/18080; kiểm thử mới dùng cổng/database riêng, không đụng 8080.

## Thiết kế

1. **Nghiệp vụ và số liệu:** dùng giao dịch/khóa nhất quán cho inventory và quota, kiểm yêu cầu lặp và đồng thời; số liệu/report CSV nêu đúng dữ liệu thực có, không gọi kế hoạch là giờ thực hoặc detection là cứu hộ. Giữ API auth. Đối soát owner/permission/audit trên UI và PostgreSQL. Không tự thay công thức tính phí hay chính sách lỗi hóa đơn trước câu trả lời.
2. **Media và website:** Việt hóa các nội dung public dựa trên khả năng hiện có, không tự thêm giá/đầu mối liên hệ hay kết nối gửi ra ngoài. Bổ sung policy upload và cleanup có retry sau khi chủ dự án chọn chính sách; object đã confirm/terminal phải được giữ. UI lỗi/limit/loading phải phản ánh backend và có keyboard/mobile verification.
3. **Tích hợp và phát hành:** loại trạng thái thành công mô phỏng gây hiểu nhầm; kiểm webhook bằng receiver kiểm soát, không gửi ra địa chỉ bên ngoài. Browser E2E có fixture và evidence sạch secrets được đưa vào CI. Audit dependencies/scan security theo phạm vi thật, sửa lỗi tái hiện được trong contract hiện hữu. Chuẩn bị và kiểm local restore/rollback/load; staging thật cần hostname/môi trường được cung cấp, không gọi mô phỏng local là staging đã nghiệm thu.
4. **BA v3:** cập nhật quyết định, chức năng đã có và FR→screen/API/test/evidence; giữ phần chưa kiểm/chờ quyết định rõ ràng. Xuất DOCX/PDF đen trắng có in đậm theo yêu cầu tài liệu trước đó.

## Các quyết định đang chờ

- Giờ dự kiến hay thực tế, chính sách giá/auto invoice.
- Khi auto invoice lỗi: rollback nhiệm vụ hay pending/retry độc lập.
- Allowed types/size, cleanup unconfirmed sau 24h hay không tự xóa.
- Endpoint/hostname/môi trường HTTPS staging và nội dung/đầu mối liên hệ thật. Khi chưa có, hoàn thiện cấu hình/test tái lập và ghi BLOCKED phần phụ thuộc, không bịa triển khai.

## Tiêu chí hoàn thành

Mỗi lỗi có chứng cứ trước/sau và test phù hợp; full Maven/PostgreSQL/MinIO, FE root/legacy lint/typecheck/test/build đạt; luồng UI xác thực được kiểm desktop/mobile và trình duyệt bổ sung khi có runtime; contract auth không đổi; migration chỉ thêm version mới, không sửa lịch sử đã xuất bản. Báo cáo PASS/FAIL/BLOCKED có phạm vi chính xác, không nâng thành production-ready khi còn gate chưa đạt. Không công bố token/password/signed URL trong evidence.

## Tự rà thiết kế

Các nhiệm vụ có ranh giới file riêng. Quyết định pending chỉ chặn phần phụ thuộc, không chặn dịch nội dung, kiểm concurrency hiện hữu, hạ tầng test hoặc đọc bảo mật. Cleanup media phải không xóa dữ liệu đã xác nhận. Browser localhost người dùng được giữ trong lúc chuẩn bị; bản mới chỉ thay sau khi kiểm đạt. Không tự deploy production hoặc thay auth contract.
