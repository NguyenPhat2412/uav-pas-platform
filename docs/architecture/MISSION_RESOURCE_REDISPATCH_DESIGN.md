# Điều phối lại operator, trạm và thiết bị

Phạm vi được người dùng yêu cầu ngày 16/10/2026; giữ nguyên auth contract, quyền hiện có và chính sách tiếp nhận operator hiện tại.

- Chỉ điều phối trước bay: CONFIRMED, RESOURCE_RESERVED, READY. Mỗi thay đổi cần lý do 1–500 ký tự và phiên bản dữ liệu đã xem. Màn hình cũ nhận 409, tải lại trước khi thử lại.
- Operator: thay/gỡ; người thay phải thuộc ROLE_OPERATOR, đang hoạt động, không bị khóa và không trùng lịch nhiệm vụ khác chưa kết thúc. Khung giờ liền kề được phép. Khóa các operator theo ID để tuần tự hóa tranh chấp.
- Trạm: thay/gỡ; không tự ý di chuyển hoặc giải phóng UAV/thiết bị. Nếu còn tài nguyên thuộc trạm khác, yêu cầu gỡ UAV/hoàn trả thiết bị trước. Giữ operator. Trạm mới phải hoạt động. Cách này giữ đúng quyền riêng của từng tài nguyên và tránh tác động ngầm.
- Thiết bị: hiển thị từng khoản giữ; đổi thiết bị/số lượng bằng giao dịch hoàn trả khoản cũ và tạo khoản mới; hoặc hoàn trả toàn bộ khoản được chọn. Giảm số lượng dùng cùng thao tác đổi số lượng. Khoản cũ được giữ làm lịch sử. Không lấy số lượng của nhiệm vụ khác; lặp yêu cầu cũ không hoàn trả hai lần.
- Sau thay đổi, đặt lại tiếp nhận/vướng mắc operator, quay về RESOURCE_RESERVED nếu đủ tài nguyên hoặc CONFIRMED nếu thiếu. Không tự chuyển READY. Giữ chính sách chưa bắt buộc operator accept trước READY.
- Khóa mission trước, sau đó UAV/operator và thiết bị theo ID. Kiểm tra lại tài nguyên khi READY và START. Sự kiện, audit và biến động kho nằm trong cùng giao dịch; lỗi bất kỳ phải rollback toàn bộ.
- API mới phục vụ nghiệp vụ: GET dispatch-resources; POST redispatch-operator, redispatch-station, redispatch-equipment. Dùng MISSION_VIEW và các quyền MISSION_ASSIGN_OPERATOR, MISSION_ASSIGN_STATION, MISSION_RESERVE_EQUIPMENT hiện hữu. Không đổi token, refresh, logout, CORS hay chính sách auth.
- Kiểm chứng: kiểm thử hồi quy H2/PostgreSQL, tranh chấp lịch/kho, permission, stale, rollback; trình duyệt với backend PostgreSQL/MinIO dùng riêng; desktop/mobile; đầy đủ lint/typecheck/test/build và Maven test.

Trạm là tài nguyên dùng chung, chưa có quota/chính sách độc quyền theo lịch. Thiết bị được giữ theo số lượng hiện hành, chưa bổ sung lập lịch tồn kho tương lai. Tài nguyên chưa có trạm giữ chính sách dùng chung sẵn có.
