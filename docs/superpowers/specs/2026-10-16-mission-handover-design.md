# Tiếp nhận và bàn giao nhiệm vụ

Baseline: `15936b9`, nhánh `codex/m1-monorepo-foundation`, sạch khi bắt đầu.

## Quyết định được chủ dự án duyệt trong chat

1. Operator phải tiếp nhận trước READY; đổi nguồn lực phải tiếp nhận lại.
2. COMPLETE bắt buộc ghi chú kết quả và tình trạng thiết bị. AREA_INSPECTION, AERIAL_RECORDING, DATA_COLLECTION cần ít nhất một tệp kết quả/báo cáo đã xác nhận và gắn vào nhiệm vụ. UAV_RENTAL và OTHER không bắt buộc tệp.
3. COMPLETED, FAILED, CANCELLED, REJECTED chỉ xem/tải tệp; khóa thêm/sửa/xóa, kể cả admin.

Đã cân nhắc tiếp nhận chỉ trước START, tệp bắt buộc cho mọi loại, và admin bổ sung sau kết thúc; chủ dự án chọn ba quy tắc trên. Không thêm bước khách hàng ký nghiệm thu hoặc trạng thái mới trong lượt này.

## Thiết kế

- Backend giữ khóa nhiệm vụ khi kiểm điều kiện và chuyển trạng thái. READY và START đều kiểm tiếp nhận. Báo vướng mắc hủy tiếp nhận và hạ READY về RESOURCE_RESERVED để phải kiểm tra lại. Không cho nhận thay operator.
- Tiếp nhận gửi phiên bản mission đang hiển thị; tab cũ bị 409, tải lại để xem nguồn lực rồi xác nhận lại. Đây là API nghiệp vụ, không đổi auth contract.
- COMPLETE kiểm ghi chú (không trắng, tối đa 500 ký tự mỗi trường), và tệp có vai trò OUTPUT hoặc DOCUMENT đã confirmed, không deleted. INPUT/OTHER/FLIGHT_DATA chưa được phân loại là kết quả bàn giao không đáp ứng điều kiện này. UI cho chọn vai trò tệp; ảnh/video mặc định OUTPUT.
- Không giải phóng kho/UAV hoặc ghi event/audit khi hoàn tất bị chặn. Chuyển trạng thái, hoàn trả và lịch sử nằm cùng giao dịch.
- Kiểm trạng thái kết thúc ở cả đường media riêng của mission và media chung. Mọi thao tác ghi khóa mission trước; quyền đọc giữ nguyên. Upload đã cấp trước kết thúc không được thay tệp đã tồn tại: ký PUT có điều kiện If-None-Match: *, cập nhật các client PUT hiện có và kiểm trên MinIO thật. Tệp mồ côi từ URL cấp trước kết thúc không thể confirm/attach sau kết thúc; không tự định nghĩa retention hoặc xóa dữ liệu nền.
- Operations hiển thị checklist tiếp nhận/kết quả, lỗi tiếng Việt, giữ ghi chú khi lỗi, tải xuống tệp tại nhiệm vụ. Customer hiển thị ghi chú bàn giao/tình trạng thiết bị cùng tệp và timeline. Legacy client tương thích API nghiệp vụ mới.

## Kiểm chứng

- Test trước/sau cho thiếu tiếp nhận, tiếp nhận tab cũ/nhận lặp, báo vướng mắc sau READY, điều phối lại rồi nhận lại; sai người và thiếu quyền.
- COMPLETE cho cả 5 loại, thiếu/trắng/quá dài ghi chú, chỉ tệp INPUT, chưa confirm, xóa, sai nhiệm vụ; kiểm rollback kho/UAV/audit. Chạy H2 và PostgreSQL.
- Khóa mọi API ghi media khi kết thúc, đồng thời complete/upload; PUT cùng URL lần hai không thay object. Tải tệp đã bàn giao vẫn đúng nội dung.
- Browser thật: Customer tạo/gửi → điều phối xác nhận/phân công → operator tiếp nhận → READY/START → upload → COMPLETE → Customer xem/tải → admin audit; tab cũ, nhánh thiếu kết quả, báo vướng mắc, mobile.
- Maven đầy đủ + PostgreSQL/MinIO; root và legacy lint/typecheck/test/build. Evidence loại secrets, nguồn đối chiếu cùng revision/diff.

## Ràng buộc

Không đổi login/token/refresh/logout/CORS/SSO/CSRF, không nâng dependency, không commit/push/deploy. Disposable PostgreSQL/MinIO và backend 18080, không đụng 8080. Chỉ dừng process/container do lượt này tạo. Không coi browser local là staging hoặc production-ready.
