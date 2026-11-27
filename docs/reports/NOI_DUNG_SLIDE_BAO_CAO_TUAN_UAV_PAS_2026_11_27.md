# KỊCH BẢN & NỘI DUNG LÀM SLIDE BÁO CÁO TIẾN ĐỘ TUẦN (10 SLIDES)
## Dự án: Hệ thống UAV PAS — Tuần 19/11/2026 – 27/11/2026

> **Gợi ý nhanh cho bạn thiết kế Slide (PowerPoint / Canva / Google Slides)**:
> - **Khổ Slide**: 16:9 màn hình rộng.
> - **Màu sắc chủ đạo của dự án**:
>   - Đỏ đậm (điểm nhấn chính): `#AB2523`
>   - Xanh đen (nền tối hoặc tiêu đề đậm): `#0F172A`
>   - Xanh lá (trạng thái hoàn thành / đạt chuẩn): `#10B981`
>   - Xanh dương (công nghệ / ứng dụng): `#0EA5E9`
> - **Nguyên tắc trình bày**: Mỗi slide chỉ cần ý ngắn gọn, nhấn mạnh **con số to** và **lợi ích thực tế**, không cần đưa nhiều chữ chuyên sâu kỹ thuật lên màn hình.
> - **Slide mẫu đã dựng sẵn**: Bạn có thể mở file PDF `SLIDE_DECK_BAO_CAO_TUAN_UAV_PAS_2026_11_27.pdf` để tham khảo trực tiếp cách chia bố cục.

---

## SLIDE 1: Trang Bìa
- **Cách bố trí**: Chữ lớn ở giữa màn hình, nền tối hiện đại hoặc ảnh máy bay UAV làm mờ.
- **Dòng nhỏ phía trên**: `BÁO CÁO TIẾN ĐỘ TUẦN · 19/11 – 27/11/2026`
- **Tiêu đề chính**: **HỆ THỐNG UAV PAS — NÂNG CẤP NỀN TẢNG DỮ LIỆU, BẢO MẬT & PHÁT HÀNH ĐA THIẾT BỊ**
- **Dòng mô tả ngắn**: Chuyển đổi sang DAO + Hibernate, mã hóa dữ liệu người dùng, kiểm thử đạt trên 90%, hoàn thiện 3 trang Web và đưa ứng dụng iPhone lên TestFlight.
- **Chân trang**: Người thực hiện: **Nguyễn Phát** | Ngày báo cáo: **27/11/2026**
- **Lời dẫn gợi ý khi thuyết trình**:
  > "Chào mọi người, hôm nay mình xin báo cáo tiến độ 1 tuần qua của hệ thống UAV PAS. Trọng tâm tuần này là chuyển đổi toàn bộ phần xử lý dữ liệu từ JPA sang DAO + Hibernate, đồng thời hoàn thiện thêm 5 hạng mục lớn về bảo mật, kiểm thử, duyệt hồ sơ đối tác, giao diện Web và phát hành ứng dụng iPhone lên TestFlight."

---

## SLIDE 2: 6 Kết Quả Nổi Bật Trong Tuần
- **Cách bố trí**: Chia 6 ô vuông (3 ô hàng trên, 3 ô hàng dưới), mỗi ô có 1 con số lớn ở trên và 1–2 dòng giải thích ngắn ở dưới.
- **Tiêu đề Slide**: **6 KẾT QUẢ CHÍNH ĐẠT ĐƯỢC TRONG TUẦN**
- **Nội dung 6 ô**:
  1. **`76` cặp DAO / `0` JPA** — Chuyển đổi 100% sang mô hình DAO + Hibernate thuần cho toàn bộ 30 nhóm chức năng.
  2. **Mã hóa `AES-256`** — Tự động bảo mật 12 trường thông tin cá nhân trong cơ sở dữ liệu và toàn bộ giấy tờ PDF/Office tải lên.
  3. **`> 90%` Độ phủ Test** — Hơn **1.399 bài kiểm tra tự động** chạy đạt 100%, không còn lỗi.
  4. **Duyệt KYC `5–7` giấy tờ** — Quản trị viên duyệt từng giấy tờ đối tác và khóa chống đặt trùng lịch máy bay/phi công.
  5. **`3` Cổng Web & `4` Thử nghiệm UI** — Nâng cấp giao diện di động, siết phân quyền chặt chẽ và chạy thử nghiệm 4 phương án tối ưu đặt bay.
  6. **TestFlight `Bản số 5`** — Cấu hình xong đăng nhập Google & Apple trên iPhone và đẩy lên Apple TestFlight.
- **Lời dẫn gợi ý**:
  > "Nhìn nhanh qua 6 con số chính của tuần: hệ thống đã bỏ hoàn toàn JPA cũ sang 76 cặp DAO dùng Hibernate, mã hóa dữ liệu nhạy cảm, độ phủ kiểm thử tự động vượt 90%, hoàn thiện quy trình duyệt hồ sơ đối tác và đã có bản cập nhật mới nhất trên TestFlight."

---

## SLIDE 3: Việc 1 — Chuyển Đổi Từ JPA Sang DAO + Hibernate
- **Cách bố trí**: Chia 2 cột (Bên trái là bảng so sánh Trước – Sau; Bên phải là 3 lợi ích chính).
- **Tiêu đề Slide**: **CHUYỂN ĐỔI TOÀN BỘ XỬ LÝ DỮ LIỆU SANG DAO + HIBERNATE**
- **Cột Trái (So sánh Trước và Sau)**:
  - **Trước đây (Spring Data JPA)**: Dùng thư viện tự sinh câu lệnh, khó kiểm soát khi truy vấn phức tạp hoặc nhiều bảng nối nhau.
  - **Hiện tại (DAO + Hibernate thuần)**: Xây dựng bộ khung DAO dùng chung cho toàn bộ **76 bảng dữ liệu** trên **30 phân hệ**, làm chủ trực tiếp mọi câu lệnh truy vấn.
- **Cột Phải (3 điểm nâng cấp nổi bật)**:
  - **Tích hợp sẵn tìm kiếm & lọc chung**: Mọi bảng đều có sẵn chức năng tìm kiếm, lọc theo nhiều điều kiện, sắp xếp và phân trang mà không phải viết lại.
  - **Kiểm soát hiệu năng & chống xung đột**: Dễ tối ưu tốc độ tải dữ liệu và khóa an toàn khi nhiều người cùng thanh toán hoặc đặt lịch.
  - **Khóa quy chuẩn tự động**: Hệ thống có bài kiểm tra tự động để đảm bảo toàn bộ nhóm giữ đúng chuẩn mới, không viết nhầm quay lại cách cũ.
- **Lời dẫn gợi ý**:
  > "Đây là thay đổi lớn nhất ở tầng máy chủ. Thay vì phụ thuộc vào JPA tự sinh, toàn bộ 76 lớp làm việc với dữ liệu giờ đã chạy thống nhất trên bộ khung DAO + Hibernate, giúp tìm kiếm linh hoạt hơn và kiểm soát tốc độ truy vấn tốt hơn."

---

## SLIDE 4: Việc 2 — Bảo Mật & Mã Hóa Dữ Liệu (Chuẩn AES-256)
- **Cách bố trí**: Chia 2 khối lớn song song có biểu tượng ổ khóa (Bên trái: Dữ liệu trong Database; Bên phải: Giấy tờ tải lên).
- **Tiêu đề Slide**: **BẢO VỆ THÔNG TIN NHẠY CẢM & GIẤY TỜ BẰNG MÃ HÓA AES-256**
- **Khối 1 — Mã hóa tự động 12 thông tin cá nhân trong Cơ sở dữ liệu**:
  - **Tài khoản**: Khóa bảo mật xác thực 2 lớp (2FA).
  - **Khách hàng**: Mã số thuế, địa chỉ hóa đơn, email hóa đơn, người liên hệ khẩn cấp.
  - **Đối tác đội bay**: Số CCCD/MST, số giấy phép bay, số điện thoại, số tài khoản ngân hàng nhận tiền.
  - *Cơ chế*: Tự động mã hóa khi lưu và tự giải mã khi người có thẩm quyền xem; vẫn tương thích với dữ liệu cũ.
- **Khối 2 — Mã hóa tự động giấy tờ tải lên kho lưu trữ**:
  - Áp dụng cho mọi hồ sơ pháp lý tải lên (PDF, Word, Excel, tệp nén...).
  - Tự động phát hiện và báo lỗi ngay nếu tệp bị người ngoài chỉnh sửa trái phép.
- **Lời dẫn gợi ý**:
  > "Vì nền tảng lưu trữ nhiều thông tin quan trọng như CCCD, số tài khoản ngân hàng và giấy phép bay, tuần này mình đã bổ sung lớp mã hóa chuẩn AES-256 cho cả dữ liệu trong database lẫn tệp giấy tờ tải lên."

---

## SLIDE 5: Việc 3 — Quy Trình Duyệt Hồ Sơ Đối Tác & Chống Trùng Lịch Bay
- **Cách bố trí**: Sơ đồ mũi tên 4 bước nằm ngang ở trên + 2 khung điểm nhấn ở dưới.
- **Tiêu đề Slide**: **HOÀN THIỆN DUYỆT HỒ SƠ ĐỐI TÁC & ĐIỀU PHỐI AN TOÀN**
- **Sơ đồ 4 bước duyệt đối tác**:
  1. **Khai báo hồ sơ**: Đối tác nhập thông tin pháp nhân và tài khoản nhận tiền.
  2. **Nộp giấy tờ**: Cá nhân nộp đủ **5 giấy tờ**, Doanh nghiệp nộp đủ **7 giấy tờ** bắt buộc.
  3. **Admin duyệt từng tờ**: Xem trực tiếp giấy tờ, bấm duyệt đạt hoặc yêu cầu sửa. Giấy tờ đã duyệt sẽ bị **khóa không cho xóa**.
  4. **Mở bán dịch vụ**: Đủ giấy tờ đạt chuẩn thì đối tác mới được đăng bán dịch vụ và nhận tiền cọc.
- **2 cải tiến quan trọng đi kèm**:
  - **Chặn đặt trùng lịch**: Hệ thống tự động chặn không cho xếp 1 máy bay hoặc 1 phi công bay 2 đơn trùng khung giờ nhau.
  - **Hoàn thiện dữ liệu mẫu**: Đã cập nhật cơ sở dữ liệu lên phiên bản `V70`, nạp đầy đủ gói dịch vụ bay và bộ hồ sơ mẫu để demo thực tế.

---

## SLIDE 6: Việc 4 — Kiểm Thử Tự Động Đạt Độ Phủ Trên 90%
- **Cách bố trí**: Bên trái là biểu đồ thanh ngang thể hiện % độ phủ; Bên phải là 3 gạch đầu dòng ngắn gọn.
- **Tiêu đề Slide**: **ĐẢM BẢO CHẤT LƯỢNG: HƠN 1.399 BÀI KIỂM THỬ & ĐỘ PHỦ > 90%**
- **Biểu đồ thanh ngang (so với mức yêu cầu 80%)**:
  - **Tầng tiếp nhận yêu cầu (Controller)**: **99,37%**
  - **Tầng dữ liệu (Hibernate DAO)**: **97,30%**
  - **Tầng xử lý nghiệp vụ (Service)**: **> 90%**
  - **Toàn bộ hệ thống máy chủ**: **> 90%**
- **Ý chính bên phải**:
  - Viết bổ sung **23 bộ kiểm thử mới** cho các chức năng quan trọng nhất.
  - Tổng cộng **hơn 1.399 bài kiểm tra tự động** đều chạy đạt 100%, không còn lỗi.
  - Tự động kiểm tra quy chuẩn viết code trước mỗi lần cập nhật để tránh lỗi dây chuyền.

---

## SLIDE 7: Việc 5 — Nâng Cấp 3 Trang Web, Phân Quyền & Thử Nghiệm Giao Diện
- **Cách bố trí**: Chia 3 cột dọc đại diện cho 3 trang Web.
- **Tiêu đề Slide**: **NÂNG CẤP 3 TRANG WEB, PHÂN QUYỀN & THỬ NGHIỆM GIAO DIỆN**
- **Cột 1 — Trang Khách hàng**:
  - Làm mới trang chủ và trang danh sách dịch vụ bay gọn gàng, dễ xem.
  - Rút gọn bộ lọc tìm kiếm và cho phép chia sẻ thẳng đường link đang lọc.
  - Chạy **4 thử nghiệm giao diện (A/B Testing)** để đo cách hiển thị giúp khách đặt bay nhanh nhất.
- **Cột 2 — Trang Vận hành**:
  - **Khóa phân quyền**: Chặn tài khoản khách hàng đi nhầm vào trang Vận hành nội bộ.
  - Cải thiện khung chọn máy bay hiển thị đầy đủ mã máy; hiện thông báo tiếng Việt rõ ràng khi trùng lịch.
- **Cột 3 — Trang Quản trị (Admin)**:
  - Thêm màn hình quản lý vai trò và phân quyền trực quan hơn.
  - Đồng bộ hoàn chỉnh 3 ngôn ngữ (Việt / Anh / Nhật) và sửa dứt điểm lỗi tràn chữ trên màn hình điện thoại nhỏ.

---

## SLIDE 8: Việc 6 — Ứng Dụng Di Động iPhone & Đưa Lên TestFlight
- **Cách bố trí**: Chia 2 cột (Bên trái: Tính năng mới trên App; Bên phải: Bảng thông tin bản phát hành).
- **Tiêu đề Slide**: **ỨNG DỤNG DI ĐỘNG iPHONE: ĐĂNG NHẬP GOOGLE/APPLE & TESTFLIGHT**
- **Cột Trái — Tính năng đã hoàn thiện**:
  - Cấu hình xong **Đăng nhập bằng Google** và **Đăng nhập bằng Apple** ngay trên iPhone.
  - Đồng bộ toàn bộ ngôn ngữ (Việt / Anh / Nhật) và cách hiển thị khớp 100% với trang Web.
  - Vượt qua toàn bộ kiểm tra chất lượng (**273 tệp mã nguồn chuẩn kiến trúc**, **56/56 bài kiểm thử Mobile đạt**).
- **Cột Phải — Thông tin phát hành TestFlight**:
  - **Phiên bản**: `v1.0.0 — Bản dựng số 5`
  - **Trạng thái**: Đã đóng gói và đẩy tự động lên **Apple TestFlight**.
  - **Sử dụng**: Thành viên nhóm có thể mở ứng dụng TestFlight trên iPhone để bấm cập nhật và dùng thử ngay.

---

## SLIDE 9: Nhật Ký Công Việc Theo Ngày Trong Tuần
- **Cách bố trí**: Bảng 4 dòng gọn gàng từ ngày 19/11 đến 27/11.
- **Tiêu đề Slide**: **LỊCH TRÌNH HOÀN THÀNH TRONG TUẦN (19/11 – 27/11/2026)**
- **Nội dung bảng**:
  - **19/11/2026**: Thiết kế lại trang chủ; thêm khóa chống đặt trùng lịch bay; sửa lỗi giao diện điện thoại cho cả 3 trang Web & Mobile.
  - **21/11/2026**: Dọn ảnh thừa; đồng bộ ngôn ngữ sang Mobile; hoàn thiện đăng nhập Google/Apple và đẩy bản iPhone số 5 lên TestFlight.
  - **23/11/2026**: Chuyển đổi xong 100% sang DAO + Hibernate; thêm mã hóa AES-256; nâng kiểm thử tự động lên > 90%; thêm 4 thử nghiệm giao diện.
  - **24/11 – 27/11**: Siết quyền chặn khách vào trang Vận hành; nạp đủ gói dịch vụ & hồ sơ mẫu (`V70`); mở rộng màn hình phân quyền Admin.

---

## SLIDE 10: Kế Hoạch Tuần Tiếp Theo & Kết Thúc
- **Cách bố trí**: 3 thẻ ưu tiên nằm ngang + Khung cảm ơn bên dưới.
- **Tiêu đề Slide**: **KẾ HOẠCH TUẦN TIẾP THEO**
- **3 việc ưu tiên**:
  1. **Đánh giá 4 thử nghiệm giao diện**: Xem cách bố trí nào hiệu quả nhất trên trang Khách hàng để chốt phiên bản chính thức.
  2. **Kiểm tra tốc độ chịu tải**: Thử nghiệm tốc độ tìm kiếm trên Hibernate DAO và tốc độ mở giấy tờ mã hóa khi có nhiều người truy cập cùng lúc.
  3. **Ghi nhận phản hồi từ bản iPhone TestFlight**: Dùng thử thực tế toàn bộ quy trình đặt bay, duyệt đơn trên điện thoại để hoàn thiện thêm.
- **Khung kết thúc**: **Cảm ơn thầy/cô và các bạn đã lắng nghe — Sẵn sàng trao đổi & demo hệ thống!**
