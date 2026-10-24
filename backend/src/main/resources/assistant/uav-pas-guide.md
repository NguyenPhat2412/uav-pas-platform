# Kiến thức nền về nền tảng UAV PAS (VJU)

Bạn KHÔNG truy cập được dữ liệu trực tiếp (số nhiệm vụ, hóa đơn, vị trí UAV…). Khi được hỏi số liệu cụ thể, hãy chỉ đúng trang trong hệ thống để xem, không đoán con số.

## Ba cổng
- Cổng Khách hàng: đặt dịch vụ, theo dõi nhiệm vụ, gói cước & hóa đơn, thông báo, hồ sơ doanh nghiệp.
- Cổng Vận hành (điều phối): điều phối nhiệm vụ, nhiệm vụ được giao, tác chiến AI & SAR, trạm mặt đất, đội UAV, bảo trì, kho thiết bị, tệp kết quả, nhật ký.
- Cổng Quản trị: tổng quan, báo cáo, bản đồ đội UAV, người dùng, phân quyền (mẫu vai trò, ma trận phân quyền), danh mục dịch vụ, gói cước & hạn mức (kèm tab Hóa đơn), webhooks, cấu hình hệ thống, sức khỏe hệ thống, nhật ký quản trị, Trợ lý UAV PAS.

## Vòng đời nhiệm vụ
DRAFT (bản nháp) → PENDING_CONFIRMATION (chờ xác nhận) → CONFIRMED (đã xác nhận) → RESOURCE_RESERVED (đã giữ tài nguyên) → READY (sẵn sàng) → IN_PROGRESS (đang thực hiện) → COMPLETED (hoàn thành). Nhánh kết thúc khác: CANCELLED (hủy), REJECTED (từ chối), FAILED (thất bại).
Khách hàng chỉ sửa hoặc hủy được khi nhiệm vụ còn ở DRAFT hoặc PENDING_CONFIRMATION.

## Tạo yêu cầu bay (khách hàng)
- Chọn dịch vụ, thời gian, địa điểm. Vẽ vùng bay trên bản đồ: điểm cất cánh, đa giác, hoặc hình tròn bán kính 100–2000 m.
- Thông số bay: độ cao AGL 30/50/80/100/120 m; GSD 1,5/3/5 cm/px; chồng phủ dọc 60–90%, ngang 50–85%; 1–4 cảm biến (RGB 4K, nhiệt, LiDAR, đa phổ); ghi chú vật cản; yêu cầu hỗ trợ giấy phép bay.
- Sau khi tạo, gửi yêu cầu để chuyển sang chờ xác nhận.

## Điều phối (vận hành)
- Trang "Điều phối nhiệm vụ" liệt kê mọi nhiệm vụ; mở chi tiết để phân công UAV, trạm và người vận hành, rồi chuyển trạng thái.
- "Nhiệm vụ được giao" chỉ hiện nhiệm vụ của người vận hành đang đăng nhập.
- Bản đồ đội UAV ưu tiên vị trí GPS từ telemetry còn mới (dưới 2 phút); nếu không có thì đặt tại vị trí nhiệm vụ hoặc trạm.
- Telemetry do trạm mặt đất gửi lên (vị trí, độ cao, vận tốc, pin, RTK, số vệ tinh).

## SAR & AI
- Buồng lái SAR: chọn nhiệm vụ SAR, xem phát hiện AI (từ bo mạch KV260 hoặc cloud), xác nhận mục tiêu, sinh đường bay IAMSAR expanding square.
- "Gửi tọa độ cứu nạn" phát webhook SAR_EMERGENCY_TRIGGERED; "Yêu cầu RTH" phát webhook SAR_RTH_REQUESTED tới trạm điều khiển mặt đất — hệ thống không điều khiển UAV trực tiếp.
- Nếu chưa có webhook nào đăng ký sự kiện, hệ thống chỉ ghi nhận nội bộ và cảnh báo người dùng.

## Gói cước & thanh toán
- Khách hàng đăng ký gói ở trang "Gói cước & Hóa đơn"; gói miễn phí áp dụng ngay, gói trả phí tạo hóa đơn hạn 7 ngày.
- Thanh toán bằng chuyển khoản VietQR; nội dung chuyển khoản dạng "UAV INV <mã hóa đơn>". Số tiền đã gồm VAT (mặc định 10%).
- Quản trị viên xác nhận đã nhận tiền ở Quản trị → Gói cước & Hạn mức → tab Hóa đơn → "Xác nhận đã nhận tiền" (nhập mã tham chiếu ngân hàng). Khi xác nhận, hạn mức gói được áp dụng.

## Bảo trì
- Lịch bảo trì định kỳ theo số ngày; trạng thái đến hạn: chưa đến hạn, đến hạn, quá hạn. Có thể tạm dừng lịch hoặc lập phiếu sửa chữa từ lịch.
- Phiếu sửa chữa ghi kỹ thuật viên, ngày dự kiến, vật tư và chi phí; phiếu đã đóng không sửa được.

## Phân quyền
- Mỗi người dùng có một vai trò; quyền được gán theo vai trò ở trang Phân quyền (mẫu vai trò, ma trận phân quyền). Ví dụ quyền: MISSION_VIEW, MISSION_VIEW_ALL, MISSION_STATUS_UPDATE, UAV_MANAGE, USER_MANAGE, PERMISSION_MANAGE.

## Khác
- Webhooks: đăng ký URL nhận sự kiện (SAR, geofence, pin yếu RTH, hóa đơn, thanh toán…).
- Sức khỏe hệ thống: trạng thái cơ sở dữ liệu, lưu trữ media, hàng đợi webhook, hàng đợi sự kiện tài chính, thanh toán chuyển khoản.
