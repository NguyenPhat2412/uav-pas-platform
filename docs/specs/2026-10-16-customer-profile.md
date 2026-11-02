# Hồ sơ khách hàng tự chỉnh sửa

Đã chốt với Nguyễn Xuân Phát: chỉ họ tên và số điện thoại. Giữ nguyên auth contract, email, username, mật khẩu, vai trò, quyền, trạng thái và ảnh đại diện. Baseline: `ba562ffb3a965c48c3207b30e756c7e7aad297ad`, branch `codex/m1-monorepo-foundation`; không commit/push/deploy trong lượt này.

## Thiết kế
- GET/PATCH `/api/v1/users/profile`: lấy chủ thể từ phiên đăng nhập, không nhận ID đích. DTO riêng; không sửa DTO auth. Từ chối khóa ngoài danh sách.
- Họ tên tối đa 100 ký tự, cho phép bỏ trống như mô hình hiện tại. Điện thoại bắt buộc, tối đa 20 ký tự; trim hai đầu; giữ quy tắc không trùng có sẵn trong đăng ký. Chưa quy định định dạng riêng cho quốc gia hoặc xác minh OTP.
- Revision SHA-256 từ ID và giá trị hai trường, chỉ dùng kiểm tra xung đột; không phải chứng thực. Khóa hàng và đọc lại trước so sánh. 409 khi bản cũ; không tự ghi đè. Không sửa auth/token/session.
- Cập nhật chỉ hai cột hồ sơ; DynamicUpdate tránh ghi đè thay đổi độc lập của quản trị. Audit ghi tên trường thay đổi, không ghi giá trị cá nhân. Audit và hồ sơ cùng transaction.
- Ràng buộc duy nhất cho điện thoại khác rỗng tại PostgreSQL bảo vệ cập nhật/đăng ký đồng thời. Migration không tự sửa dữ liệu trùng cũ; phải rà soát trước khi áp dụng môi trường có dữ liệu.
- UI dùng query theo tài khoản cho hồ sơ và tên trên thanh đầu trang; không phát sự kiện đăng nhập giả. Form giữ bản đang sửa qua lỗi/refetch; tải bản mới nhất là hành động rõ ràng. Có sửa/lưu/hủy, validation gần trường, trạng thái tải/lỗi/thành công, mobile.

## Chấp nhận
Lưu và đọc lại được; hủy không ghi; validation và duplicate không ghi; anonymous/khóa tài khoản bị chặn; không thay trường nhạy cảm/khác chủ; hai tab không ghi đè; giữ dữ liệu khi mất mạng; header cập nhật; không hồi sinh phiên khi đăng xuất/đổi tài khoản; audit không chứa tên/số điện thoại; kiểm thử thực tế desktop/mobile; chạy regression FE/BE; dọn môi trường disposable.
