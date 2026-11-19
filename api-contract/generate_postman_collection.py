import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
OPENAPI_PATH = HERE / 'openapi.json'
POSTMAN_PATH = HERE / 'postman_collection.json'

with open(OPENAPI_PATH, 'r', encoding='utf-8') as f:
    openapi = json.load(f)

schemas = openapi.get('components', {}).get('schemas', {})

CURRENT_ADMIN_TOKEN = ""
CURRENT_REFRESH_TOKEN = ""

ENDPOINT_METADATA = {
    # 01. Auth
    ("POST", "/api/v1/auth/login"): ("Đăng nhập hệ thống (Login)", "Đăng nhập với username/email và mật khẩu để lấy Access Token (JWT) và Refresh Token."),
    ("POST", "/api/v1/auth/login-json"): ("Đăng nhập hệ thống qua JSON API", "Đăng nhập trả về token định dạng JSON."),
    ("GET", "/api/v1/auth/me"): ("Thông tin tài khoản đang đăng nhập (Get Me)", "Lấy thông tin chi tiết và quyền hạn của người dùng đang đăng nhập."),
    ("POST", "/api/v1/auth/refresh"): ("Làm mới Access Token (Refresh Token)", "Sử dụng Refresh Token để cấp phát Access Token mới."),
    ("POST", "/api/v1/auth/logout"): ("Đăng xuất hệ thống (Logout)", "Thu hồi và đưa Access Token / Refresh Token vào danh sách vô hiệu hoá."),
    ("POST", "/api/v1/auth/register"): ("Đăng ký tài khoản mới (Register)", "Đăng ký tài khoản người dùng mới vào hệ thống."),

    # 02. Users
    ("GET", "/api/v1/users"): ("Danh sách người dùng (Get All Users)", "Lấy danh sách người dùng phân trang, tìm kiếm theo tên hoặc lọc theo vai trò/trạng thái."),
    ("GET", "/api/v1/users/:id"): ("Chi tiết người dùng (Get User By ID)", "Lấy thông tin chi tiết của một tài khoản theo User ID."),
    ("POST", "/api/v1/users/:id/lock"): ("Khoá tài khoản người dùng (Lock User)", "Khoá tài khoản người dùng chỉ định (yêu cầu quyền USER_MANAGE)."),
    ("POST", "/api/v1/users/:id/unlock"): ("Mở khoá tài khoản (Unlock User)", "Mở khoá tài khoản người dùng đã bị khoá."),
    ("PUT", "/api/v1/users/:id/role"): ("Cập nhật vai trò người dùng (Update Role)", "Thay đổi vai trò (ROLE_ADMIN, ROLE_PILOT, ROLE_OPERATOR, ROLE_COMMANDER)."),

    # 03. Profile
    ("GET", "/api/v1/users/profile"): ("Xem thông tin cá nhân (Get Profile)", "Lấy thông tin hồ sơ của chính người dùng hiện tại."),
    ("PATCH", "/api/v1/users/profile"): ("Cập nhật thông tin cá nhân (Update Profile)", "Cập nhật họ tên, số điện thoại, ảnh đại diện của người dùng hiện tại."),

    # 04. Missions
    ("GET", "/api/v1/missions"): ("Danh sách nhiệm vụ bay (Get All Missions)", "Lấy danh sách nhiệm vụ bay phân trang, lọc theo trạng thái, loại nhiệm vụ, ngày bay."),
    ("POST", "/api/v1/missions"): ("Tạo mới nhiệm vụ bay (Create Mission)", "Tạo yêu cầu nhiệm vụ bay mới (khảo sát diện rộng, ghi hình, thu thập dữ liệu)."),
    ("GET", "/api/v1/missions/:id"): ("Chi tiết nhiệm vụ bay (Get Mission By ID)", "Lấy toàn bộ thông tin chi tiết, trạng thái, thiết bị gán của nhiệm vụ."),
    ("PATCH", "/api/v1/missions/:id"): ("Cập nhật nhiệm vụ bay (Update Mission)", "Chỉnh sửa thông tin nhiệm vụ khi còn ở trạng thái DRAFT / PENDING."),
    ("GET", "/api/v1/missions/availability"): ("Kiểm tra khả dụng tài nguyên (Check Availability)", "Kiểm tra xem UAV, trạm sạc, phi công có khả dụng trong khung thời gian dự kiến."),
    ("GET", "/api/v1/missions/:id/dispatch-resources"): ("Tài nguyên điều phối của nhiệm vụ", "Lấy danh sách UAV, trạm docking, phi công được gán cho nhiệm vụ."),
    ("POST", "/api/v1/missions/:id/submit"): ("Gửi duyệt nhiệm vụ (Submit Mission)", "Chuyển trạng thái nhiệm vụ từ DRAFT sang SUBMITTED chờ quản trị viên phê duyệt."),
    ("POST", "/api/v1/missions/:id/approve"): ("Phê duyệt nhiệm vụ (Approve Mission)", "Phê duyệt nhiệm vụ bay (chỉ dành cho Quản trị viên/Chỉ huy bay)."),
    ("POST", "/api/v1/missions/:id/reject"): ("Từ chối nhiệm vụ (Reject Mission)", "Từ chối yêu cầu nhiệm vụ bay kèm lý do."),
    ("POST", "/api/v1/missions/:id/ready"): ("Xác nhận sẵn sàng bay (Mark Ready)", "Đánh dấu thiết bị và nhân sự đã sẵn sàng xuất kích."),
    ("POST", "/api/v1/missions/:id/start"): ("Bắt đầu thực hiện bay (Start Mission)", "Bắt đầu hành trình bay thực tế của nhiệm vụ."),
    ("POST", "/api/v1/missions/:id/complete"): ("Hoàn thành nhiệm vụ (Complete Mission)", "Ghi nhận nhiệm vụ bay đã hoàn thành thành công."),
    ("POST", "/api/v1/missions/:id/cancel"): ("Huỷ bỏ nhiệm vụ (Cancel Mission)", "Huỷ bỏ nhiệm vụ bay."),
    ("POST", "/api/v1/missions/:id/fail"): ("Báo cáo nhiệm vụ thất bại (Report Failure)", "Ghi nhận lỗi hoặc sự cố dẫn đến thất bại của nhiệm vụ bay."),
    ("POST", "/api/v1/missions/:id/confirm"): ("Khách hàng xác nhận nghiệm thu (Confirm Mission)", "Khách hàng xác nhận kết quả bay đã đạt yêu cầu."),
    ("POST", "/api/v1/missions/:id/accept"): ("Chấp nhận nhiệm vụ (Accept Mission)", "Chấp nhận nhận nhiệm vụ được giao."),
    ("POST", "/api/v1/missions/:id/report-conflict"): ("Báo cáo xung đột tài nguyên (Report Conflict)", "Báo cáo lịch trình hoặc tài nguyên UAV bị trùng lặp."),
    ("POST", "/api/v1/missions/:id/assign-uav"): ("Gán UAV cho nhiệm vụ (Assign UAV)", "Chỉ định máy bay không người lái cụ thể cho nhiệm vụ."),
    ("POST", "/api/v1/missions/:id/unassign-uav"): ("Gỡ gán UAV (Unassign UAV)", "Hủy gán máy bay khỏi nhiệm vụ."),
    ("POST", "/api/v1/missions/:id/replace-uav"): ("Thay thế UAV dự phòng (Replace UAV)", "Đổi sang UAV dự phòng khi máy bay hiện tại gặp sự cố."),
    ("POST", "/api/v1/missions/:id/assign-operator"): ("Gán phi công/nhân sự (Assign Operator)", "Chỉ định phi công điều khiển chuyến bay."),
    ("POST", "/api/v1/missions/:id/assign-station"): ("Gán trạm docking (Assign Station)", "Chỉ định trạm cất hạ cánh cho nhiệm vụ."),
    ("POST", "/api/v1/missions/:id/redispatch-operator"): ("Điều phối lại nhân sự (Redispatch Operator)", "Đổi phi công phụ trách."),
    ("POST", "/api/v1/missions/:id/redispatch-station"): ("Điều phối lại trạm bay (Redispatch Station)", "Đổi trạm cất hạ cánh."),
    ("POST", "/api/v1/missions/:id/redispatch-equipment"): ("Điều phối lại thiết bị (Redispatch Equipment)", "Thay đổi danh sách phụ kiện, linh kiện gán cho nhiệm vụ."),
    ("POST", "/api/v1/missions/:id/reserve-equipment"): ("Đặt giữ trước thiết bị (Reserve Equipment)", "Khóa giữ phụ tùng/thiết bị trong kho cho nhiệm vụ."),
    ("GET", "/api/v1/missions/:id/timeline"): ("Dòng thời gian sự kiện nhiệm vụ (Get Timeline)", "Xem lịch sử thay đổi trạng thái và hành động theo thời gian."),
    ("GET", "/api/v1/missions/:id/media"): ("Danh sách media của nhiệm vụ (Get Mission Media)", "Lấy tất cả ảnh chụp, video, dữ liệu telemetry của nhiệm vụ."),
    ("POST", "/api/v1/missions/:id/media"): ("Đính kèm media vào nhiệm vụ (Attach Media)", "Liên kết tệp media đã tải lên với nhiệm vụ bay."),
    ("POST", "/api/v1/missions/:id/media/upload-url"): ("Lấy Presigned URL tải media cho nhiệm vụ", "Xin link upload trực tiếp lên cloud storage (S3/MinIO)."),
    ("POST", "/api/v1/missions/:id/media/:mediaId/confirm"): ("Xác nhận tải xong media của nhiệm vụ", "Xác nhận tệp media nhiệm vụ đã upload thành công."),
    ("GET", "/api/v1/missions/:id/telemetry/replay"): ("Phát lại hành trình 3D & Mặt cắt địa hình (3D Telemetry Replay)", "Lấy toàn bộ chuỗi mẫu góc nghiêng 3D (pitch/roll/yaw/gimbal), quãng đường tích luỹ và độ cao địa hình ASL/AGL."),
    ("GET", "/api/v1/missions/:id/inspection-report"): ("Chứng nhận nghiệm thu & Tệp bàn giao Geotag (Inspection Report)", "Tổng hợp chứng chỉ nghiệm thu tự động, điểm chất lượng định vị GNSS và danh sách tệp bàn giao gắn toạ độ GPS."),

    # 05. Services
    ("GET", "/api/v1/uav-services"): ("Danh mục dịch vụ bay (Get Service Offerings)", "Lấy danh sách các gói dịch vụ UAV cung cấp cho khách hàng."),
    ("POST", "/api/v1/uav-services"): ("Thêm gói dịch vụ bay mới (Create Service Offering)", "Tạo mới loại dịch vụ bay (khảo sát, quay phim, giao hàng...)."),

    # 06. UAV
    ("GET", "/api/v1/uavs"): ("Danh sách máy bay UAV (Get All UAVs)", "Lấy danh sách phi đội máy bay không người lái trong hệ thống."),
    ("GET", "/api/v1/uavs/health-analytics"): ("Phân tích dự báo bảo trì, SOH Pin & Khung thân 3D (Fleet Health Analytics)", "Thống kê sức khoẻ đội bay, tuổi thọ chu kỳ pin (SOH), hiệu suất động cơ và phân lớp khung thân 3D."),
    ("POST", "/api/v1/uavs"): ("Đăng ký máy bay UAV mới (Create UAV)", "Khai báo thêm một máy bay UAV vào phi đội."),
    ("GET", "/api/v1/uavs/:id"): ("Chi tiết máy bay UAV (Get UAV By ID)", "Xem thông số kỹ thuật, hãng sản xuất, số serial, pin, trạng thái."),
    ("PUT", "/api/v1/uavs/:id"): ("Cập nhật thông tin UAV (Update UAV)", "Chỉnh sửa model, serial, nhà sản xuất máy bay."),
    ("GET", "/api/v1/uavs/:id/history"): ("Lịch sử hoạt động của UAV (Get UAV History)", "Xem nhật ký bay và thay đổi trạng thái của máy bay."),
    ("POST", "/api/v1/uavs/:id/maintenance"): ("Chuyển UAV vào bảo dưỡng (Send to Maintenance)", "Đổi trạng thái máy bay sang đang bảo dưỡng sửa chữa."),
    ("PUT", "/api/v1/uavs/:id/station/:stationId"): ("Chuyển UAV về trạm docking (Assign Station)", "Gán máy bay vào trạm cất hạ cánh cố định."),
    ("PUT", "/api/v1/uavs/:id/status"): ("Đổi trạng thái hoạt động của UAV (Update Status)", "Cập nhật trạng thái: AVAILABLE, IN_FLIGHT, CHARGING, MAINTENANCE..."),

    # 07. Stations
    ("GET", "/api/v1/stations"): ("Danh sách trạm docking (Get All Stations)", "Lấy danh sách các trạm cất hạ cánh và sạc pin tự động."),
    ("POST", "/api/v1/stations"): ("Thêm trạm docking mới (Create Station)", "Khai báo vị trí toạ độ, mã trạm, tên trạm docking mới."),
    ("GET", "/api/v1/stations/:id"): ("Chi tiết trạm docking (Get Station By ID)", "Xem toạ độ kinh vĩ độ, địa chỉ, trạng thái hoạt động trạm."),
    ("PUT", "/api/v1/stations/:id"): ("Cập nhật trạm docking (Update Station)", "Sửa thông tin tên, địa chỉ, toạ độ trạm."),
    ("DELETE", "/api/v1/stations/:id"): ("Xoá trạm docking (Delete Station)", "Xoá trạm khỏi hệ thống."),

    # 08. Inventory
    ("GET", "/api/v1/inventory/equipment"): ("Danh mục thiết bị trong kho (Get Equipment)", "Lấy danh sách linh kiện, pin, camera, phụ tùng thay thế."),
    ("POST", "/api/v1/inventory/equipment"): ("Thêm thiết bị mới vào kho (Create Equipment)", "Nhập linh kiện mới vào quản lý kho."),
    ("GET", "/api/v1/inventory/equipment/:id"): ("Chi tiết thiết bị kho (Get Equipment By ID)", "Xem thông tin số lượng, trạng thái linh kiện."),
    ("PUT", "/api/v1/inventory/equipment/:id"): ("Cập nhật thiết bị kho (Update Equipment)", "Chỉnh sửa thông tin thiết bị/phụ tùng."),
    ("GET", "/api/v1/inventory/equipment/history"): ("Lịch sử xuất nhập kho (Get Movement History)", "Xem lịch sử dịch chuyển thiết bị giữa các trạm."),
    ("POST", "/api/v1/inventory/equipment/:id/stock-in"): ("Nhập thêm số lượng vào kho (Stock In)", "Ghi nhận nhập thêm hàng/thiết bị vào kho."),
    ("POST", "/api/v1/inventory/equipment/:id/stock-out"): ("Xuất kho thiết bị (Stock Out)", "Xuất linh kiện ra khỏi kho để sử dụng."),
    ("POST", "/api/v1/inventory/equipment/:id/reserve"): ("Đặt trước thiết bị kho (Reserve Equipment)", "Khoá giữ thiết bị trước cho nhiệm vụ."),
    ("POST", "/api/v1/inventory/equipment/:id/release"): ("Giải phóng đặt trước thiết bị (Release Reservation)", "Huỷ đặt trước và hoàn lại số lượng khả dụng."),
    ("POST", "/api/v1/inventory/equipment/:id/transfer/:stationId"): ("Chuyển thiết bị sang trạm khác (Transfer Station)", "Điều chuyển thiết bị/linh kiện sang trạm chỉ định."),

    # 09. Maintenance
    ("GET", "/api/v1/maintenance/schedules"): ("Danh sách lịch bảo dưỡng (Get Schedules)", "Lấy danh sách lịch bảo trì định kỳ của UAV."),
    ("POST", "/api/v1/maintenance/schedules"): ("Tạo lịch bảo dưỡng mới (Create Schedule)", "Đặt lịch bảo trì định kỳ theo số giờ bay hoặc ngày."),
    ("PUT", "/api/v1/maintenance/schedules/:id"): ("Cập nhật lịch bảo dưỡng (Update Schedule)", "Chỉnh sửa chu kỳ hoặc nội dung bảo trì."),
    ("GET", "/api/v1/maintenance/orders"): ("Danh sách lệnh sửa chữa (Get Repair Orders)", "Lấy danh sách lệnh bảo trì, khắc phục sự cố."),
    ("POST", "/api/v1/maintenance/orders"): ("Tạo lệnh sửa chữa mới (Create Repair Order)", "Tạo phiếu yêu cầu sửa chữa máy bay."),
    ("GET", "/api/v1/maintenance/orders/:id"): ("Chi tiết lệnh sửa chữa (Get Order By ID)", "Xem nội dung hỏng hóc, kỹ thuật viên phụ trách, chi phí."),
    ("PUT", "/api/v1/maintenance/orders/:id"): ("Cập nhật lệnh sửa chữa (Update Order)", "Chỉnh sửa thông tin lệnh sửa chữa."),
    ("POST", "/api/v1/maintenance/orders/:id/start"): ("Bắt đầu tiến hành sửa chữa (Start Order)", "Chuyển lệnh bảo trì sang trạng thái đang thực hiện."),
    ("POST", "/api/v1/maintenance/orders/:id/complete"): ("Nghiệm thu hoàn tất sửa chữa (Complete Order)", "Đánh dấu thiết bị đã sửa xong và sẵn sàng bay trở lại."),
    ("POST", "/api/v1/maintenance/orders/:id/cancel"): ("Huỷ lệnh sửa chữa (Cancel Order)", "Huỷ bỏ lệnh bảo trì."),
    ("PUT", "/api/v1/maintenance/orders/:id/materials"): ("Cập nhật vật tư sử dụng (Update Materials)", "Khai báo danh sách vật tư/linh kiện đã thay thế trong đợt sửa."),

    # 10. Billing
    ("GET", "/api/v1/billing/plans"): ("Danh mục gói cước bay (Get Service Plans)", "Lấy danh sách các gói đăng ký dịch vụ UAV."),
    ("GET", "/api/v1/billing/quota"): ("Quota bay của tài khoản hiện tại (Get My Quota)", "Xem số giờ bay hoặc số nhiệm vụ còn lại trong hạn mức."),
    ("GET", "/api/v1/billing/invoices"): ("Danh sách hoá đơn (Get Invoices)", "Lấy danh sách hoá đơn thanh toán."),
    ("POST", "/api/v1/billing/invoices"): ("Tạo hoá đơn mới (Create Invoice)", "Tạo hoá đơn thanh toán cho nhiệm vụ hoặc gói cước."),
    ("GET", "/api/v1/billing/invoices/:id"): ("Chi tiết hoá đơn (Get Invoice By ID)", "Xem chi tiết số tiền, trạng thái thanh toán hoá đơn."),
    ("POST", "/api/v1/billing/invoices/:id/pay"): ("Thanh toán hoá đơn (Pay Invoice)", "Xử lý thanh toán cho hoá đơn chỉ định."),
    ("GET", "/api/v1/billing/admin/quotas"): ("Danh sách hạn mức người dùng (Admin Get Quotas)", "Quản trị viên xem hạn mức quota bay của tất cả người dùng."),
    ("PUT", "/api/v1/billing/admin/quotas/:userId"): ("Cập nhật hạn mức người dùng (Admin Update Quota)", "Cộng thêm hoặc thiết lập lại số giờ bay cho user."),

    # 11. Payment IPN
    ("POST", "/api/v1/billing/webhook/payment-ipn"): ("Webhook nhận thanh toán IPN (Payment IPN Callback)", "Endpoint cho cổng thanh toán bên thứ 3 (VNPay, Momo) callback xác nhận thanh toán."),

    # 12. SAR
    ("POST", "/api/v1/sar/missions"): ("Khởi tạo nhiệm vụ tìm kiếm cứu nạn (Create SAR Mission)", "Tạo chiến dịch cứu hộ khẩn cấp SAR."),
    ("GET", "/api/v1/sar/missions/:missionId"): ("Chi tiết nhiệm vụ cứu nạn (Get SAR Mission)", "Xem toạ độ tìm kiếm, danh sách nạn nhân, máy bay tham gia."),
    ("POST", "/api/v1/sar/flight-plan"): ("Lập kế hoạch đường bay tìm kiếm (SAR Flight Plan)", "Tạo toạ độ bay quét tìm kiếm cứu nạn trên bản đồ."),
    ("POST", "/api/v1/sar/missions/:missionId/dispatch-rescue"): ("Điều động lực lượng cứu nạn thực địa (Dispatch Rescue)", "Phát lệnh điều phối đội cứu nạn mặt đất đến toạ độ phát hiện."),
    ("PATCH", "/api/v1/sar/missions/:missionId/status"): ("Cập nhật trạng thái nhiệm vụ cứu hộ (Update SAR Status)", "Đổi trạng thái: SEARCHING, TARGET_LOCATED, RESCUED..."),
    ("POST", "/api/v1/sar/telemetry-evaluate"): ("Đánh giá dữ liệu cảm biến khẩn cấp (Evaluate Telemetry)", "Phân tích số liệu đo từ xa để phát hiện tín hiệu cứu nạn."),

    # 13. AI
    ("POST", "/api/v1/ai/dispatch"): ("Gửi tác vụ phân tích hình ảnh AI (Dispatch AI Task)", "Giao ảnh/video cho mô hình AI nhận diện vật thể, người, sự cố đê điều."),
    ("GET", "/api/v1/ai/missions/:missionId/tasks"): ("Danh sách tác vụ AI của nhiệm vụ (Get AI Tasks)", "Xem các task AI đã và đang chạy."),
    ("GET", "/api/v1/ai/missions/:missionId/detections"): ("Kết quả phát hiện vật thể AI (Get Detections)", "Danh sách vật thể, toạ độ bounding box do AI phát hiện."),
    ("PATCH", "/api/v1/ai/detections/:id/verify"): ("Xác nhận kết quả AI bởi con người (Verify Detection)", "Chuyên gia xác nhận kết quả phát hiện là Đúng (True) hoặc Sai (False)."),

    # 14. Media
    ("GET", "/api/v1/media"): ("Danh sách tệp media (Get All Media)", "Lấy danh sách tất cả file ảnh, video, dữ liệu đã upload lên hệ thống."),
    ("POST", "/api/v1/media"): ("Khai báo tệp media mới (Register Media)", "Đăng ký metadata cho tệp tải lên."),
    ("GET", "/api/v1/media/:id/upload-url"): ("Lấy Presigned URL để Upload (Get Upload URL)", "Lấy link upload trực tiếp an toàn lên MinIO/S3 bucket."),
    ("POST", "/api/v1/media/:id/confirm"): ("Xác nhận tải file lên thành công (Confirm Upload)", "Xác nhận với hệ thống rằng tệp đã nằm trên storage bucket."),
    ("GET", "/api/v1/media/:id/download-url"): ("Lấy link tải file trực tiếp (Get Download URL)", "Lấy URL tạm thời có chữ ký để tải hoặc xem ảnh/video."),
    ("DELETE", "/api/v1/media/:id"): ("Xoá tệp media (Delete Media)", "Xoá tệp media khỏi hệ thống và cloud storage."),

    # 15. Notifications
    ("GET", "/api/v1/notifications"): ("Danh sách thông báo của tôi (Get My Notifications)", "Lấy danh sách thông báo phân trang."),
    ("GET", "/api/v1/notifications/unread-count"): ("Số lượng thông báo chưa đọc (Unread Count)", "Đếm nhanh số thông báo chưa đọc để hiển thị badge chuông."),
    ("PATCH", "/api/v1/notifications/:id/read"): ("Đánh dấu đã đọc một thông báo (Mark Read)", "Đổi trạng thái thông báo thành đã đọc."),
    ("POST", "/api/v1/notifications/read-all"): ("Đánh dấu đã đọc tất cả thông báo (Mark All Read)", "Đánh dấu toàn bộ thông báo của người dùng là đã đọc."),
    ("POST", "/api/v1/notifications"): ("Tạo thông báo hệ thống mới (Send Notification)", "Gửi thông báo đẩy đến người dùng cụ thể."),

    # 16. Permissions
    ("GET", "/api/v1/permissions"): ("Danh sách quyền trong hệ thống (Get All Permissions)", "Lấy toàn bộ danh mục quyền hệ thống (31 permissions)."),
    ("GET", "/api/v1/permissions/me"): ("Quyền hạn của tài khoản đang đăng nhập (Get My Permissions)", "Lấy danh sách các mã quyền mà người dùng hiện tại sở hữu."),
    ("GET", "/api/v1/permissions/users/:userId"): ("Quyền hạn của người dùng cụ thể (Get User Permissions)", "Xem quyền chi tiết của một tài khoản theo User ID."),
    ("PUT", "/api/v1/permissions/users/:userId/:code"): ("Gán quyền cho người dùng (Grant Permission)", "Cấp thêm quyền cụ thể cho một tài khoản."),
    ("DELETE", "/api/v1/permissions/users/:userId/:code"): ("Thu hồi quyền người dùng (Revoke Permission)", "Thu hồi một quyền cụ thể khỏi tài khoản."),

    # 17. Role Templates
    ("GET", "/api/v1/role-templates"): ("Danh sách mẫu quyền theo vai trò (Get Role Templates)", "Xem danh sách quyền mặc định của từng Role."),
    ("PUT", "/api/v1/role-templates/:role/permissions/:code"): ("Cập nhật quyền trong mẫu vai trò (Update Role Permission)", "Thêm hoặc xoá quyền mặc định cho một vai trò hệ thống."),

    # 18. Webhooks
    ("GET", "/api/v1/webhooks/subscriptions"): ("Danh sách đăng ký Webhook (Get Subscriptions)", "Lấy danh sách các endpoint webhook bên thứ 3 đã đăng ký."),
    ("POST", "/api/v1/webhooks/subscriptions"): ("Đăng ký Webhook mới (Create Subscription)", "Đăng ký URL nhận sự kiện từ hệ thống UAV PAS."),
    ("DELETE", "/api/v1/webhooks/subscriptions/:id"): ("Xoá đăng ký Webhook (Delete Subscription)", "Huỷ bỏ đăng ký webhook."),
    ("PUT", "/api/v1/webhooks/subscriptions/:id/toggle"): ("Bật/Tắt Webhook Subscription (Toggle Status)", "Chuyển đổi trạng thái kích hoạt của webhook."),
    ("POST", "/api/v1/webhooks/test-dispatch"): ("Gửi thử nghiệm sự kiện Webhook (Test Dispatch)", "Gửi thử một event mẫu đến URL webhook đã đăng ký."),
    ("GET", "/api/v1/webhooks/logs"): ("Nhật ký gửi webhook (Get Delivery Logs)", "Xem log lịch sử bắn webhook, mã HTTP trả về, số lần retry."),
    ("GET", "/api/v1/webhooks/status"): ("Trạng thái hệ thống Webhook (Get Webhook Status)", "Kiểm tra tình trạng hàng đợi và bộ dispatch webhook."),

    # 19. Dashboard
    ("GET", "/api/v1/dashboard/summary"): ("Số liệu thống kê tổng quan (Dashboard Summary KPI)", "Tổng số máy bay, trạm hoạt động, số giờ bay, nhiệm vụ thành công."),
    ("GET", "/api/v1/dashboard/missions"): ("Thống kê tiến độ nhiệm vụ (Dashboard Mission Status)", "Biểu đồ số nhiệm vụ đang bay, chờ duyệt, hoàn thành."),

    # 20. Reports
    ("GET", "/api/v1/reports/operations-summary"): ("Báo cáo vận hành hệ thống (Operations Summary Report)", "Báo cáo tổng hợp số giờ bay, chi phí, vật tư tiêu hao."),
    ("GET", "/api/v1/reports/export-csv"): ("Xuất báo cáo dạng file CSV (Export Report CSV)", "Tải file CSV dữ liệu hoạt động phục vụ phân tích kế toán."),

    # 21. Audit
    ("GET", "/api/v1/audit-logs"): ("Tra cứu nhật ký kiểm toán hệ thống (Get Audit Logs)", "Xem toàn bộ thao tác bảo mật, thay đổi dữ liệu của các tài khoản."),

    # 22. Settings
    ("GET", "/api/v1/settings"): ("Danh sách cấu hình hệ thống (Get All System Configs)", "Lấy các tham số cấu hình động của hệ thống."),
    ("GET", "/api/v1/settings/:key"): ("Xem cấu hình theo khoá (Get Config By Key)", "Lấy giá trị của một biến cấu hình cụ thể."),
    ("PUT", "/api/v1/settings/:key"): ("Cập nhật cấu hình hệ thống (Update Config)", "Thay đổi giá trị cấu hình động (hạn mức bay, thời gian timeout...)."),

    # 23. Projects & Subscriptions
    ("GET", "/api/v1/projects"): ("Danh sách dự án của khách hàng (List My Projects)", "Lấy danh sách phân trang các dự án của khách hàng kèm số gói đăng ký và số đơn bay."),
    ("POST", "/api/v1/projects"): ("Tạo dự án mới (Create Project)", "Khởi tạo dự án mới với tỉnh/thành và vùng ranh giới GeoJSON."),
    ("GET", "/api/v1/projects/:id"): ("Chi tiết dự án (Get Project By ID)", "Xem thông tin chi tiết một dự án thuộc quyền sở hữu của khách hàng."),
    ("PATCH", "/api/v1/projects/:id"): ("Cập nhật dự án (Update Project)", "Cập nhật tên, tỉnh/thành, vùng ranh giới GeoJSON hoặc ghi chú dự án."),
    ("DELETE", "/api/v1/projects/:id"): ("Xoá mềm dự án (Soft Delete Project)", "Xoá mềm dự án khi không còn đơn hàng đang thực hiện."),
    ("GET", "/api/v1/projects/:id/subscriptions"): ("Danh sách gói đăng ký theo dự án (List Project Subscriptions)", "Xem các gói dịch vụ bay định kỳ hoặc một lần gắn với dự án."),
    ("POST", "/api/v1/projects/:id/subscriptions"): ("Đăng ký dịch vụ cho dự án (Create Subscription & Initial Order)", "Đăng ký gói dịch vụ cho dự án và tự động sinh đơn hàng đầu tiên chờ điều phối."),
    ("PATCH", "/api/v1/projects/:id/subscriptions/:subId"): ("Đổi lịch hoặc tạm dừng gói đăng ký (Update Subscription)", "Đổi chu kỳ (ONCE/WEEKLY/MONTHLY), khối lượng hoặc tạm dừng/tiếp tục gói đăng ký."),
    ("DELETE", "/api/v1/projects/:id/subscriptions/:subId"): ("Huỷ gói đăng ký dự án (Cancel Subscription)", "Huỷ mềm gói đăng ký dịch vụ thuộc dự án."),

    # 24. Customer Orders & Tracking
    ("GET", "/api/v1/orders/summary"): ("Tổng hợp 5 nhóm trạng thái đơn hàng (Order Status Summary)", "Đếm số đơn hàng của khách theo 5 nhóm: pending, scheduled, inFlight, delivered, toReview."),
    ("GET", "/api/v1/orders/:id/tracking"): ("Theo dõi tiến độ bay mô phỏng trực tuyến (Live Order Tracking)", "Lấy tiến độ phần trăm, toạ độ tàu bay, dung lượng pin, tín hiệu kết nối và ETA từ phiên mô phỏng."),
    ("POST", "/api/v1/missions/:id/review"): ("Gửi đánh giá dịch vụ sau bàn giao (Submit Order Review)", "Đánh giá 1–5 sao và nhận xét cho đơn hàng đã hoàn thành."),
    ("PUT", "/api/v1/missions/:id/review"): ("Cập nhật đánh giá dịch vụ (Upsert Order Review)", "Tạo hoặc cập nhật đánh giá sao và nhận xét của khách hàng."),

    # 25. Public Marketplace
    ("GET", "/api/v1/public/marketplace/listings"): ("Danh mục dịch vụ trên chợ công khai (Browse Public Listings)", "Tìm kiếm, lọc dịch vụ theo danh mục, tỉnh/thành, từ khoá (ẩn danh tên đội bay, trả providerBadge)."),
    ("GET", "/api/v1/public/marketplace/listings/:slug"): ("Chi tiết dịch vụ công khai (Get Listing Detail)", "Xem thông tin gói dịch vụ, sản phẩm bàn giao và huy hiệu đối tác xác minh."),

    # 26. Fleet Partner Workspace (Operations)
    ("GET", "/api/v1/marketplace/provider/me"): ("Hồ sơ đội bay đối tác của tôi (Get My Provider Profile)", "Xem hồ sơ năng lực và trạng thái thẩm định KYC của đội bay."),
    ("POST", "/api/v1/marketplace/provider/me"): ("Đăng ký hồ sơ đối tác đội bay (Create Provider Profile)", "Gửi hồ sơ đăng ký trở thành đối tác vận hành bay trên nền tảng."),
    ("PATCH", "/api/v1/marketplace/provider/me"): ("Cập nhật hồ sơ đội bay (Update Provider Profile)", "Chỉnh sửa thông tin liên hệ, bán kính phục vụ và tài khoản đối soát."),
    ("GET", "/api/v1/marketplace/provider/listings"): ("Danh sách dịch vụ của đội bay (List My Listings)", "Quản lý danh sách tin đăng dịch vụ thuộc đội bay."),
    ("POST", "/api/v1/marketplace/provider/listings"): ("Tạo tin đăng dịch vụ mới (Create Provider Listing)", "Tạo mới gói dịch vụ của đội bay."),
    ("POST", "/api/v1/marketplace/provider/listings/from-template"): ("Tạo dịch vụ nhanh từ mẫu chuẩn (Create Listing From Template)", "Tạo gói dịch vụ nhanh dựa trên danh mục mẫu chuẩn của nền tảng."),
    ("DELETE", "/api/v1/marketplace/provider/listings/:id"): ("Xoá mềm dịch vụ của đội bay (Delete Provider Listing)", "Ẩn và xoá mềm tin đăng dịch vụ của đội bay."),
    ("GET", "/api/v1/marketplace/provider/fleet/uavs"): ("Danh sách tàu bay của đội (List Fleet UAVs)", "Lấy danh sách UAV thuộc đội bay kèm trạng thái sẵn sàng/đang bay/bảo trì."),
    ("POST", "/api/v1/marketplace/provider/fleet/uavs"): ("Thêm UAV vào đội bay (Register Fleet UAV)", "Đăng ký thiết bị bay mới cho đội bay đối tác."),
    ("PATCH", "/api/v1/marketplace/provider/fleet/uavs/:id"): ("Cập nhật trạng thái hoặc thông tin UAV (Update Fleet UAV)", "Cập nhật model, serial hoặc đổi trạng thái AVAILABLE/MAINTENANCE."),
    ("DELETE", "/api/v1/marketplace/provider/fleet/uavs/:id"): ("Gỡ UAV khỏi đội bay (Remove Fleet UAV)", "Ngừng khai thác UAV khi không nằm trong đơn hàng đang hoạt động."),
    ("GET", "/api/v1/marketplace/provider/pilots"): ("Danh sách kỹ sư điều khiển của đội (List Provider Pilots)", "Xem danh sách kỹ sư vận hành bay, chứng chỉ và tàu bay phụ trách."),
    ("POST", "/api/v1/marketplace/provider/pilots"): ("Thêm kỹ sư điều khiển vào đội (Create Provider Pilot)", "Thêm kỹ sư điều khiển mới và liên kết tài khoản vận hành."),
    ("PATCH", "/api/v1/marketplace/provider/pilots/:id"): ("Cập nhật kỹ sư điều khiển (Update Provider Pilot)", "Đổi trạng thái làm việc, chứng chỉ hoặc UAV gán cho kỹ sư."),
    ("DELETE", "/api/v1/marketplace/provider/pilots/:id"): ("Xoá mềm kỹ sư điều khiển (Delete Provider Pilot)", "Gỡ kỹ sư điều khiển khỏi danh sách hoạt động của đội bay."),
    ("GET", "/api/v1/marketplace/provider/orders"): ("Danh sách đơn hàng được giao cho đội bay (List Provider Orders)", "Xem các đơn hàng nền tảng đã điều phối về đội bay."),
    ("POST", "/api/v1/marketplace/provider/orders/:missionId/respond"): ("Nhận hoặc từ chối đơn được giao (Respond To Dispatched Order)", "Xác nhận nhận đơn hoặc từ chối kèm lý do để trả đơn về hàng đợi điều phối."),
    ("POST", "/api/v1/marketplace/provider/orders/:missionId/assign"): ("Phân công kỹ sư và UAV cho đơn hàng (Assign Pilot & UAV)", "Chỉ định kỹ sư điều khiển và tàu bay thuộc đội cho đơn hàng."),
    ("POST", "/api/v1/marketplace/provider/orders/:missionId/start"): ("Bắt đầu chuyến bay mô phỏng cho đơn hàng (Start Order Simulation)", "Khởi động phiên bay mô phỏng gắn với đơn hàng và chuyển sang IN_PROGRESS."),
    ("POST", "/api/v1/marketplace/provider/orders/:missionId/complete"): ("Hoàn thành chuyến bay và bàn giao dữ liệu (Complete Order)", "Đánh dấu hoàn tất bay để chuyển đơn sang bước bàn giao nghiệm thu."),

    # 27. Admin Marketplace & Dispatch
    ("GET", "/api/v1/admin/marketplace/dispatch"): ("Hàng đợi điều phối đơn hàng & Gợi ý đội bay (Get Dispatch Queue)", "Lấy danh sách đơn PENDING_DISPATCH kèm danh sách ứng viên đội bay xếp hạng theo khoảng cách, UAV rảnh và điểm đánh giá."),
    ("POST", "/api/v1/admin/marketplace/dispatch/:missionId"): ("Điều phối thủ công đơn hàng cho đội bay (Manual Dispatch Order)", "Giao đơn hàng cho một đội bay xác minh cụ thể."),
    ("POST", "/api/v1/admin/marketplace/dispatch/:missionId/auto"): ("Điều phối tự động đơn hàng theo gợi ý số 1 (Auto Dispatch Single Order)", "Tự động chọn đội bay điểm cao nhất cho đơn hàng."),
    ("POST", "/api/v1/admin/marketplace/dispatch/auto"): ("Điều phối tự động hàng loạt (Batch Auto Dispatch)", "Tự động giao hàng loạt đơn trong hàng đợi PENDING_DISPATCH."),
    ("GET", "/api/v1/admin/marketplace/stats"): ("Thống kê vận hành chợ dịch vụ (Marketplace Operations Stats)", "Số liệu đơn theo trạng thái, số đội bay xác minh, tin đăng và doanh số minh hoạ.")
}

def resolve_schema(schema_ref):
    if not schema_ref:
        return {}
    if '$ref' in schema_ref:
        ref = schema_ref['$ref']
        if ref.startswith('#/components/schemas/'):
            name = ref.split('/')[-1]
            return schemas.get(name, {})
    return schema_ref

def get_field_smart_example(field_name, prop_spec):
    prop_spec = resolve_schema(prop_spec)
    name_lower = field_name.lower()
    
    if 'enum' in prop_spec and prop_spec['enum']:
        return prop_spec['enum'][0]
    
    if 'username' in name_lower:
        return '{{username}}'
    if 'password' in name_lower:
        return '{{password}}'
    if 'email' in name_lower:
        return 'admin@uav-platform.com'
    if 'phone' in name_lower:
        return '0987654321'
    if 'refreshtoken' in name_lower:
        return '{{refreshToken}}'
    if name_lower in ('name', 'stationname', 'equipmentname'):
        return 'Trạm Vận Hành Trung Tâm Alpha'
    if name_lower in ('title', 'missiontitle'):
        return 'Nhiệm vụ bay kiểm tra đê điều và lưới điện'
    if name_lower in ('description', 'notes', 'reason'):
        return 'Kiểm tra an toàn tự động định kỳ theo lịch trình kỹ thuật'
    if name_lower in ('locationname', 'address'):
        return 'Khu Công Nghệ Cao Hòa Lạc, Hà Nội'
    if name_lower == 'latitude':
        return 21.028511
    if name_lower == 'longitude':
        return 105.804817
    if name_lower == 'altitudemeters':
        return 120.0
    if name_lower == 'serialnumber':
        return 'SN-DJI-M300-2026'
    if name_lower == 'model':
        return 'Matrice 350 Survey'
    if name_lower == 'manufacturer':
        return 'DJI Enterprise'
    if name_lower in ('code', 'permissioncode'):
        return 'UAV_SERVICES_READ'
    if name_lower == 'role':
        return 'ROLE_ADMIN'
    if name_lower == 'status':
        return 'ACTIVE'
    if name_lower == 'priority':
        return 'HIGH'
    if name_lower == 'missiontype':
        return 'AREA_INSPECTION'
    if name_lower == 'requesteddate':
        return '2026-10-23'
    if name_lower in ('starttime', 'begintime'):
        return '2026-10-23T08:00:00Z'
    if name_lower in ('expectedendtime', 'endtime'):
        return '2026-10-23T11:00:00Z'
    if name_lower in ('serviceid', 'stationid', 'userid', 'uavid', 'targetuavid', 'equipmentid', 'mediaid'):
        return 1
    if name_lower == 'pilotuserids':
        return [1]
    if name_lower in ('amount', 'totalamount', 'price'):
        return 500000.0
    if name_lower in ('quantity', 'hours', 'quota'):
        return 10
    if name_lower in ('url', 'webhookurl', 'targeturl'):
        return 'https://webhook.site/test-uav-pas'
    if name_lower == 'events':
        return ['MISSION_CREATED', 'MISSION_COMPLETED']
    if name_lower == 'secret':
        return 'whsec_local_test_key_12345'
    
    prop_type = prop_spec.get('type')
    prop_format = prop_spec.get('format')
    
    if prop_format == 'date-time':
        return '2026-10-23T08:00:00Z'
    if prop_format == 'date':
        return '2026-10-23'
    if prop_type == 'integer':
        return 1
    if prop_type == 'number':
        return 100.0
    if prop_type == 'boolean':
        return True
    if prop_type == 'string':
        return prop_spec.get('example', 'string_sample')
    
    return 'sample_value'

def sample_from_schema(s, depth=0):
    if depth > 4 or not s:
        return {}
    s = resolve_schema(s)
    stype = s.get('type', 'object')
    
    if stype == 'object':
        obj = {}
        props = s.get('properties', {})
        if not props and 'allOf' in s:
            for item in s['allOf']:
                sub_res = sample_from_schema(item, depth + 1)
                if isinstance(sub_res, dict):
                    obj.update(sub_res)
            return obj
            
        for prop_name, prop_spec in props.items():
            resolved_prop = resolve_schema(prop_spec)
            ptype = resolved_prop.get('type')
            
            if ptype == 'object':
                obj[prop_name] = sample_from_schema(resolved_prop, depth + 1)
            elif ptype == 'array':
                items_spec = resolved_prop.get('items', {})
                resolved_item = resolve_schema(items_spec)
                if resolved_item.get('type') == 'object':
                    obj[prop_name] = [sample_from_schema(resolved_item, depth + 1)]
                else:
                    obj[prop_name] = [get_field_smart_example(prop_name, resolved_item)]
            else:
                obj[prop_name] = get_field_smart_example(prop_name, resolved_prop)
        return obj
    elif stype == 'array':
        items_spec = s.get('items', {})
        return [sample_from_schema(items_spec, depth + 1)]
    return get_field_smart_example('sample', s)

PATH_VAR_DEFAULTS = {
    'id': '{{sampleMissionId}}',
    'subId': '{{sampleSubId}}',
    'pilotId': '{{samplePilotId}}',
    'slug': '{{sampleListingSlug}}',
    'userId': '{{sampleUserId}}',
    'missionId': '{{sampleMissionId}}',
    'stationId': '{{sampleStationId}}',
    'uavId': '{{sampleUavId}}',
    'mediaId': '{{sampleMediaId}}',
    'detectionId': '{{sampleDetectionId}}',
    'equipmentId': '{{sampleEquipmentId}}',
    'code': 'UAV_SERVICES_READ',
    'role': 'ROLE_ADMIN',
    'key': '{{sampleSettingKey}}',
    'serviceId': '{{sampleServiceId}}'
}

def resolve_path_var_value(pm_path_str, pv_name):
    if pv_name in ('id', 'userId') and any(x in pm_path_str for x in ['/users/', '/permissions/users/', '/billing/admin/quotas/']):
        return '{{sampleUserId}}'
    if pv_name == 'id':
        if '/projects/' in pm_path_str:
            return '{{sampleProjectId}}'
        if '/uavs/' in pm_path_str:
            return '{{sampleUavId}}'
        if '/stations/' in pm_path_str:
            return '{{sampleStationId}}'
        if '/inventory/equipment/' in pm_path_str:
            return '{{sampleEquipmentId}}'
        if '/maintenance/schedules/' in pm_path_str:
            return '{{sampleScheduleId}}'
        if '/maintenance/orders/' in pm_path_str:
            return '{{sampleRepairOrderId}}'
        if '/billing/invoices/' in pm_path_str:
            return '{{sampleInvoiceId}}'
        if '/media/' in pm_path_str:
            return '{{sampleMediaId}}'
        if '/notifications/' in pm_path_str:
            return '{{sampleNotificationId}}'
        if '/webhooks/subscriptions/' in pm_path_str:
            return '{{sampleWebhookId}}'
        if '/marketplace/provider/listings/' in pm_path_str:
            return '{{sampleListingId}}'
        if '/marketplace/provider/pilots/' in pm_path_str:
            return '{{samplePilotId}}'
        if '/orders/' in pm_path_str or '/missions/' in pm_path_str:
            return '{{sampleMissionId}}'
    return PATH_VAR_DEFAULTS.get(pv_name, '{{sampleMissionId}}')

LIST_VAR_EXTRACTION = {
    '/api/v1/users': ('sampleUserId', 'id'),
    '/api/v1/missions': ('sampleMissionId', 'id'),
    '/api/v1/uav-services': ('sampleServiceId', 'id'),
    '/api/v1/uavs': ('sampleUavId', 'id'),
    '/api/v1/stations': ('sampleStationId', 'id'),
    '/api/v1/inventory/equipment': ('sampleEquipmentId', 'id'),
    '/api/v1/maintenance/schedules': ('sampleScheduleId', 'id'),
    '/api/v1/maintenance/orders': ('sampleRepairOrderId', 'id'),
    '/api/v1/billing/invoices': ('sampleInvoiceId', 'id'),
    '/api/v1/media': ('sampleMediaId', 'id'),
    '/api/v1/notifications': ('sampleNotificationId', 'id'),
    '/api/v1/webhooks/subscriptions': ('sampleWebhookId', 'id'),
    '/api/v1/settings': ('sampleSettingKey', 'configKey'),
    '/api/v1/projects': ('sampleProjectId', 'id'),
    '/api/v1/projects/:id/subscriptions': ('sampleSubId', 'id'),
    '/api/v1/marketplace/provider/pilots': ('samplePilotId', 'id'),
    '/api/v1/marketplace/provider/fleet/uavs': ('sampleUavId', 'id'),
    '/api/v1/marketplace/provider/listings': ('sampleListingId', 'id'),
}

COLLECTION_PRE_REQUEST_SCRIPT = """// UAV PAS Platform - Automated Auto-Login Pre-request Script
var baseUrl = pm.variables.get("baseUrl") || "http://localhost:8080";
var token = pm.variables.get("token");
var urlStr = pm.request.url ? pm.request.url.toString() : "";
var isAuth = urlStr.indexOf("/auth/login") !== -1 || urlStr.indexOf("/auth/register") !== -1 || urlStr.indexOf("/public/") !== -1;
var hasExplicitAuthHeader = pm.request.headers.has("Authorization");

if (!hasExplicitAuthHeader && !token && !isAuth) {
    var username = pm.variables.get("username") || pm.variables.get("defaultUsername") || "demo_admin";
    var password = pm.variables.get("password") || pm.variables.get("defaultPassword") || "";
    
    if (username && password) {
        pm.sendRequest({
            url: baseUrl + "/api/v1/auth/login",
            method: "POST",
            header: { "Content-Type": "application/json" },
            body: {
                mode: "raw",
                raw: JSON.stringify({
                    usernameOrEmail: username,
                    password: password
                })
            }
        }, function (err, res) {
            if (!err && res.code === 200) {
                var data = res.json();
                var newToken = data.accessToken || (data.data && data.data.accessToken);
                var newRefreshToken = data.refreshToken || (data.data && data.data.refreshToken);
                if (newToken) {
                    pm.collectionVariables.set("token", newToken);
                    pm.request.headers.upsert({ key: "Authorization", value: "Bearer " + newToken });
                }
                if (newRefreshToken) {
                    pm.collectionVariables.set("refreshToken", newRefreshToken);
                }
            }
        });
    }
} else if (!hasExplicitAuthHeader && token && !isAuth) {
    pm.request.headers.upsert({ key: "Authorization", value: "Bearer " + token });
}
"""

collection = {
    'info': {
        'name': 'UAV PAS Platform API - Complete Test Suite',
        'description': '# UAV PAS Platform API Documentation & Postman Collection\n\n'
                       'Tập hợp đầy đủ các API endpoints với Sample Request Body chi tiết, Query Params, Path Variables mặc định, và **Cơ chế Tự Động Đăng Nhập (Auto-Login)**.\n\n'
                       '### 🔑 Biến tài khoản kiểm thử (`app.dev-seed.enabled=true`):\n'
                       '- **Biến đăng nhập:** `{{username}}` / `{{password}}`\n'
                       '- **Tài khoản dev seed:** `demo_admin` (ROLE_ADMIN), `demo_fleet` (Đội bay xác minh), `demo_customer` (Khách hàng dự án)\n\n'
                       '### 🚀 Các tính năng tự động tích hợp:\n'
                       '1. **Auto-Login:** Pre-request Script tự động gọi API login bằng `{{username}}` / `{{password}}` để cấp token mới nếu chưa có.\n'
                       '2. **Auto-Save Token:** Khi gọi request Login, token và refreshToken mới sẽ tự động lưu vào biến `{{token}}` và `{{refreshToken}}`.\n'
                       '3. **Full Sample Body:** Tất cả POST/PUT/PATCH đều điền sẵn JSON body mẫu hợp lệ.\n'
                       '4. **Default Path Variables:** Tất cả `:id`, `:subId`, `:missionId`... đều gán sẵn giá trị mặc định.\n'
                       '5. **Test Scripts:** Tự động kiểm tra HTTP status và thời gian phản hồi cho từng request.\n',
        'schema': 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    'event': [
        {
            'listen': 'prerequest',
            'script': {
                'type': 'text/javascript',
                'exec': [line for line in COLLECTION_PRE_REQUEST_SCRIPT.split('\n')]
            }
        }
    ],
    'auth': {
        'type': 'bearer',
        'bearer': [
            {'key': 'token', 'value': '{{token}}', 'type': 'string'}
        ]
    },
    'variable': [
        {'key': 'baseUrl', 'value': 'http://localhost:8080', 'type': 'string'},
        {'key': 'token', 'value': CURRENT_ADMIN_TOKEN, 'type': 'string'},
        {'key': 'refreshToken', 'value': CURRENT_REFRESH_TOKEN, 'type': 'string'},
        {'key': 'username', 'value': 'demo_admin', 'type': 'string'},
        {'key': 'password', 'value': '', 'type': 'string'},
        {'key': 'defaultUsername', 'value': 'demo_admin', 'type': 'string'},
        {'key': 'defaultPassword', 'value': '', 'type': 'string'},
        {'key': 'customerUsername', 'value': 'demo_customer', 'type': 'string'},
        {'key': 'fleetUsername', 'value': 'demo_fleet', 'type': 'string'},
        {'key': 'adminUsername', 'value': 'demo_admin', 'type': 'string'},
        {'key': 'customerToken', 'value': '', 'type': 'string'},
        {'key': 'fleetToken', 'value': '', 'type': 'string'},
        {'key': 'adminToken', 'value': '', 'type': 'string'},
        {'key': 'sampleUserId', 'value': '1', 'type': 'string'},
        {'key': 'sampleMissionId', 'value': '1', 'type': 'string'},
        {'key': 'sampleServiceId', 'value': '1', 'type': 'string'},
        {'key': 'sampleUavId', 'value': '1', 'type': 'string'},
        {'key': 'sampleStationId', 'value': '1', 'type': 'string'},
        {'key': 'sampleEquipmentId', 'value': '1', 'type': 'string'},
        {'key': 'sampleScheduleId', 'value': '1', 'type': 'string'},
        {'key': 'sampleRepairOrderId', 'value': '1', 'type': 'string'},
        {'key': 'sampleInvoiceId', 'value': '1', 'type': 'string'},
        {'key': 'sampleMediaId', 'value': '1', 'type': 'string'},
        {'key': 'sampleNotificationId', 'value': '1', 'type': 'string'},
        {'key': 'sampleWebhookId', 'value': '1', 'type': 'string'},
        {'key': 'sampleDetectionId', 'value': '1', 'type': 'string'},
        {'key': 'sampleSettingKey', 'value': 'marketplace.platform_fee_rate', 'type': 'string'},
        {'key': 'sampleProjectId', 'value': '1', 'type': 'string'},
        {'key': 'sampleSubId', 'value': '1', 'type': 'string'},
        {'key': 'samplePilotId', 'value': '1', 'type': 'string'},
        {'key': 'sampleListingId', 'value': '1', 'type': 'string'},
        {'key': 'sampleListingSlug', 'value': 'khao-sat-ban-do-2d-du-an-minh-hoa', 'type': 'string'},
        {'key': 'flowListingId', 'value': '', 'type': 'string'},
        {'key': 'flowListingSlug', 'value': '', 'type': 'string'},
        {'key': 'flowProjectId', 'value': '', 'type': 'string'},
        {'key': 'flowSubId', 'value': '', 'type': 'string'},
        {'key': 'flowMissionId', 'value': '', 'type': 'string'},
        {'key': 'flowMissionCancelId', 'value': '', 'type': 'string'},
        {'key': 'flowPilotId', 'value': '', 'type': 'string'},
        {'key': 'flowUavId', 'value': '', 'type': 'string'},
        {'key': 'flowStartDate', 'value': '2026-11-25', 'type': 'string'}
    ],
    'item': []
}

TAG_NAMES = {
    'Authentication': '01. Authentication & Security',
    'Users': '02. User Accounts Management',
    'user-profile-controller': '03. User Profile',
    'mission-controller': '04. Flight Missions & Operations',
    'telemetry-controller': '04. Flight Missions & Operations',
    'service-offering-controller': '05. Mission Service Offerings',
    'uav-controller': '06. UAV Fleet Management',
    'station-controller': '07. Docking Stations',
    'inventory-controller': '08. Equipment & Inventory',
    'maintenance-controller': '09. Maintenance & Repair Orders',
    'billing-controller': '10. Billing, Plans & Invoices',
    'payment-ipn-controller': '11. Payment Gateway IPN',
    'sar-controller': '12. Search & Rescue (SAR)',
    'ai-controller': '13. AI Vision & Object Detection',
    'media-controller': '14. Media & Cloud Storage (MinIO)',
    'notification-controller': '15. System Notifications',
    'permission-controller': '16. Permissions (RBAC)',
    'role-template-controller': '17. Role Templates',
    'webhook-controller': '18. Webhooks & Subscriptions',
    'dashboard-controller': '19. Executive Dashboard',
    'report-controller': '20. Operational Reports',
    'audit-log-controller': '21. System Audit Logs',
    'system-config-controller': '22. System Configurations',
    'project-controller': '23. Customer Projects & Subscriptions',
    'order-controller': '24. Customer Orders & Live Tracking',
    'marketplace-public-controller': '25. Public Service Marketplace',
    'marketplace-provider-controller': '26. Fleet Partner Workspace',
    'marketplace-admin-controller': '27. Admin Marketplace & Dispatch'
}

folders = {}
paths = openapi.get('paths', {})

for path_str, methods in paths.items():
    for method_name, op in methods.items():
        m_upper = method_name.upper()
        if m_upper not in ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']:
            continue
        
        raw_tags = op.get('tags', ['General'])
        raw_tag = raw_tags[0] if raw_tags else 'General'
        folder_name = TAG_NAMES.get(raw_tag, raw_tag)
        
        if folder_name not in folders:
            folders[folder_name] = {
                'name': folder_name,
                'description': f'Quản lý các API thuộc phân hệ {folder_name}',
                'item': []
            }
        
        pm_path_str = re.sub(r'\{([^}]+)\}', r':\1', path_str)
        path_segments = [seg for seg in pm_path_str.strip('/').split('/') if seg]
        
        url_obj = {
            'raw': '{{baseUrl}}' + pm_path_str,
            'host': ['{{baseUrl}}'],
            'path': path_segments,
            'query': [],
            'variable': []
        }
        
        path_var_names = re.findall(r':([a-zA-Z0-9_]+)', pm_path_str)
        for pv_name in path_var_names:
            val = resolve_path_var_value(pm_path_str, pv_name)
            url_obj['variable'].append({
                'key': pv_name,
                'value': val,
                'description': f'Tham số đường dẫn {pv_name} (lấy động từ danh sách trước đó)'
            })
            
        for param in op.get('parameters', []):
            pin = param.get('in')
            pname = param.get('name')
            pdesc = param.get('description', '')
            if pin == 'query':
                default_val = ''
                if pname == 'page':
                    default_val = '0'
                elif pname == 'size':
                    default_val = '20'
                elif pname == 'sort':
                    default_val = 'id,desc'
                elif pname == 'status':
                    default_val = 'ACTIVE'
                elif pname == 'role':
                    default_val = 'ROLE_ADMIN'
                else:
                    default_val = str(param.get('schema', {}).get('example', ''))
                    
                url_obj['query'].append({
                    'key': pname,
                    'value': default_val,
                    'description': pdesc,
                    'disabled': False if pname in ('page', 'size') else not param.get('required', False)
                })
        
        # Determine Body
        body_obj = None
        if 'requestBody' in op:
            req_content = op['requestBody'].get('content', {})
            if 'application/json' in req_content:
                schema_info = req_content['application/json'].get('schema', {})
                sample_body = sample_from_schema(schema_info)
                
                # Special overrides
                if path_str in ('/api/v1/auth/login', '/api/v1/auth/login-json'):
                    sample_body = {
                        "usernameOrEmail": "{{username}}",
                        "password": "{{password}}"
                    }
                elif path_str == '/api/v1/auth/refresh':
                    sample_body = {
                        "refreshToken": "{{refreshToken}}"
                    }
                elif path_str == '/api/v1/auth/register':
                    sample_body = {
                        "username": "pilot_user_test",
                        "email": "pilot_test@uav-platform.com",
                        "password": "Password123@",
                        "phoneNumber": "0912345678"
                    }
                elif path_str == '/api/v1/users/profile':
                    sample_body = {
                        "fullName": "Administrator Hệ Thống",
                        "phoneNumber": "0987654321"
                    }
                elif path_str == '/api/v1/billing/admin/quotas/{userId}':
                    sample_body = {
                        "monthlyFlightHoursQuota": 50,
                        "concurrentMissionsQuota": 5
                    }
                
                body_obj = {
                    'mode': 'raw',
                    'raw': json.dumps(sample_body, indent=2, ensure_ascii=False),
                    'options': {
                        'raw': {
                            'language': 'json'
                        }
                    }
                }
            elif 'multipart/form-data' in req_content:
                body_obj = {
                    'mode': 'formdata',
                    'formdata': [
                        {
                            'key': 'file',
                            'type': 'file',
                            'description': 'Tập tin tải lên'
                        }
                    ]
                }
        
        # Metadata lookup
        meta_key = (m_upper, pm_path_str)
        if meta_key in ENDPOINT_METADATA:
            req_name, req_desc = ENDPOINT_METADATA[meta_key]
        else:
            summary = op.get('summary', '').strip()
            req_name = summary if summary else f'{m_upper} {path_str}'
            req_desc = op.get('description', '') or req_name
            
        test_script_lines = [
            'pm.test("Status is handled properly (no server crash)", function () {',
            '    pm.expect(pm.response.code !== 500).to.be.true;',
            '});',
            'pm.test("Response time is reasonable (< 3000ms)", function () {',
            '    pm.expect(pm.response.responseTime).to.be.below(3000);',
            '});'
        ]
        
        if path_str in ('/api/v1/auth/login', '/api/v1/auth/login-json'):
            test_script_lines = [
                'if (pm.response.code === 200) {',
                '    var data = pm.response.json();',
                '    var token = data.accessToken || (data.data && data.data.accessToken);',
                '    var refreshToken = data.refreshToken || (data.data && data.data.refreshToken);',
                '    if (token) {',
                '        pm.collectionVariables.set("token", token);',
                '        console.log("Token updated successfully in {{token}}");',
                '    }',
                '    if (refreshToken) {',
                '        pm.collectionVariables.set("refreshToken", refreshToken);',
                '        console.log("RefreshToken updated successfully in {{refreshToken}}");',
                '    }',
                '}',
                'pm.test("Login successful with 200 OK", function () {',
                '    pm.response.to.have.status(200);',
                '    pm.expect(pm.response.json().accessToken).to.be.a("string");',
                '});'
            ]
        elif path_str == '/api/v1/auth/logout':
            test_script_lines = [
                'pm.test("Logout responded", function () {',
                '    pm.expect(pm.response.code).to.be.below(500);',
                '});',
                'pm.collectionVariables.set("token", "");',
                'pm.collectionVariables.unset("token");',
            ]
        elif m_upper == 'GET' and pm_path_str == '/api/v1/public/marketplace/listings':
            test_script_lines.extend([
                'if (pm.response.code === 200) {',
                '    var body = pm.response.json();',
                '    var items = Array.isArray(body) ? body : (body.content || (body.data && body.data.content) || []);',
                '    if (items.length > 0) {',
                '        if (items[0].id !== undefined) pm.collectionVariables.set("sampleListingId", String(items[0].id));',
                '        if (items[0].slug) pm.collectionVariables.set("sampleListingSlug", String(items[0].slug));',
                '    }',
                '}'
            ])
        elif m_upper == 'GET' and pm_path_str in LIST_VAR_EXTRACTION:
            var_name, field_key = LIST_VAR_EXTRACTION[pm_path_str]
            test_script_lines.extend([
                'if (pm.response.code === 200) {',
                '    var body = pm.response.json();',
                '    var items = Array.isArray(body) ? body : (body.content || (body.data && body.data.content) || []);',
                f'    if (items.length > 0 && items[0] && items[0]["{field_key}"] !== undefined && items[0]["{field_key}"] !== null) {{',
                f'        pm.collectionVariables.set("{var_name}", String(items[0]["{field_key}"]));',
                '    }',
                '}'
            ])
            
        req_item = {
            'name': req_name,
            'request': {
                'method': m_upper,
                'header': [
                    {'key': 'Content-Type', 'value': 'application/json', 'type': 'text'}
                ] if body_obj and body_obj.get('mode') == 'raw' else [],
                'url': url_obj,
                'description': f'### {req_name}\n\n{req_desc}\n\n* **Phương thức:** `{m_upper}`\n* **Endpoint:** `{path_str}`'
            },
            'event': [
                {
                    'listen': 'test',
                    'script': {
                        'type': 'text/javascript',
                        'exec': test_script_lines
                    }
                }
            ],
            'response': []
        }
        
        if body_obj:
            req_item['request']['body'] = body_obj
            
        if path_str in ('/api/v1/auth/login', '/api/v1/auth/login-json', '/api/v1/auth/register', '/api/v1/billing/webhook/payment-ipn') or path_str.startswith('/api/v1/public/'):
            req_item['request']['auth'] = {'type': 'noauth'}

        folders[folder_name]['item'].append(req_item)

for folder_key in sorted(folders.keys()):
    f_obj = folders[folder_key]
    f_obj['item'].sort(key=lambda x: (
        0 if 'login' in x['name'].lower() else
        1 if 'refresh' in x['name'].lower() else
        2 if 'register' in x['name'].lower() else
        3 if 'me' in x['name'].lower() else
        4 if x['request']['method'] == 'GET' and not x['request']['url'].get('variable') else
        5 if x['request']['method'] == 'GET' else
        6 if x['request']['method'] == 'POST' and 'tạo' in x['name'].lower() else
        7 if x['request']['method'] == 'POST' else
        8 if x['request']['method'] == 'PUT' else
        9 if x['request']['method'] == 'PATCH' else 10,
        x['name']
    ))
    for idx, item in enumerate(f_obj['item'], 1):
        item['name'] = f"{idx:02d}. {item['name']}"
        
    collection['item'].append(f_obj)

def make_flow_item(name, method, raw_path, token_var=None, body=None, test_lines=None, prereq_lines=None):
    headers = []
    if token_var:
        headers.append({'key': 'Authorization', 'value': f'Bearer {{{{{token_var}}}}}', 'type': 'text'})
    if body is not None:
        headers.append({'key': 'Content-Type', 'value': 'application/json', 'type': 'text'})
    segs = [seg for seg in raw_path.strip('/').split('/') if seg]
    req = {
        'method': method,
        'header': headers,
        'url': {
            'raw': '{{baseUrl}}' + raw_path,
            'host': ['{{baseUrl}}'],
            'path': segs
        },
        'auth': {'type': 'noauth'}
    }
    if body is not None:
        req['body'] = {
            'mode': 'raw',
            'raw': json.dumps(body, indent=2, ensure_ascii=False),
            'options': {'raw': {'language': 'json'}}
        }
    events = []
    if prereq_lines:
        events.append({'listen': 'prerequest', 'script': {'type': 'text/javascript', 'exec': prereq_lines}})
    events.append({
        'listen': 'test',
        'script': {
            'type': 'text/javascript',
            'exec': test_lines or [
                'pm.test("HTTP 2xx OK", function () {',
                '    pm.expect(pm.response.code).to.be.within(200, 299);',
                '});'
            ]
        }
    })
    return {'name': name, 'request': req, 'event': events, 'response': []}

order_flow_folder = {
    'name': '28. Luồng đặt hàng (E2E Order Flow)',
    'description': (
        'Chuỗi kiểm thử tự động xuyên suốt luồng đặt hàng chợ dịch vụ UAV trên DB trắng có dev seed '
        '(`demo_customer`, `demo_admin`, `demo_fleet` dùng chung `{{password}}`). '
        'Tất cả ID đều lấy động từ phản hồi bước trước, không dùng `id=1` cố định.'
    ),
    'item': [
        make_flow_item(
            '01. Đăng nhập Khách hàng (demo_customer)',
            'POST',
            '/api/v1/auth/login',
            body={'usernameOrEmail': '{{customerUsername}}', 'password': '{{password}}'},
            prereq_lines=[
                'var d = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);',
                'pm.collectionVariables.set("flowStartDate", d);'
            ],
            test_lines=[
                'pm.test("Customer login 200", function () { pm.response.to.have.status(200); });',
                'var data = pm.response.json();',
                'pm.collectionVariables.set("customerToken", data.accessToken || (data.data && data.data.accessToken));'
            ]
        ),
        make_flow_item(
            '02. Lấy dịch vụ công khai đầu tiên trên chợ',
            'GET',
            '/api/v1/public/marketplace/listings',
            test_lines=[
                'pm.test("Public listings 200", function () { pm.response.to.have.status(200); });',
                'var items = pm.response.json().content || [];',
                'pm.expect(items.length).to.be.above(0);',
                'pm.collectionVariables.set("flowListingId", String(items[0].id));',
                'pm.collectionVariables.set("flowListingSlug", String(items[0].slug));',
                'pm.test("Fleet identity is anonymized for customer", function () {',
                '    pm.expect(items[0].providerDisplayName).to.be.null;',
                '    pm.expect(items[0].providerBadge).to.be.an("object");',
                '});'
            ]
        ),
        make_flow_item(
            '03. Khách tạo Dự án mới',
            'POST',
            '/api/v1/projects',
            token_var='customerToken',
            body={
                'name': 'Dự án Kiểm thử Tự động Postman',
                'province': 'TP. Hồ Chí Minh',
                'areaGeoJson': '{"type":"Polygon","coordinates":[[[106.701,10.728],[106.712,10.728],[106.712,10.736],[106.701,10.736],[106.701,10.728]]]}',
                'note': 'Khởi tạo từ chuỗi Luồng đặt hàng Postman'
            },
            test_lines=[
                'pm.test("Project created 201", function () { pm.response.to.have.status(201); });',
                'var prj = pm.response.json();',
                'pm.collectionVariables.set("flowProjectId", String(prj.id));'
            ]
        ),
        make_flow_item(
            '04. Khách cập nhật ghi chú Dự án',
            'PATCH',
            '/api/v1/projects/{{flowProjectId}}',
            token_var='customerToken',
            body={'note': 'Đã xác nhận ranh giới bay khảo sát — minh hoạ'},
            test_lines=[
                'pm.test("Project updated 200", function () { pm.response.to.have.status(200); });'
            ]
        ),
        make_flow_item(
            '05. Khách đăng ký Dịch vụ cho Dự án (tạo đơn đầu tiên)',
            'POST',
            '/api/v1/projects/{{flowProjectId}}/subscriptions',
            token_var='customerToken',
            body={
                'listingId': '{{flowListingId}}',
                'scheduleType': 'WEEKLY',
                'startDate': '{{flowStartDate}}',
                'units': 10,
                'note': 'Đăng ký bay định kỳ hàng tuần'
            },
            prereq_lines=[
                'var lid = Number(pm.variables.get("flowListingId"));',
                'var sdate = pm.variables.get("flowStartDate");',
                'pm.request.body.raw = JSON.stringify({',
                '    listingId: lid,',
                '    scheduleType: "WEEKLY",',
                '    startDate: sdate,',
                '    units: 10,',
                '    note: "Đăng ký bay định kỳ hàng tuần — minh hoạ"',
                '});'
            ],
            test_lines=[
                'pm.test("Subscription & first order created 201", function () { pm.response.to.have.status(201); });',
                'var sub = pm.response.json();',
                'pm.collectionVariables.set("flowSubId", String(sub.id));',
                'pm.collectionVariables.set("flowMissionId", String(sub.firstMissionId));'
            ]
        ),
        make_flow_item(
            '06. Khách kiểm tra Thanh 5 trạng thái đơn (/orders/summary)',
            'GET',
            '/api/v1/orders/summary',
            token_var='customerToken',
            test_lines=[
                'pm.test("Order summary 200 & pending >= 1", function () {',
                '    pm.response.to.have.status(200);',
                '    pm.expect(pm.response.json().pending).to.be.at.least(1);',
                '});'
            ]
        ),
        make_flow_item(
            '07. Đăng nhập Quản trị viên (demo_admin)',
            'POST',
            '/api/v1/auth/login',
            body={'usernameOrEmail': '{{adminUsername}}', 'password': '{{password}}'},
            test_lines=[
                'pm.test("Admin login 200", function () { pm.response.to.have.status(200); });',
                'var data = pm.response.json();',
                'pm.collectionVariables.set("adminToken", data.accessToken || (data.data && data.data.accessToken));'
            ]
        ),
        make_flow_item(
            '08. Admin kiểm tra Hàng đợi điều phối PENDING_DISPATCH',
            'GET',
            '/api/v1/admin/marketplace/dispatch',
            token_var='adminToken',
            test_lines=[
                'pm.test("Dispatch queue 200", function () {',
                '    pm.response.to.have.status(200);',
                '    pm.expect(pm.response.json().content.length).to.be.at.least(1);',
                '});'
            ]
        ),
        make_flow_item(
            '09. Admin giao đơn cho Đội bay demo_fleet',
            'POST',
            '/api/v1/admin/marketplace/dispatch/{{flowMissionId}}',
            token_var='adminToken',
            body={'providerId': 1, 'note': 'Giao cho đội bay kiểm thử tự động'},
            prereq_lines=[
                'var baseUrl = pm.variables.get("baseUrl") || "http://localhost:8080";',
                'var adminTok = pm.variables.get("adminToken");',
                'pm.sendRequest({',
                '    url: baseUrl + "/api/v1/admin/marketplace/providers?keyword=doi-bay-mien-nam",',
                '    method: "GET",',
                '    header: { "Authorization": "Bearer " + adminTok }',
                '}, function (err, res) {',
                '    if (!err && res.code === 200) {',
                '        var list = res.json().content || [];',
                '        if (list.length > 0) {',
                '            pm.collectionVariables.set("flowProviderId", String(list[0].id));',
                '            pm.request.body.raw = JSON.stringify({ providerId: list[0].id, note: "Giao đội bay miền Nam — minh hoạ" });',
                '        }',
                '    }',
                '});'
            ],
            test_lines=[
                'pm.test("Dispatched to fleet 200", function () {',
                '    pm.response.to.have.status(200);',
                '    pm.expect(pm.response.json().providerResponseStatus).to.eql("PENDING_PROVIDER");',
                '});'
            ]
        ),
        make_flow_item(
            '10. Đăng nhập Chủ đội bay (demo_fleet)',
            'POST',
            '/api/v1/auth/login',
            body={'usernameOrEmail': '{{fleetUsername}}', 'password': '{{password}}'},
            test_lines=[
                'pm.test("Fleet login 200", function () { pm.response.to.have.status(200); });',
                'var data = pm.response.json();',
                'pm.collectionVariables.set("fleetToken", data.accessToken || (data.data && data.data.accessToken));'
            ]
        ),
        make_flow_item(
            '11. Đội bay lấy danh sách UAV & Kỹ sư rảnh',
            'GET',
            '/api/v1/marketplace/provider/fleet/uavs',
            token_var='fleetToken',
            test_lines=[
                'pm.test("Fleet UAVs 200", function () { pm.response.to.have.status(200); });',
                'var uavs = pm.response.json() || [];',
                'var avail = uavs.filter(function (u) { return u.status === "AVAILABLE"; });',
                'var chosen = avail.length > 0 ? avail[0] : uavs[0];',
                'pm.collectionVariables.set("flowUavId", String(chosen.id));'
            ]
        ),
        make_flow_item(
            '12. Đội bay lấy Kỹ sư điều khiển đầu tiên',
            'GET',
            '/api/v1/marketplace/provider/pilots',
            token_var='fleetToken',
            test_lines=[
                'pm.test("Fleet pilots 200", function () { pm.response.to.have.status(200); });',
                'var pilots = pm.response.json() || [];',
                'if (pilots.length > 0) pm.collectionVariables.set("flowPilotId", String(pilots[0].id));',
                'if (pilots.length > 1) pm.collectionVariables.set("flowSecondPilotId", String(pilots[1].id));'
            ]
        ),
        make_flow_item(
            '13. Đội bay xác nhận nhận đơn',
            'POST',
            '/api/v1/marketplace/provider/orders/{{flowMissionId}}/respond',
            token_var='fleetToken',
            body={'accept': True, 'reason': 'Đội bay tiếp nhận lịch bay dự án'},
            test_lines=[
                'pm.test("Fleet accepted order 200", function () { pm.response.to.have.status(200); });'
            ]
        ),
        make_flow_item(
            '14. Đội bay phân công Kỹ sư & UAV',
            'POST',
            '/api/v1/marketplace/provider/orders/{{flowMissionId}}/assign',
            token_var='fleetToken',
            body={'pilotId': 1, 'uavId': 1, 'note': 'Phân công tổ bay khảo sát'},
            prereq_lines=[
                'var pid = Number(pm.variables.get("flowPilotId"));',
                'var uid = Number(pm.variables.get("flowUavId"));',
                'pm.request.body.raw = JSON.stringify({ pilotId: pid || null, uavId: uid, note: "Phân công tổ bay khảo sát — minh hoạ" });'
            ],
            test_lines=[
                'pm.test("Assigned pilot & UAV 200", function () {',
                '    pm.response.to.have.status(200);',
                '    pm.expect(pm.response.json().statusGroup).to.eql("SCHEDULED");',
                '});'
            ]
        ),
        make_flow_item(
            '14a. Khách tạo đơn thứ hai trùng khung giờ để kiểm thử tranh chấp UAV',
            'POST',
            '/api/v1/projects/{{flowProjectId}}/subscriptions',
            token_var='customerToken',
            body={
                'listingId': '{{flowListingId}}',
                'scheduleType': 'ONCE',
                'startDate': '{{flowStartDate}}',
                'units': 5,
                'note': 'Đơn trùng khung giờ kiểm thử chặn gán trùng UAV'
            },
            prereq_lines=[
                'var lid = Number(pm.variables.get("flowListingId"));',
                'var sdate = pm.variables.get("flowStartDate");',
                'pm.request.body.raw = JSON.stringify({',
                '    listingId: lid,',
                '    scheduleType: "ONCE",',
                '    startDate: sdate,',
                '    units: 5,',
                '    note: "Đơn trùng khung giờ kiểm thử chặn gán trùng UAV — minh hoạ"',
                '});'
            ],
            test_lines=[
                'pm.test("Overlapping second order created 201", function () { pm.response.to.have.status(201); });',
                'var sub2 = pm.response.json();',
                'pm.collectionVariables.set("flowConflictSubId", String(sub2.id));',
                'pm.collectionVariables.set("flowConflictMissionId", String(sub2.firstMissionId));'
            ]
        ),
        make_flow_item(
            '14b. Admin giao đơn trùng giờ cho cùng Đội bay demo_fleet',
            'POST',
            '/api/v1/admin/marketplace/dispatch/{{flowConflictMissionId}}',
            token_var='adminToken',
            body={'providerId': 1, 'note': 'Giao đơn trùng giờ kiểm thử tranh chấp UAV'},
            prereq_lines=[
                'var pid = Number(pm.variables.get("flowProviderId"));',
                'if (pid) {',
                '    pm.request.body.raw = JSON.stringify({ providerId: pid, note: "Giao đơn trùng giờ kiểm thử tranh chấp UAV — minh hoạ" });',
                '}'
            ],
            test_lines=[
                'pm.test("Overlapping order dispatched to same fleet 200", function () {',
                '    pm.response.to.have.status(200);',
                '    pm.expect(pm.response.json().providerResponseStatus).to.eql("PENDING_PROVIDER");',
                '});'
            ]
        ),
        make_flow_item(
            '14c. Đội bay phân cùng UAV cho đơn trùng giờ → chặn 409 UAV_TIME_CONFLICT',
            'POST',
            '/api/v1/marketplace/provider/orders/{{flowConflictMissionId}}/assign',
            token_var='fleetToken',
            body={'pilotId': 2, 'uavId': 1, 'note': 'Thử phân cùng UAV trùng giờ'},
            prereq_lines=[
                'var uid = Number(pm.variables.get("flowUavId"));',
                'var pid2 = Number(pm.variables.get("flowSecondPilotId")) || Number(pm.variables.get("flowPilotId"));',
                'pm.request.body.raw = JSON.stringify({ pilotId: pid2 || null, uavId: uid, note: "Thử phân cùng UAV trùng khung giờ — minh hoạ" });'
            ],
            test_lines=[
                'pm.test("Double-booked UAV rejected with 409 UAV_TIME_CONFLICT", function () {',
                '    pm.response.to.have.status(409);',
                '    var err = pm.response.json();',
                '    pm.expect(err.code).to.eql("UAV_TIME_CONFLICT");',
                '});'
            ]
        ),
        make_flow_item(
            '14d. Khách huỷ đơn trùng giờ để dọn sạch dự án kiểm thử',
            'POST',
            '/api/v1/missions/{{flowConflictMissionId}}/cancel',
            token_var='customerToken',
            body={'reason': 'Huỷ đơn phụ sau khi xác minh 409 UAV_TIME_CONFLICT'},
            test_lines=[
                'pm.test("Overlapping test order cancelled 200", function () { pm.response.to.have.status(200); });'
            ]
        ),
        make_flow_item(
            '15. Đội bay bắt đầu chuyến bay mô phỏng',
            'POST',
            '/api/v1/marketplace/provider/orders/{{flowMissionId}}/start',
            token_var='fleetToken',
            test_lines=[
                'pm.test("Order simulation started 200", function () {',
                '    pm.response.to.have.status(200);',
                '    pm.expect(pm.response.json().statusGroup).to.eql("IN_FLIGHT");',
                '});'
            ]
        ),
        make_flow_item(
            '16. Khách theo dõi tiến độ bay mô phỏng trực tuyến',
            'GET',
            '/api/v1/orders/{{flowMissionId}}/tracking',
            token_var='customerToken',
            test_lines=[
                'pm.test("Live tracking 200 with telemetry", function () {',
                '    pm.response.to.have.status(200);',
                '    var trk = pm.response.json();',
                '    pm.expect(trk.statusGroup).to.eql("IN_FLIGHT");',
                '    pm.expect(trk.position).to.be.an("object");',
                '    pm.expect(trk.battery).to.be.a("number");',
                '});'
            ]
        ),
        make_flow_item(
            '17. Đội bay hoàn thành chuyến bay & bàn giao dữ liệu',
            'POST',
            '/api/v1/marketplace/provider/orders/{{flowMissionId}}/complete',
            token_var='fleetToken',
            body={
                'completionNote': 'Bàn giao bình đồ trực giao GeoTIFF — minh hoạ',
                'equipmentCondition': 'Tàu bay và cảm biến hoạt động bình thường'
            },
            test_lines=[
                'pm.test("Order completed 200", function () {',
                '    pm.response.to.have.status(200);',
                '    pm.expect(["DELIVERED", "TO_REVIEW"]).to.include(pm.response.json().statusGroup);',
                '});'
            ]
        ),
        make_flow_item(
            '18. Khách đánh giá 5 sao & kiểm tra đồng bộ rating',
            'PUT',
            '/api/v1/missions/{{flowMissionId}}/review',
            token_var='customerToken',
            body={'rating': 5, 'comment': 'Dữ liệu bàn giao rõ nét, đúng tiến độ dự án.'},
            test_lines=[
                'pm.test("Customer review saved 200", function () { pm.response.to.have.status(200); });'
            ]
        ),
        make_flow_item(
            '19. Kiểm tra providerBadge cập nhật điểm đánh giá trên chợ',
            'GET',
            '/api/v1/public/marketplace/listings/{{flowListingSlug}}',
            test_lines=[
                'pm.test("Listing rating updated & fleet still anonymized", function () {',
                '    pm.response.to.have.status(200);',
                '    var d = pm.response.json();',
                '    var listing = d.listing || d;',
                '    pm.expect(listing.providerDisplayName == null).to.be.true;',
                '    pm.expect(listing.providerSlug == null).to.be.true;',
                '    pm.expect(listing.providerBadge.reviewCount).to.be.at.least(1);',
                '});'
            ]
        ),
        make_flow_item(
            '20. Khách xoá mềm Dự án kiểm thử sau khi đơn kết thúc',
            'DELETE',
            '/api/v1/projects/{{flowProjectId}}',
            token_var='customerToken',
            test_lines=[
                'pm.test("Soft-deleted completed test project 204", function () { pm.response.to.have.status(204); });'
            ]
        )
    ]
}

collection['item'].append(order_flow_folder)

with open(POSTMAN_PATH, 'w', encoding='utf-8') as f:
    json.dump(collection, f, indent=2, ensure_ascii=False)

print(f"Generated {POSTMAN_PATH} successfully!")
print(f"Total Folders: {len(collection['item'])}")
total_reqs = sum(len(f['item']) for f in collection['item'])
print(f"Total Requests: {total_reqs}")
