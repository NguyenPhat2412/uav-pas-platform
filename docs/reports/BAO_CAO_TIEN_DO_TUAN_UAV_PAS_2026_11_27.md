# BÁO CÁO TIẾN ĐỘ PHÁT TRIỂN HỆ THỐNG UAV PAS
## Tuần làm việc: 19/11/2026 – 27/11/2026

**Tên dự án**: Hệ thống Điều phối, Vận hành & Sàn Dịch vụ Máy bay Không người lái (UAV PAS)  
**Người báo cáo**: Nguyễn Phát  
**Ngày lập báo cáo**: 27/11/2026  
**Phạm vi hoàn thành**: Hệ thống máy chủ (Backend), Cơ sở dữ liệu (Database), 3 trang Web (Khách hàng, Vận hành, Quản trị) và Ứng dụng di động trên iPhone (TestFlight).

---

## 1. Tóm tắt ngắn gọn các việc đã làm trong tuần

Trong tuần qua (**19/11 – 27/11/2026**), ngoài công việc lớn là **chuyển đổi toàn bộ cách xử lý dữ liệu từ JPA sang mô hình DAO + Hibernate**, hệ thống UAV PAS đã hoàn thành thêm **5 nhóm công việc quan trọng** để sẵn sàng đưa vào vận hành thực tế:

1. **Chuyển đổi hoàn toàn sang mô hình DAO + Hibernate (76 cặp lớp DAO)**:
   - Bỏ hoàn toàn thư viện Spring Data JPA cũ (không còn file Repository nào).
   - Viết lại toàn bộ lớp làm việc với cơ sở dữ liệu sang mô hình DAO + Hibernate thuần cho 30 nhóm chức năng của hệ thống.
   - Tích hợp sẵn tính năng tìm kiếm, lọc dữ liệu, sắp xếp và phân trang dùng chung cho mọi bảng.
2. **Mã hóa bảo mật thông tin cá nhân & giấy tờ tải lên (chuẩn AES-256)**:
   - Tự động mã hóa 12 loại thông tin nhạy cảm trong cơ sở dữ liệu (mã bảo mật 2 lớp, mã số thuế, địa chỉ hóa đơn, số CCCD, giấy phép bay, số tài khoản ngân hàng...).
   - Tự động mã hóa các tệp giấy tờ tải lên hệ thống (PDF, Word, Excel...) để tránh bị đọc trộm hoặc chỉnh sửa trái phép.
3. **Kiểm thử tự động đạt độ phủ trên 90% (hơn 1.399 bài kiểm tra)**:
   - Viết thêm 23 bộ kiểm tra tự động cho các chức năng nghiệp vụ quan trọng.
   - Đảm bảo toàn bộ hệ thống máy chủ chạy ổn định, không có lỗi trước khi đẩy lên bản chạy thật.
4. **Hoàn thiện quy trình duyệt hồ sơ đối tác & chống đặt trùng lịch bay**:
   - Cho phép Quản trị viên kiểm tra và duyệt từng loại giấy tờ của đối tác (cá nhân cần đủ 5 giấy tờ, doanh nghiệp cần đủ 7 giấy tờ); giấy tờ đã duyệt sẽ được khóa để tránh bị xóa nhầm.
   - Chặn triệt để tình trạng xếp trùng 1 máy bay hoặc 1 phi công cho 2 chuyến bay diễn ra cùng giờ.
   - Nạp đầy đủ danh sách gói dịch vụ bay và bộ hồ sơ mẫu hoàn chỉnh vào cơ sở dữ liệu.
5. **Nâng cấp 3 trang Web, siết chặt phân quyền & thêm thử nghiệm giao diện**:
   - Thiết kế lại trang chủ và trang danh sách dịch vụ gọn gàng, hiển thị đẹp trên cả điện thoại màn hình nhỏ.
   - Thử nghiệm 4 cải tiến giao diện (A/B Testing) trên trang Khách hàng để xem cách bố trí nào giúp khách dễ đặt bay hơn.
   - Siết chặt phân quyền: chặn tài khoản khách hàng đi nhầm vào trang Vận hành nội bộ; bổ sung màn hình quản lý quyền hạn trực quan cho Quản trị viên.
6. **Cập nhật Ứng dụng di động iPhone và phát hành lên TestFlight (Bản số 5)**:
   - Cấu hình xong tính năng đăng nhập nhanh bằng tài khoản Google và Apple ngay trên điện thoại.
   - Đóng gói và đẩy phiên bản mới nhất lên Apple TestFlight để mọi người có thể tải về dùng thử trên iPhone.

---

## 2. Chi tiết 6 Nhóm Công Việc Đã Hoàn Thành

### 2.1. Chuyển đổi từ Spring Data JPA sang DAO + Hibernate thuần

**Lý do thực hiện**:
Cách viết cũ bằng Spring Data JPA tuy nhanh lúc đầu nhưng khó kiểm soát sâu các câu lệnh truy vấn phức tạp, dễ phát sinh truy vấn thừa làm chậm hệ thống và khó xử lý khóa dữ liệu khi nhiều người đặt bay hoặc thanh toán cùng lúc.

**Kết quả đã làm được**:
- **Bỏ 100% Spring Data JPA**: Xóa toàn bộ thư viện JPA cũ và không còn sử dụng các file Repository tự sinh.
- **Xây dựng bộ khung DAO chuẩn dùng chung**:
  - Tạo lớp giao tiếp chuẩn cho toàn bộ hệ thống với đầy đủ các thao tác cơ bản: thêm, sửa, xóa, xem chi tiết, lấy danh sách, tìm kiếm động, đếm số lượng và phân trang.
  - Áp dụng đồng bộ cho **76 cặp lớp DAO** trên **30 phân hệ nghiệp vụ** (từ quản lý người dùng, đơn hàng, chuyến bay, đội máy bay, thanh toán, ví đối soát, vùng trời đến đào tạo và hỗ trợ khách hàng).
- **Chủ động kiểm soát hiệu năng & an toàn giao dịch**:
  - Tự động ghi nhận ngày tạo và ngày cập nhật dữ liệu ngay trong vòng đời Hibernate.
  - Kiểm soát khóa dữ liệu khi xử lý tiền cọc và phân công bay để tránh xung đột.
  - Có bài kiểm tra kiến trúc tự động để đảm bảo sau này không ai viết nhầm quay lại dùng JPA cũ.

| Tiêu chí so sánh | Cách làm cũ (Spring Data JPA) | Cách làm mới (DAO + Hibernate thuần) |
| :--- | :--- | :--- |
| **Cách truy xuất dữ liệu** | Phụ thuộc thư viện tự sinh câu lệnh | Chủ động viết và quản lý trực tiếp qua Hibernate |
| **Quy mô áp dụng** | Rời rạc theo từng bảng | **76 cặp lớp DAO** thống nhất trên toàn bộ **30 phân hệ** |
| **Tìm kiếm & lọc dữ liệu** | Phải viết lặp lại nhiều lần | Tích hợp sẵn bộ lọc, sắp xếp và phân trang dùng chung |
| **Kiểm soát hiệu năng** | Khó tối ưu các bảng liên kết nhiều tầng | Dễ tối ưu câu lệnh, tránh tải thừa dữ liệu |

---

### 2.2. Bảo mật & Mã hóa dữ liệu nhạy cảm (Chuẩn AES-256)

**Mục đích**: Bảo vệ an toàn thông tin cá nhân của khách hàng, tài khoản nhận tiền của đối tác và giấy phép bay khỏi nguy cơ rò rỉ dữ liệu.

**Kết quả đã làm được**:
1. **Mã hóa tự động 12 thông tin quan trọng trong Cơ sở dữ liệu**:
   - **Tài khoản người dùng**: Mã khóa bảo mật xác thực 2 lớp (2FA).
   - **Thông tin xuất hóa đơn của khách hàng**: Mã số thuế, địa chỉ hóa đơn, email nhận hóa đơn, tên và số điện thoại người liên hệ khẩn cấp.
   - **Hồ sơ đối tác đội bay**: Số CCCD/Mã số thuế, số giấy phép bay, số điện thoại liên hệ, số tài khoản và tên chủ tài khoản ngân hàng nhận tiền.
   - Hệ thống tự động mã hóa khi lưu vào cơ sở dữ liệu và tự động giải mã khi người có quyền xem; đồng thời vẫn đọc được bình thường các dữ liệu cũ trước đó.
2. **Mã hóa tự động giấy tờ & tài liệu tải lên**:
   - Toàn bộ tệp giấy tờ quan trọng (PDF, Word, Excel, tệp nén ZIP, tệp dữ liệu...) khi tải lên kho lưu trữ đều được mã hóa tự động.
   - Hệ thống kiểm tra tính nguyên vẹn mỗi khi mở tệp — nếu tệp bị sửa đổi trái phép bên ngoài, hệ thống sẽ phát hiện và từ chối ngay.

---

### 2.3. Quy trình duyệt hồ sơ đối tác & Chống đặt trùng lịch bay

**1. Quy trình kiểm duyệt hồ sơ đối tác (4 bước rõ ràng)**:
- **Bước 1 — Khai báo thông tin**: Đối tác điền thông tin cá nhân hoặc doanh nghiệp cùng tài khoản ngân hàng nhận thanh toán.
- **Bước 2 — Nộp đủ giấy tờ bắt buộc**:
  - Đối tác **Cá nhân** cần nộp tối thiểu **5 loại giấy tờ** (CCCD, chứng chỉ điều khiển bay, giấy đăng ký máy bay, bảo hiểm, cam kết an toàn).
  - Đối tác **Doanh nghiệp** cần nộp tối thiểu **7 loại giấy tờ** (bổ sung giấy phép kinh doanh và hồ sơ năng lực).
- **Bước 3 — Quản trị viên duyệt từng giấy tờ**: Xem trực tiếp từng tệp qua đường dẫn bảo mật tạm thời, duyệt đạt hoặc yêu cầu bổ sung kèm ghi chú cụ thể. Giấy tờ đã duyệt đạt sẽ bị **khóa không cho xóa** để đảm bảo minh bạch.
- **Bước 4 — Xác minh thành công**: Chỉ khi đủ giấy tờ đạt chuẩn, đối tác mới được mở bán gói dịch vụ bay và nhận tiền qua cơ chế giữ tiền cọc an toàn.

**2. Chống đặt trùng lịch máy bay và phi công**:
- Bổ sung kiểm tra trùng khung giờ khi phân công đơn hàng: hệ thống không cho phép gán 1 máy bay hoặc 1 phi công cho 2 chuyến bay diễn ra trùng giờ nhau (kể cả khi hệ thống tự động chọn máy bay giúp điều phối viên).

**3. Chuẩn hóa dữ liệu hệ thống**:
- Cập nhật đồng bộ cơ sở dữ liệu (từ phiên bản `V60` lên `V70`): mở rộng cột lưu dữ liệu mã hóa, sửa lỗi chính tả học liệu đào tạo và nạp đầy đủ danh sách gói dịch vụ bay cùng bộ hồ sơ đối tác mẫu.

---

### 2.4. Kiểm thử tự động (Đạt độ phủ trên 90%)

Để đảm bảo việc chuyển đổi từ JPA sang DAO + Hibernate không làm hỏng các tính năng đang chạy, hệ thống đã được bổ sung **23 bộ kiểm thử tự động mới**, nâng tổng số lên **hơn 1.399 bài kiểm tra** (100% chạy đạt, không có lỗi).

| Phần hệ thống được kiểm tra | Mục tiêu yêu cầu | Kết quả đạt được | Đánh giá |
| :--- | :---: | :---: | :---: |
| **Tầng tiếp nhận yêu cầu (Controller)** | > 80% | **99,37%** | Rất tốt |
| **Tầng làm việc với dữ liệu (Hibernate DAO)** | > 80% | **97,30%** | Rất tốt |
| **Tầng xử lý nghiệp vụ (Service)** | > 80% | **> 90%** | Đạt vượt mức |
| **Tổng thể toàn bộ hệ thống máy chủ** | > 80% | **> 90%** | Đạt vượt mức |

---

### 2.5. Nâng cấp 3 trang Web, Phân quyền & Thử nghiệm giao diện

1. **Trang Khách hàng**:
   - Thiết kế lại trang chủ gọn gàng, trực quan hơn; tinh gọn thanh tìm kiếm & bộ lọc gói dịch vụ (có thể chia sẻ thẳng đường link đang lọc cho người khác).
   - Triển khai **4 thử nghiệm giao diện (A/B Testing)** cho nút kêu gọi hành động ở trang chủ, thanh lọc danh mục, thẻ thông tin gói dịch vụ và bảng tính chi phí đặt bay để đo xem cách hiển thị nào dễ dùng nhất.
2. **Trang Vận hành (Điều phối & Đội bay)**:
   - **Siết chặt phân quyền**: Chặn tài khoản khách hàng thông thường không thể đi vào trang Vận hành nội bộ.
   - Cải thiện ô chọn máy bay hiển thị rõ ràng 2 dòng (số máy và dòng máy), hiện thông báo tiếng Việt dễ hiểu khi bị trùng lịch và sửa hết các nút bấm bị dẫn sai trang.
3. **Trang Quản trị (Admin)**:
   - Bổ sung màn hình quản lý vai trò & phân quyền trực quan, dễ thao tác hơn.
   - Rút gọn thanh menu trên cùng gọn gàng, hiển thị đồng nhất 3 ngôn ngữ (Việt / Anh / Nhật) và sửa hoàn toàn lỗi chữ bị tràn khung trên màn hình điện thoại nhỏ.

---

### 2.6. Ứng dụng Di động iPhone & Đưa lên TestFlight

- **Hoàn thiện đăng nhập nhanh bằng Google và Apple**: Cấu hình đầy đủ thông tin kết nối Google và Apple cho cả máy chủ và ứng dụng iPhone để người dùng có thể đăng nhập một chạm.
- **Đồng bộ ngôn ngữ & kiểm tra chất lượng**: Đồng bộ toàn bộ câu chữ Việt / Anh / Nhật từ Web sang Mobile; kiểm tra toàn bộ 273 tệp mã nguồn và 56 bài kiểm thử đều đạt 100%.
- **Phát hành lên Apple TestFlight**: Đóng gói và đẩy thành công phiên bản **v1.0.0 (Bản dựng số 5)** lên Apple TestFlight để đội ngũ có thể tải trực tiếp về iPhone trải nghiệm.

---

## 3. Tóm tắt tiến độ theo từng mốc thời gian trong tuần

| Thời gian | Việc chính đã hoàn thành | Kết quả nhận được |
| :--- | :--- | :--- |
| **19/11/2026** | Thiết kế lại trang chủ; thêm khóa chống trùng lịch máy bay & phi công; sửa lỗi vỡ khung giao diện trên điện thoại cho cả 3 trang Web & Mobile. | Giao diện điện thoại gọn đẹp; không còn tình trạng xếp trùng lịch bay. |
| **21/11/2026** | Dọn dẹp 19 ảnh cũ không dùng; đồng bộ câu chữ sang Mobile; cấu hình đăng nhập Google & Apple và đẩy bản iPhone số 5 lên TestFlight. | Ứng dụng iPhone mới nhất đã có trên TestFlight kèm đăng nhập nhanh. |
| **23/11/2026** | Chuyển đổi xong 100% sang DAO + Hibernate; thêm mã hóa bảo mật AES-256 cho dữ liệu & giấy tờ; viết 23 bộ test nâng độ phủ trên 90%; thêm 4 thử nghiệm giao diện. | Máy chủ chạy thuần Hibernate DAO, an toàn dữ liệu và ổn định cao. |
| **24/11 – 27/11** | Chặn khách hàng vào nhầm trang Vận hành; nạp đầy đủ dịch vụ bay & hồ sơ mẫu; bổ sung màn hình quản lý phân quyền trên trang Admin. | Toàn bộ hệ thống đồng bộ và sẵn sàng cho người dùng thử nghiệm. |

---

## 4. Dự kiến công việc tuần tiếp theo

1. **Theo dõi kết quả 4 thử nghiệm giao diện**: Đánh giá xem kiểu hiển thị nào giúp khách hàng dễ tìm và đặt chuyến bay nhanh nhất để chốt bản chính thức.
2. **Kiểm tra tốc độ xử lý khi nhiều người dùng cùng lúc**: Đo tốc độ tìm kiếm trên Hibernate DAO và tốc độ mở giấy tờ đã mã hóa khi có nhiều yêu cầu đồng thời.
3. **Thu thập góp ý thực tế từ bản iPhone TestFlight**: Nhờ đội ngũ và người dùng thử bấm trực tiếp trên iPhone (đăng nhập Google/Apple, đặt dịch vụ, theo dõi đơn) để tinh chỉnh trải nghiệm.
