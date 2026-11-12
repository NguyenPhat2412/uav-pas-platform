-- V24: UAV Training & SOP Academy across Customer, Operations, and Admin portals

CREATE TABLE IF NOT EXISTS training_documents (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(40) NOT NULL UNIQUE,
    slug VARCHAR(140) NOT NULL UNIQUE,
    target_portal VARCHAR(20) NOT NULL,
    category VARCHAR(40) NOT NULL,
    level VARCHAR(25) NOT NULL,
    version_tag VARCHAR(25) NOT NULL DEFAULT 'SOP-2026.1',
    estimated_minutes INT NOT NULL DEFAULT 15,
    is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    title VARCHAR(220) NOT NULL,
    summary VARCHAR(500) NOT NULL,
    content_markdown TEXT NOT NULL,
    checklist_json TEXT NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_docs_portal_active
    ON training_documents (target_portal, active, sort_order);

CREATE TABLE IF NOT EXISTS user_training_progress (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id BIGINT NOT NULL REFERENCES training_documents(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    checked_steps_json TEXT NOT NULL DEFAULT '[]',
    last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_training_progress UNIQUE (user_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_user_training_progress_user
    ON user_training_progress (user_id, status);

-- ============================================================================
-- 1. SEED DATA: CỔNG KHÁCH HÀNG (CUSTOMER PORTAL)
-- ============================================================================
INSERT INTO training_documents (
    code, slug, target_portal, category, level, version_tag,
    estimated_minutes, is_mandatory, sort_order, active,
    title, summary, content_markdown, checklist_json
) VALUES
(
    'TRN-CUST-01',
    'quy-trinh-dat-lich-va-chuan-bi-hien-truong-bay-uav',
    'CUSTOMER',
    'SITE_PREP',
    'MANDATORY',
    'SOP-2026.1',
    15,
    TRUE,
    10,
    TRUE,
    'Quy trình Đặt lịch & Chuẩn bị Hiện trường Bay UAV An toàn',
    'Hướng dẫn chuẩn bị mặt bằng cất/hạ cánh, khoanh vùng đa giác khảo sát trên bản đồ và phối hợp an toàn với tổ bay tại hiện trường.',
    '## 1. Mục tiêu quy trình
Tài liệu này hướng dẫn Chủ đầu tư và Kỹ sư hiện trường phía Khách hàng chuẩn bị đầy đủ thông tin tọa độ, vùng khảo sát và điều kiện an toàn mặt đất trước khi gửi yêu cầu nhiệm vụ bay (`PENDING_CONFIRMATION`).

## 2. Tiêu chuẩn khoanh vùng khu vực bay (Flight Polygon)
- **Độ rộng vùng đệm (Buffer Zone):** Khi vẽ đa giác khu vực bay trên công cụ **Bản đồ Khu vực Bay**, hãy mở rộng biên thêm tối thiểu `15m – 25m` quanh ranh giới công trình để đảm bảo ảnh chụp biên đạt độ phủ chồng (`Overlap`) chuẩn.
- **Khu vực Cất / Hạ cánh (Takeoff / Landing Pad):**
  - Diện tích mặt phẳng tối thiểu `3m × 3m`, bề mặt cứng, không có bụi đá rời hoặc dây điện tầm thấp trong bán kính `10m`.
  - Tránh đặt điểm cất cánh gần trạm biến áp cao thế, kết cấu thép lớn hoặc ан-ten phát sóng vi ba gây nhiễu la bàn từ (`Magnetometer`).

## 3. Bảng thông số kiểm tra hiện trường trước giờ bay
| Hạng mục | Yêu cầu tiêu chuẩn | Xử lý khi chưa đạt |
| :--- | :--- | :--- |
| Vật cản tầm thấp | Xác định độ cao cây cối, cần cẩu, đường dây điện cao nhất | Ghi rõ độ cao vật cản vào mục **Ghi chú vận hành** |
| Đầu mối liên hệ hiện trường | Có nhân sự trực điện thoại trước giờ bay `30 phút` | Cập nhật trong **Hồ sơ Doanh nghiệp -> Liên hệ khẩn cấp** |
| Mốc khống chế mặt đất (GCP) | Rải tối thiểu `5 mốc GCP` với khảo sát địa hình độ chính xác cao | Báo trước cho Điều phối viên để đồng bộ tọa độ RTK |

## 4. Lưu ý an toàn bắt buộc
- Không tự ý di chuyển vào bán kính `5m` quanh điểm hạ cánh khi UAV đang trong giai đoạn **Return-to-Home (RTH)** hoặc hạ độ cao.',
    '["Đã khoanh vùng đa giác bay kèm vùng đệm tối thiểu 15m trên bản đồ","Đã xác nhận vị trí bãi cất/hạ cánh 3m x 3m thông thoáng, cách xa đường dây điện","Đã ghi chú chiều cao vật cản cao nhất (cần cẩu, cột phát sóng) trong khu vực","Đã cập nhật số điện thoại người phụ trách đón tổ bay tại hiện trường"]'
),
(
    'TRN-CUST-02',
    'huong-dan-chon-cam-bien-do-cao-bay-va-do-phan-giai-gsd',
    'CUSTOMER',
    'SENSOR_GSD',
    'STANDARD_SOP',
    'SOP-2026.1',
    20,
    TRUE,
    20,
    TRUE,
    'Hướng dẫn Chọn Cảm biến UAV, Độ cao AGL & Độ phân giải GSD',
    'Cách lựa chọn tổ hợp cảm biến (RGB, Nhiệt hồng ngoại, Đa phổ, LiDAR) và thiết lập thông số GSD, Overlap phù hợp với mục tiêu khảo sát.',
    '## 1. Giải thích chỉ số GSD (Ground Sampling Distance)
**GSD (`cm/pixel`)** là khoảng cách thực tế trên mặt đất tương ứng với 1 điểm ảnh thu được:
- **GSD càng nhỏ** (`1.0 – 2.0 cm/px`): Ảnh càng sắc nét, phát hiện được vết nứt bê tông nhỏ, ốc vít gỉ sét nhưng thời gian bay lâu hơn và dung lượng tệp lớn hơn.
- **GSD trung bình** (`2.5 – 5.0 cm/px`): Tối ưu cho lập bản đồ trực giao diện rộng (`Orthomosaic`), tính toán khối lượng đào đắp (`Cut/Fill`).

## 2. Ma trận lựa chọn cảm biến theo nghiệp vụ
| Loại cảm biến | Mã kỹ thuật | Ứng dụng khuyến nghị | Độ cao AGL chuẩn |
| :--- | :--- | :--- | :--- |
| **Camera Quang học Độ phân giải cao** | `RGB` | Bản đồ trực giao 2D, mô hình 3D công trình, tiến độ thi công | `60m – 100m` |
| **Camera Nhiệt Hồng ngoại** | `THERMAL` | Kiểm tra tấm pin mặt trời (Hotspot), rò rỉ nhiệt đường ống, cứu nạn ban đêm | `35m – 60m` |
| **Cảm biến Đa phổ** | `MULTISPECTRAL` | Đánh giá chỉ số sinh trưởng thực vật (`NDVI`, `NDRE`), sức khỏe cây trồng | `50m – 80m` |
| **Quét Laser LiDAR** | `LIDAR` | Mô hình số độ cao xuyên tán cây (`DTM`), hành lang lưới điện cao thế | `50m – 90m` |

## 3. Quy chuẩn Độ phủ ảnh (Front Overlap / Side Overlap)
- **Địa hình bằng phẳng / Công trình thông thường:** Front Overlap `75%` · Side Overlap `65%`.
- **Dựng mô hình 3D chi tiết / Khu vực nhiều nhà cao tầng:** Front Overlap `80% – 85%` · Side Overlap `75%`.',
    '["Đã đối chiếu loại cảm biến (RGB / Thermal / Multispectral / LiDAR) đúng với mục tiêu đầu ra","Đã chọn chỉ số GSD phù hợp (1.5 cm/px cho kiểm tra chi tiết hoặc 3–5 cm/px cho khảo sát diện rộng)","Đã thiết lập độ phủ ảnh Front/Side Overlap tối thiểu 75%/65% cho bình sai 3D","Đã kiểm tra thời lượng bay dự kiến so với hạn mức giờ bay khả dụng của gói cước"]'
),
(
    'TRN-CUST-03',
    'khai-thac-va-nghiem-thu-du-lieu-ban-giao-uav',
    'CUSTOMER',
    'DATA_DELIVERY',
    'FUNDAMENTAL',
    'SOP-2026.1',
    18,
    FALSE,
    30,
    TRUE,
    'Khai thác & Nghiệm thu Dữ liệu Bàn giao (Orthomosaic, DSM & 3D)',
    'Hướng dẫn kiểm tra chất lượng tệp bàn giao trên cổng Khách hàng, đọc thông số EXIF/GPS và sử dụng tệp GeoTIFF/LAS trong phần mềm GIS/CAD.',
    '## 1. Các định dạng dữ liệu bàn giao trên hệ thống
Sau khi nhiệm vụ chuyển sang trạng thái **Hoàn thành (`COMPLETED`)**, toàn bộ tệp kết quả được lưu trữ bảo mật và tải qua liên kết ký số (`Signed URL`) tại tab **Bàn giao kết quả**:
1. **Bản đồ trực giao (`Orthomosaic - .tif / GeoTIFF`):** Đã hiệu chỉnh hình học và gắn hệ tọa độ chuẩn (`WGS84 / VN-2000`).
2. **Mô hình số bề mặt (`DSM / DTM - .tif`):** Phục vụ đo cao độ, tính độ dốc và thể tích san lấp.
3. **Đám mây điểm 3D (`Point Cloud - .las / .laz`):** Tương thích trực tiếp với AutoCAD Civil 3D, ArcGIS Pro, QGIS và CloudCompare.
4. **Bộ ảnh gốc kèm tọa độ RTK (`RAW Geo-tagged Images`):** Tích hợp siêu dữ liệu EXIF (Vĩ độ, Kinh độ, Độ cao tuyệt đối, Góc Gimbal).

## 2. Quy trình nghiệm thu 3 bước trên Cổng Khách hàng
- **Bước 1:** Mở chi tiết nhiệm vụ → Chọn tab **Bàn giao kết quả** để xem trước ảnh trực tiếp trên trình duyệt và kiểm tra tọa độ chụp (`EXIF Inspector`).
- **Bước 2:** Kiểm tra **Ghi chú bàn giao (`Completion Note`)** và tình trạng thiết bị từ tổ bay.
- **Bước 3:** Tải về tệp kết quả qua nút tải bảo mật và đối chiếu hóa đơn tại mục **Gói cước & Hóa đơn**.',
    '["Đã nắm rõ các định dạng tệp đầu ra (GeoTIFF, LAS/LAZ, JPEG RTK EXIF)","Đã biết cách xem trước ảnh và kiểm tra tọa độ chụp ngay trên tab Bàn giao kết quả","Đã hiểu quy trình đối chiếu biên bản bàn giao và thanh toán hóa đơn VietQR"]'
),
(
    'TRN-CUST-04',
    'quy-dinh-an-toan-khong-phan-va-chinh-sach-sla-thoi-tiet',
    'CUSTOMER',
    'EMERGENCY_SAFETY',
    'FUNDAMENTAL',
    'SOP-2026.1',
    12,
    FALSE,
    40,
    TRUE,
    'Quy định An toàn Không phận, Ngưỡng Thời tiết & Chính sách SLA',
    'Tiêu chuẩn an toàn khí tượng (tốc độ gió, lượng mưa, chỉ số KP địa từ) và quy trình dời lịch bay miễn phí khi thời tiết vượt ngưỡng an toàn.',
    '## 1. Ngưỡng thời tiết an toàn của đội bay UAV
Hệ thống tích hợp trực tiếp dữ liệu khí tượng tại tọa độ nhiệm vụ (tab **Thời tiết khu vực**). Chuyến bay chỉ được phép cất cánh khi thỏa mãn đồng thời các điều kiện:
- **Tốc độ gió (Wind Speed):** Không vượt quá ngưỡng tối đa của dòng máy bay (thông thường `≤ 10.5 m/s` hoặc `≤ 38 km/h`).
- **Gió giật (Wind Gust):** Không vượt quá `12.0 m/s`.
- **Lượng mưa & Tầm nhìn:** Không có mưa tại hiện trường; tầm nhìn ngang tối thiểu `> 3 km`.

## 2. Chính sách bảo류 hạn mức & dời lịch khi thời tiết xấu
- Khi thời tiết tại hiện trường vượt ngưỡng an toàn, Điều phối viên sẽ thông báo chuyển lịch trình mà **không trừ giờ bay trong hạn mức gói cước (`Quota`)** của khách hàng.
- Đối với nhiệm vụ **Khẩn cấp (`URGENT`)**, trung tâm chỉ huy sẽ ưu tiên điều động dòng UAV kháng gió cấp cao từ trạm gần nhất.',
    '["Đã nắm rõ ngưỡng gió an toàn tối đa (10.5 m/s) và điều kiện tầm nhìn > 3 km","Đã biết cách theo dõi dự báo khí tượng trực tiếp tại tab Thời tiết của từng nhiệm vụ","Đã hiểu chính sách bảo lưu 100% hạn mức giờ bay khi hoãn bay vì lý do an toàn thời tiết"]'
),

-- ============================================================================
-- 2. SEED DATA: CỔNG ĐIỀU HÀNH (OPERATIONS PORTAL)
-- ============================================================================
(
    'TRN-OPS-01',
    'quy-trinh-kiem-tra-truoc-trong-va-sau-chuyen-bay-sop',
    'OPERATIONS',
    'FLIGHT_SOP',
    'MANDATORY',
    'SOP-2026.2',
    25,
    TRUE,
    10,
    TRUE,
    'Quy trình Kiểm tra Trước – Trong – Sau Chuyến bay (Flight Ops Checklist SOP)',
    'Quy chuẩn bắt buộc dành cho Phi công UAV (Operator) và Tổ bay trước khi chuyển trạng thái nhiệm vụ từ READY sang IN_PROGRESS.',
    '## 1. Kiểm tra kỹ thuật trước khi cất cánh (Pre-Flight Inspection)
Phi công vận hành (`Operator`) bắt buộc thực hiện kiểm tra vật lý và điện tử tại hiện trường trước khi bấm **Bắt đầu bay (`START`)**:
1. **Khung thân & Cánh quạt (Airframe & Propellers):**
   - Kiểm tra khớp khóa cánh tay đòn, ốc cố định motor và bề mặt cánh quạt (tuyệt đối không bay nếu cánh có vết nứt chân chim hoặc mẻ cạnh).
2. **Hệ thống Năng lượng (LiPo Smart Battery):**
   - Dung lượng pin khởi hành đạt `≥ 95%`; độ lệch điện áp giữa các cell (`Cell Voltage Delta`) không vượt quá `0.05V`; nhiệt độ pin trong ngưỡng `20°C – 40°C`.
3. **Định vị Vệ tinh, La bàn & Liên kết Điều khiển:**
   - Số lượng vệ tinh GNSS/RTK đạt `≥ 16 satellites` (trạng thái `RTK FIX` đối với bay khảo sát bản đồ).
   - Thiết lập độ cao **Return-to-Home (RTH Altitude)** cao hơn vật cản cao nhất tại hiện trường tối thiểu `20m`.

## 2. Giám sát trong chuyến bay (In-Flight Monitoring)
- Theo dõi liên tục tốc độ gió, dòng xả pin và độ trễ gói tin Telemetry (`Age < 3s`).
- Khi pin chạm mốc cảnh báo cấp 1 (`30%`), chuẩn bị phương án thu hồi; chạm mốc cấp 2 (`20%`), thực thi hạ cánh bắt buộc.

## 3. Nghiệm thu sau chuyến bay (Post-Flight Handover)
- Kiểm tra nhiệt độ động cơ, tháo pin an toàn, tải toàn bộ dữ liệu ảnh/video và ghi nhận **Tình trạng thiết bị (`Equipment Condition`)** khi hoàn tất nhiệm vụ.',
    '["Đã kiểm tra khóa cánh quạt, khung gầm, gimbal cảm biến và thẻ nhớ tốc độ cao","Đã xác nhận điện áp từng cell pin cân bằng (Delta < 0.05V) và dung lượng >= 95%","Đã khóa tín hiệu GNSS/RTK (>= 16 vệ tinh) và ghi điểm Home Point chính xác","Đã cài đặt độ cao RTH cao hơn vật cản cao nhất trong bán kính nhiệm vụ tối thiểu 20m","Đã tải dữ liệu Media và cập nhật ghi chú tình trạng thiết bị sau khi hạ cánh"]'
),
(
    'TRN-OPS-02',
    'van-hanh-buong-lai-tim-kiem-cuu-nan-sar-cockpit-va-ai-bien',
    'OPERATIONS',
    'SAR_TACTICAL',
    'ADVANCED_TACTICAL',
    'SOP-2026.2',
    25,
    TRUE,
    20,
    TRUE,
    'Vận hành Buồng lái Tìm kiếm Cứu nạn (SAR Cockpit) & Xác thực AI KV260',
    'Quy trình điều hành lưới bay tìm kiếm (Search Grid), giám sát luồng suy luận AI trên bộ xử lý biên KV260 và điều động đội cứu hộ.',
    '## 1. Kiến trúc Buồng lái Tác chiến SAR (`/operations/sar-cockpit`)
Phân hệ **SAR Cockpit** kết nối trực tiếp luồng Telemetry thời gian thực của đội bay với bộ xử lý AI biên (`AMD Xilinx Kria KV260`) để phát hiện người mất tích, đám cháy hoặc phương tiện gặp nạn.

## 2. Quy trình 4 bước xử lý phát hiện AI (`AI Detection Verification`)
| Bước | Trạng thái SAR | Hành động của Điều hành viên |
| :--- | :--- | :--- |
| **1. Quét lưới** | `SEARCHING` | Giám sát đường bay zíc-zắc (`Lawnmower Grid`) và độ phủ camera nhiệt/quang học |
| **2. Cảnh báo AI** | `AI_CANDIDATE` | Khi AI phát hiện đối tượng với độ tin cậy `Confidence ≥ 0.75`, kiểm tra khung hình cắt (`Bounding Box`) và tọa độ GPS |
| **3. Xác thực** | `TARGET_LOCATED` | Bấm **Xác nhận phát hiện (`VERIFY`)** nếu đúng mục tiêu thật, hoặc **Loại bỏ (`FALSE_POSITIVE`)** nếu là nhiễu ảnh |
| **4. Cứu nạn** | `RESCUE_DISPATCHED` | Phát lệnh **Điều động Cứu hộ (`Dispatch Rescue`)** kèm tọa độ chính xác cho đội ứng cứu mặt đất |

## 3. Lưu ý chiến thuật khi bay đêm / sương mù
- Chuyển chế độ hiển thị cảm biến nhiệt sang bảng màu **White-Hot** hoặc **Ironbow** để tách biệt thân nhiệt mục tiêu với nền đất lạnh.',
    '["Đã nắm vững cách thiết lập đường bay quét lưới tìm kiếm (Search Grid) theo bán kính vùng nạn","Đã thực hành quy trình kiểm tra độ tin cậy AI (Confidence) và xác nhận/loại bỏ cảnh báo giả","Đã nắm rõ thao tác khóa tọa độ TARGET_LOCATED và phát lệnh điều động đội cứu hộ hiện trường"]'
),
(
    'TRN-OPS-03',
    'quy-trinh-dieu-phoi-phan-bo-tram-uav-to-bay-va-redispatch',
    'OPERATIONS',
    'FLIGHT_SOP',
    'STANDARD_SOP',
    'SOP-2026.1',
    20,
    TRUE,
    30,
    TRUE,
    'Quy trình Điều phối Trạm – UAV – Phi công & Đổi Thiết bị (Redispatch)',
    'Hướng dẫn dành cho Điều phối viên (Dispatcher) khi thẩm định yêu cầu bay, gán tài nguyên không trùng lịch và điều phối lại khi có sự cố.',
    '## 1. Quy trình thẩm định và xác nhận nhiệm vụ (`Dispatch Workflow`)
Khi khách hàng gửi yêu cầu nhiệm vụ (`PENDING_CONFIRMATION`), Điều phối viên thực hiện tại `/operations/dispatch/missions`:
1. **Kiểm tra tính khả thi kỹ thuật:** Đối chiếu đa giác khu vực bay, thời gian bắt đầu/kết thúc dự kiến và loại cảm biến yêu cầu.
2. **Phân bổ 4 nhóm tài nguyên bắt buộc:**
   - **Trạm điều hành (`Assign Station`):** Chọn trạm có khoảng cách gần khu vực nhiệm vụ nhất.
   - **Tàu bay (`Assign UAV`):** Chọn UAV đang ở trạng thái `AVAILABLE` có hỗ trợ tải trọng cảm biến tương ứng.
   - **Phi công (`Assign Operator`):** Hệ thống tự động kiểm tra xung đột lịch (`Operator Availability`) trong khung giờ nhiệm vụ.
   - **Thiết bị phụ trợ (`Reserve Equipment`):** Đặt giữ pin dự phòng, trạm RTK Base, bộ đàm từ kho (`Inventory`).

## 2. Quy trình Đổi Tài nguyên Khẩn cấp (`Resource Redispatch`)
- Khi UAV hoặc Phi công gặp sự cố đột xuất trước giờ bay, sử dụng công cụ **Điều phối lại (`ResourceRedispatch`)** ngay trong trang Chi tiết nhiệm vụ và bắt buộc nhập **Lý do điều chuyển** để ghi vào dòng thời gian kiểm toán (`Mission Timeline`).',
    '["Đã nắm rõ trình tự phân bổ Trạm -> UAV -> Phi công -> Thiết bị kho trước khi bấm Xác nhận (CONFIRM)","Đã biết cách sử dụng bộ kiểm tra xung đột lịch tự động của Phi công và UAV","Đã nắm quy trình Đổi tài nguyên (Redispatch) kèm ghi chú kiểm toán khi phát sinh sự cố thiết bị"]'
),
(
    'TRN-OPS-04',
    'giao-thuc-xu-ly-tinh-huong-khan-cap-lost-link-low-battery-flyaway',
    'OPERATIONS',
    'EMERGENCY_SAFETY',
    'MANDATORY',
    'SOP-2026.2',
    20,
    TRUE,
    40,
    TRUE,
    'Giao thức Xử lý Tình huống Khẩn cấp: Mất sóng, Pin yếu & Sự cố Động cơ',
    'Quy trình ứng phó tức thời khi mất kết nối điều khiển (Lost C2 Link), nhiễu GNSS/スポofing, tụt áp pin đột ngột hoặc hỏng hệ thống đẩy.',
    '## 1. Tình huống 1: Mất kết nối Điều khiển / Telemetry (`Lost C2 Link`)
- **Cơ chế tự động của UAV:** Sau `3 giây` mất sóng RC/4G, bộ điều khiển bay tự động kích hoạt chế độ **Failsafe Return-to-Home (RTH)** theo độ cao an toàn đã cài đặt.
- **Hành động của Phi công:**
  1. Giữ nguyên vị trí trạm điều khiển, hướng thẳng ăng-ten phẳng của bộ điều khiển về phía tọa độ cuối cùng của UAV trên bản đồ.
  2. Không tắt bộ điều khiển từ xa (vì tắt RC sẽ ngăn kết nối lại khi UAV bay về vùng phủ sóng).

## 2. Tình huống 2: Nhiễu hoặc Mất tín hiệu Vệ tinh (`GNSS Degraded / Spoofing`)
- Khi số vệ tinh tụt xuống `< 8` hoặc UAV chuyển sang chế độ `ATTI (Attitude Mode - trôi theo chiều gió)`:
  - Lập tức ngắt chế độ bay tự động theo lộ trình (`Waypoint Mission`), chuyển sang điều khiển tay, đưa UAV bay ngược chiều gió về điểm hạ cánh gần nhất có tầm nhìn trực tiếp (`VLOS`).

## 3. Tình huống 3: Sự cố dừng nhiệm vụ & Lập biên bản (`Mission Fail Protocol`)
- Chuyển trạng thái nhiệm vụ sang `FAILED`, ghi rõ mã nguyên nhân (`WEATHER_ABORT`, `BATTERY_CRITICAL`, `SIGNAL_INTERFERENCE`, `HARDWARE_FAULT`) và tạo lệnh kiểm tra bảo dưỡng (`Maintenance Order`) cho UAV đó.',
    '["Đã thuộc quy trình xử lý trong 10 giây đầu khi mất kết nối C2 Link (hướng ăng-ten, giữ mở RC)","Đã nắm kỹ thuật thu hồi UAV ở chế độ ATTI khi bị nhiễu vệ tinh GNSS","Đã nắm quy trình chuyển trạng thái nhiệm vụ sang FAILED và khóa UAV để chuyển sang bộ phận Bảo trì"]'
),
(
    'TRN-OPS-05',
    'quy-chuan-bao-tri-dinh-ky-uav-va-quan-ly-kho-thiet-bi',
    'OPERATIONS',
    'MAINTENANCE',
    'STANDARD_SOP',
    'SOP-2026.1',
    18,
    FALSE,
    50,
    TRUE,
    'Quy chuẩn Bảo trì Định kỳ Đội bay (50h/100h) & Quản lý Kho Thiết bị',
    'Hướng dẫn lập lịch bảo dưỡng phòng ngừa, kiểm định chu kỳ sạc/xả pin thông minh và đối soát tồn kho thiết bị tại các trạm.',
    '## 1. Chu kỳ bảo dưỡng phòng ngừa theo giờ bay
Hệ thống tự động cộng dồn số giờ bay thực tế của từng UAV để cảnh báo bảo trì tại `/operations/maintenance`:
- **Bảo dưỡng cấp 1 (Mỗi `50 giờ bay` hoặc `3 tháng`):**
  - Vệ sinh cảm biến tầm nhìn (`Vision Sensors`), kiểm tra độ rơ trục motor, siết lực ốc khung carbon, cập nhật firmware ổn định.
- **Bảo dưỡng cấp 2 (Mỗi `100 giờ bay` hoặc `6 tháng`):**
  - Thay mới toàn bộ bộ cánh quạt tiêu chuẩn, hiệu chuẩn chuyên sâu IMU & Gimbal trên bàn cân bằng, đo nội trở (`Internal Resistance`) toàn bộ các bộ pin.

## 2. Quy tắc loại biên Pin LiPo Thông minh
- Ngưng sử dụng cho nhiệm vụ bay thực tế và chuyển sang pin tập huấn trên mặt đất khi pin có một trong các dấu hiệu:
  - Số chu kỳ sạc vượt quá `200 cycles`.
  - Pin có hiện tượng phồng cơ học hoặc độ lệch điện áp cell `> 0.10V` sau khi sạc đầy.',
    '["Đã nắm rõ mốc bảo dưỡng định kỳ Cấp 1 (50 giờ bay) và Cấp 2 (100 giờ bay)","Đã nắm tiêu chuẩn kiểm tra nội trở và giới hạn 200 chu kỳ sạc của pin LiPo","Đã biết cách tạo Lệnh bảo trì / Sửa chữa và cập nhật trạng thái UAV về AVAILABLE sau nghiệm thu"]'
),

-- ============================================================================
-- 3. SEED DATA: CỔNG QUẢN TRỊ (ADMIN PORTAL)
-- ============================================================================
(
    'TRN-ADM-01',
    'quan-tri-phan-quyen-rbac-ma-tran-vai-tro-va-bao-mat-2fa',
    'ADMIN',
    'RBAC_SECURITY',
    'MANDATORY',
    'SOP-2026.1',
    20,
    TRUE,
    10,
    TRUE,
    'Quản trị Phân quyền RBAC, Ma trận Vai trò & Chính sách Bảo mật 2FA/OTP',
    'Tiêu chuẩn cấp quyền tối thiểu (Least Privilege), sử dụng Role Templates để đồng bộ quyền hàng loạt và giám sát an toàn tài khoản.',
    '## 1. Kiến trúc Phân quyền 2 Lớp của Hệ thống UAV PAS
Hệ thống quản lý quyền truy cập thông qua mô hình kết hợp giữa **Mẫu vai trò (`Role Templates`)** và **Quyền chi tiết trên từng người dùng (`User Permissions`)**:
1. **Ma trận Vai trò (`/admin/access-control/role-matrix`):** Quy định tập quyền mặc định cho từng vai trò (`SUPER_ADMIN`, `SYSTEM_ADMIN`, `OPERATOR`, `CUSTOMER`).
2. **Ghi đè quyền cá nhân (`/admin/users/[id]`):** Cho phép cấp thêm hoặc thu hồi quyền đặc thù (ví dụ cấp thêm quyền `MISSION_VIEW` và `BILLING_VIEW` cho tài khoản Admin cần kiểm thử luồng đặt dịch vụ ở Cổng Khách hàng qua bộ chuyển cổng **Portal Switcher**).

## 2. Quy chuẩn Bảo mật Tài khoản Quản trị & Điều hành
- Mọi tài khoản thuộc nhóm `SUPER_ADMIN`, `SYSTEM_ADMIN` và `OPERATOR` bắt buộc kích hoạt **Bảo mật 2 lớp (`2FA` qua Google Authenticator TOTP hoặc Email OTP)**.
- Khi nhân sự chuyển bộ phận hoặc nghỉ việc, Quản trị viên phải chuyển trạng thái tài khoản sang `INACTIVE` / `LOCKED` ngay lập tức và kiểm tra lịch sử phiên hoạt động trong **Nhật ký Kiểm toán (`Audit Logs`)**.',
    '["Đã nắm rõ sự khác biệt giữa Mẫu vai trò (Role Templates) và Quyền ghi đè trên từng tài khoản","Đã hiểu cách dùng bộ chuyển cổng (Portal Switcher) trên Topbar khi tài khoản có quyền đa cổng","Đã xác nhận bật bảo mật 2 lớp (2FA TOTP / Email OTP) cho các tài khoản Quản trị viên"]'
),
(
    'TRN-ADM-02',
    'quan-tri-danh-muc-dich-vu-uav-goi-han-muc-quota-va-doi-soat-thanh-toan',
    'ADMIN',
    'BILLING_QUOTA',
    'STANDARD_SOP',
    'SOP-2026.1',
    20,
    TRUE,
    20,
    TRUE,
    'Quản trị Danh mục Dịch vụ UAV, Gói Hạn mức (Quota) & Đối soát Thanh toán',
    'Hướng dẫn cấu hình thông số kỹ thuật dịch vụ (cảm biến, GSD, SLA), điều chỉnh hạn mức giờ bay doanh nghiệp và đối soát VietQR/IPN.',
    '## 1. Cấu hình Danh mục Dịch vụ UAV (`/admin/services`)
Mỗi dịch vụ mở trên Cổng Khách hàng đều gắn liền với bộ thông số kỹ thuật chuẩn để tự động gợi ý kế hoạch bay:
- **Thông số SLA:** Thời lượng bay mặc định (`phút`), cam kết thời gian có mặt tại hiện trường (`On-site Hours`) và thời gian bàn giao dữ liệu (`Delivery Hours`).
- **Thông số Kỹ thuật:** Danh sách cảm biến hỗ trợ (`RGB`, `THERMAL`, `MULTISPECTRAL`, `LIDAR`), độ phân giải `GSD tốt nhất (cm/px)`, diện tích khảo sát tối đa (`ha`) và ngưỡng gió an toàn (`m/s`).

## 2. Quản lý Hạn mức (`Customer Quota`) & Đối soát Hóa đơn (`/admin/billing`)
- Khi khách hàng thanh toán hóa đơn gói cước qua **VietQR / NAPAS 247**, cổng thanh toán gửi tín hiệu IPN (`POST /api/v1/billing/webhook/payment-ipn`) để tự động kích hoạt chu kỳ hạn mức mới.
- Trong trường hợp khách hàng doanh nghiệp thanh toán theo hợp đồng chuyển khoản kho bạc/ngân hàng truyền thống, Quản trị viên kiểm tra chứng từ và xác nhận thu tiền trực tiếp trên trang Quản lý Thanh toán.',
    '["Đã nắm quy trình cập nhật thông số SLA và cảm biến cho từng gói dịch vụ tại /admin/services","Đã hiểu cơ chế trừ/hoàn hạn mức giờ bay tự động theo vòng đời nhiệm vụ","Đã nắm quy trình đối soát hóa đơn VietQR và điều chỉnh hạn mức doanh nghiệp tại /admin/billing"]'
),
(
    'TRN-ADM-03',
    'van-hanh-ha-tang-telemetry-webhook-hmac-ai-router-va-audit-logs',
    'ADMIN',
    'INFRA_TELEMETRY',
    'ADVANCED_TACTICAL',
    'SOP-2026.2',
    22,
    FALSE,
    30,
    TRUE,
    'Vận hành Hạ tầng Telemetry, Webhook HMAC, AI Router & Kiểm toán Hệ thống',
    'Quy trình giám sát sức khỏe dịch vụ (/admin/system-health), cấu hình Webhook ký số HMAC-SHA256 và điều phối cổng AI Router.',
    '## 1. Giám sát Sức khỏe Hệ thống (`/admin/system-health`)
Trang **Sức khỏe Hệ thống** kiểm tra thời gian thực độ trễ (`Latency ms`) và trạng thái (`UP / DEGRADED / DOWN`) của các thành phần cốt lõi:
- Cơ sở dữ liệu PostgreSQL, Bộ nhớ đệm & Hàng đợi sự kiện, Luồng Telemetry đội bay và Cổng kết nối AI Router.

## 2. Bảo mật Tích hợp Webhook Sự kiện (`/admin/webhooks`)
- Khi tích hợp sự kiện nhiệm vụ/hóa đơn sang hệ thống ERP của đối tác, mỗi gói tin gửi đi đều đính kèm chữ ký **`X-UAV-Signature` (`HMAC-SHA256`)** tạo từ khóa bí mật của thuê bao.
- Sử dụng chức năng **Gửi thử nghiệm (`Test Dispatch`)** và kiểm tra bảng **Nhật ký Chuyển phát (`Webhook Delivery Logs`)** để xử lý các điểm cuối bị lỗi `5xx` hoặc `Timeout`.

## 3. Truy vết Nhật ký Kiểm toán (`/admin/audit-logs`)
- Mọi thao tác nhạy cảm (thay đổi quyền RBAC, duyệt/hủy nhiệm vụ, xác nhận thanh toán, sửa cấu hình hệ thống) đều được ghi nhận bất biến kèm địa chỉ IP, tài khoản thực hiện và dấu thời gian.',
    '["Đã nắm cách đọc chỉ số độ trễ và trạng thái các dịch vụ lõi tại /admin/system-health","Đã hiểu cơ chế xác thực chữ ký HMAC-SHA256 và kiểm thử Webhook tại /admin/webhooks","Đã biết cách tra cứu và xuất báo cáo Nhật ký kiểm toán (Audit Logs) khi rà soát an ninh"]'
)
ON CONFLICT (code) DO NOTHING;
