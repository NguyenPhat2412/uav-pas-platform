import type {SolutionDetailEntry} from '@/features/marketing/types/marketing.types';

export type {SolutionDetailEntry};

export const solutionDetails: Record<string, SolutionDetailEntry> = {
    'managed-uav-operations': {
        useCase: 'Tổ chức chiến dịch bay UAV trọn gói có điều phối tập trung: từ khâu lập vùng bay GIS, kiểm tra điều kiện thời tiết, phân bổ UAV – trạm mặt đất – phi công cho đến khi bàn giao dữ liệu.',
        workflow: 'Khách hàng khởi tạo bản nháp nhiệm vụ với vùng bay đa giác/bán kính và thông số kỹ thuật (AGL, GSD, Overlap, Cảm biến). Trung tâm điều phối xác nhận nguồn lực, giữ chỗ thiết bị, phi công nhận lệnh và thực thi chuyến bay dưới sự giám sát telemetry thời gian thực.',
        limitation: 'Mọi nhiệm vụ bay thực địa đều tuân thủ kiểm tra an toàn tiền bay (Pre-flight Checklist), giới hạn sức gió của từng dòng UAV và quy định cấp phép không phận hiện hành.',
        techStack: ['Bản đồ lập kế hoạch GIS', 'Quản lý vòng đời nhiệm vụ 7 bước', 'Định vị GNSS/RTK centimet', 'Kho lưu trữ Signed-URL'],
        algorithms: ['Kiểm tra vùng cấm bay Ray-Casting Geofence', 'Tính toán khoảng cách địa trắc Haversine', 'Đánh giá an toàn pin quay về (Battery RTH Feasibility)'],
        deliverables: ['Nhật ký chuyến bay & Telemetry', 'Bộ ảnh/video gắn tọa độ địa lý', 'Biên bản hoàn thành nhiệm vụ trên cổng'],
    },
    'infrastructure-inspection': {
        useCase: 'Kiểm tra định kỳ hoặc đột xuất hệ thống công trình hạ tầng (cầu cảng, trạm biến áp, đường dây tải điện, trang trại điện mặt trời, đê điều) từ trên cao mà không cần dừng vận hành.',
        workflow: 'Xác định ranh giới công trình và mục tiêu kiểm tra, lựa chọn cảm biến RGB 4K kết hợp Camera Nhiệt hồng ngoại, thiết lập GSD 1,5–3,0 cm/px. Sau khi hoàn tất chuyến bay, khách hàng tra cứu trực tiếp ảnh chụp kèm tọa độ EXIF và báo cáo kiểm tra trên cổng.',
        limitation: 'Hình ảnh và báo cáo khảo sát từ UAV cung cấp dữ liệu trực quan độ phân giải cao hỗ trợ kỹ sư đánh giá hiện trạng, kết hợp cùng quy trình nghiệm thu kỹ thuật chuyên ngành.',
        techStack: ['Camera RGB 4K & Thermal IR', 'Trình xem thông số EXIF & Bản đồ tọa độ ảnh', 'Báo cáo kiểm tra PDF'],
        algorithms: ['Lập lưới quét song song phủ kín bề mặt', 'Kiểm soát độ chồng phủ ảnh (Overlap 60–90%)', 'Đối chiếu tọa độ GPS/RTK từng khung hình'],
        deliverables: ['Bộ ảnh Geotagged độ phân giải cao', 'Ảnh nhiệt phát hiện điểm nóng bất thường', 'Báo cáo tổng hợp kiểm tra hiện trạng (PDF)'],
    },
    'uav-rental': {
        useCase: 'Tổ chức chiến dịch bay UAV trọn gói có điều phối tập trung: từ khâu lập vùng bay GIS, kiểm tra điều kiện thời tiết, phân bổ UAV – trạm mặt đất – phi công cho đến khi bàn giao dữ liệu.',
        workflow: 'Khách hàng khởi tạo bản nháp nhiệm vụ với vùng bay đa giác/bán kính và thông số kỹ thuật (AGL, GSD, Overlap, Cảm biến). Trung tâm điều phối xác nhận nguồn lực, giữ chỗ thiết bị, phi công nhận lệnh và thực thi chuyến bay dưới sự giám sát telemetry thời gian thực.',
        limitation: 'Mọi nhiệm vụ bay thực địa đều tuân thủ kiểm tra an toàn tiền bay (Pre-flight Checklist), giới hạn sức gió của từng dòng UAV và quy định cấp phép không phận hiện hành.',
        techStack: ['Bản đồ lập kế hoạch GIS', 'Quản lý vòng đời nhiệm vụ 7 bước', 'Định vị GNSS/RTK centimet', 'Kho lưu trữ Signed-URL'],
        algorithms: ['Kiểm tra vùng cấm bay Ray-Casting Geofence', 'Tính toán khoảng cách địa trắc Haversine', 'Đánh giá an toàn pin quay về (Battery RTH Feasibility)'],
        deliverables: ['Nhật ký chuyến bay & Telemetry', 'Bộ ảnh/video gắn tọa độ địa lý', 'Biên bản hoàn thành nhiệm vụ trên cổng'],
    },
    'aerial-inspection': {
        useCase: 'Kiểm tra định kỳ hoặc đột xuất hệ thống công trình hạ tầng (cầu cảng, trạm biến áp, đường dây tải điện, trang trại điện mặt trời, đê điều) từ trên cao mà không cần dừng vận hành.',
        workflow: 'Xác định ranh giới công trình và mục tiêu kiểm tra, lựa chọn cảm biến RGB 4K kết hợp Camera Nhiệt hồng ngoại, thiết lập GSD 1,5–3,0 cm/px. Sau khi hoàn tất chuyến bay, khách hàng tra cứu trực tiếp ảnh chụp kèm tọa độ EXIF và báo cáo kiểm tra trên cổng.',
        limitation: 'Hình ảnh và báo cáo khảo sát từ UAV cung cấp dữ liệu trực quan độ phân giải cao hỗ trợ kỹ sư đánh giá hiện trạng, kết hợp cùng quy trình nghiệm thu kỹ thuật chuyên ngành.',
        techStack: ['Camera RGB 4K & Thermal IR', 'Trình xem thông số EXIF & Bản đồ tọa độ ảnh', 'Báo cáo kiểm tra PDF'],
        algorithms: ['Lập lưới quét song song phủ kín bề mặt', 'Kiểm soát độ chồng phủ ảnh (Overlap 60–90%)', 'Đối chiếu tọa độ GPS/RTK từng khung hình'],
        deliverables: ['Bộ ảnh Geotagged độ phân giải cao', 'Ảnh nhiệt phát hiện điểm nóng bất thường', 'Báo cáo tổng hợp kiểm tra hiện trạng (PDF)'],
    },
    'ai-detection': {
        useCase: 'Hỗ trợ đội vận hành và chỉ huy nhận diện nhanh đối tượng (người, phương tiện, dấu hiệu bất thường) trên luồng hình ảnh thu từ UAV thông qua bộ tăng tốc AI tại biên AMD Xilinx Kria KV260.',
        workflow: 'Bo mạch Kria KV260 thực thi mô hình YOLOv8s ngay trên UAV và gửi các khung phát hiện (Bounding Boxes kèm điểm tin cậy) cùng thông số DPU, FPS, nhiệt độ SoC về Buồng lái AI Viewfinder để con người kiểm duyệt và xác minh (Human-in-the-loop).',
        limitation: 'Mọi phát hiện từ mô hình AI đều đóng vai trò gợi ý kỹ thuật và bắt buộc phải được điều phối viên hoặc chỉ huy xác minh trước khi đưa ra quyết định điều hành.',
        techStack: ['Bo mạch biên AMD Xilinx Kria KV260', 'Mô hình thị giác máy tính YOLOv8s', 'Khung ngắm AI Viewfinder & Giám sát DPU/FPS/SoC'],
        algorithms: ['Lọc ngưỡng độ tin cậy động (Confidence Thresholding)', 'Ánh xạ tọa độ phát hiện lên bản đồ chiến thuật', 'Cơ chế xác minh mục tiêu hai chiều (Human-Verified AI)'],
        deliverables: ['Danh sách phát hiện AI đã xác minh kèm nhãn thời gian', 'Tọa độ mục tiêu trên bản đồ tác chiến', 'Thống kê hiệu năng suy luận phần cứng biên KV260'],
    },
    'search-and-rescue': {
        useCase: 'Hỗ trợ ban chỉ huy và đội ứng phó được cấp phép tổ chức tìm kiếm mục tiêu mất dấu trên địa hình phức tạp bằng đường bay chuẩn quốc tế IAMSAR kết hợp cảm biến nhiệt và AI.',
        workflow: 'Từ tọa độ vị trí nhìn thấy cuối cùng (Last Known Position – LKP), hệ thống tự động tính toán lộ trình bay xoắn ốc mở rộng (IAMSAR Expanding Square), giám sát trực tiếp telemetry UAV trên bản đồ chiến thuật và phát lệnh cứu nạn khẩn cấp qua Webhook khi mục tiêu được xác nhận.',
        limitation: 'Giải pháp phục vụ điều phối chuyên môn cho các đơn vị được cấp phép. Trong tình huống khẩn cấp dân sự, luôn liên hệ trực tiếp tổng đài cứu hộ địa phương.',
        techStack: ['Buồng lái tác chiến SAR Cockpit', 'Bản đồ chiến thuật SarTacticalMap', 'Màn hình thông số bay UavTelemetryHud', 'Hệ thống Webhook khẩn cấp'],
        algorithms: ['Thuật toán sinh đường bay IAMSAR Expanding Square', 'Tính toán khoảng cách & phương vị Haversine', 'Kiểm tra an toàn pin khẩn cấp RTH & Geofence'],
        deliverables: ['Kế hoạch đường bay tìm kiếm IAMSAR (Waypoints)', 'Bản đồ vùng tìm kiếm & vị trí mục tiêu đã xác minh', 'Sự kiện điều phối cứu nạn SAR_EMERGENCY_TRIGGERED'],
    },
};
