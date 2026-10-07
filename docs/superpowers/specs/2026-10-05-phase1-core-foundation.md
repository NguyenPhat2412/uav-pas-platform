# ĐẶC TẢ HỆ THỐNG CƠ BẢN UAV PAS – GIAI ĐOẠN 1

## 1. Tổng quan

### 1.1. Tên hệ thống

**UAV PAS – Low-Altitude Economy UAV Platform-as-a-Service**

### 1.2. Mục tiêu của Giai đoạn 1

Giai đoạn 1 tập trung xây dựng **nền tảng cốt lõi (Core Foundation)** cho hệ thống UAV PAS, làm cơ sở để phát triển các chức năng nghiệp vụ nâng cao ở các giai đoạn tiếp theo.

Các mục tiêu chính bao gồm:

1. **Quản lý người dùng và phân quyền**
   - Đăng ký, đăng nhập và đăng xuất.
   - JWT Authentication.
   - Refresh Token.
   - Quản lý người dùng.
   - Role Template.
   - Permission.
   - Phân quyền riêng cho từng tài khoản.
   - Khóa/mở khóa tài khoản.

2. **Quản lý trạm UAV**
   - Quản lý danh sách trạm.
   - Tạo và cập nhật trạm.
   - Quản lý trạng thái trạm.
   - Quản lý vị trí trạm.
   - Liên kết UAV và thiết bị với trạm.

3. **Quản lý đội UAV**
   - Quản lý thông tin UAV.
   - Model, Serial Number và Manufacturer.
   - Gán UAV vào trạm.
   - Quản lý trạng thái UAV.
   - Theo dõi tình trạng hoạt động.
   - Quản lý bảo trì UAV.
   - Lưu lịch sử thay đổi trạng thái.

4. **Quản lý kho và thiết bị**
   - Quản lý Battery.
   - Camera.
   - KV260.
   - Sensor.
   - Accessory.
   - Quản lý tồn kho.
   - Nhập kho.
   - Xuất kho.
   - Giữ chỗ thiết bị (Reserve).
   - Hoàn trả thiết bị (Release).
   - Điều chuyển thiết bị giữa các trạm.
   - Quản lý lịch sử biến động kho.

5. **Quản lý hình ảnh, video và tài liệu**
   - Upload hình ảnh.
   - Upload video UAV.
   - Upload tài liệu.
   - Quản lý metadata.
   - Lưu trữ bằng MinIO trong môi trường development.
   - Hỗ trợ AWS S3 trong môi trường production.
   - Signed Upload URL.
   - Signed Download URL.
   - Kiểm soát quyền truy cập media.

6. **Dashboard quản trị cơ bản**
   - Tổng số người dùng.
   - Tổng số trạm UAV.
   - Tổng số UAV.
   - UAV khả dụng.
   - UAV đang bảo trì.
   - Tổng số thiết bị trong kho.
   - Thiết bị đang được giữ chỗ.
   - Hiển thị dữ liệu Dashboard dựa trên Permission của người dùng.

7. **Nhật ký và lịch sử hệ thống**
   - Ghi nhận các thao tác quan trọng.
   - Theo dõi thay đổi quyền người dùng.
   - Theo dõi thay đổi trạng thái UAV.
   - Theo dõi nhập/xuất kho.
   - Theo dõi Reserve/Release.
   - Theo dõi điều chuyển thiết bị.
   - Theo dõi các thao tác quan trọng liên quan đến Media.

---

## 1.3. Phạm vi Giai đoạn 1

Giai đoạn 1 bao gồm:

```text
UAV PAS – PHASE 1
│
├── 01. User & Access Management
│
├── 02. Station Management
│
├── 03. UAV Fleet Management
│
├── 04. Inventory & Equipment Management
│
├── 05. Media Management
│
├── 06. Basic Dashboard
│
└── 07. Audit Log
```

Trong đó:

```text
Identity
   ↓
Permission
   ↓
Station
   ↓
UAV
   ↓
Inventory
   ↓
Media
   ↓
Dashboard
   ↓
Audit
```

đóng vai trò **Foundation Layer** của toàn bộ UAV PAS.

---

## 1.4. Các chức năng chưa triển khai trong Giai đoạn 1

Các module sau **không thuộc Phase 1**:

- Mission & UAV Service Booking.
- Search & Rescue.
- AI Detection & Processing.
- Payment & Service Entitlement.
- UAV E-Learning.
- Quiz & Assessment.
- Certificate.
- Training Qualification.
- Training Authorization.

Các chức năng này sẽ sử dụng dữ liệu và service được xây dựng trong Phase 1.

---

## 1.5. Kết quả mong đợi của Giai đoạn 1

Sau khi hoàn thành Phase 1, hệ thống phải hỗ trợ được luồng cơ bản:

```text
User Registration
        ↓
Login
        ↓
Authentication
        ↓
Permission Check
        ↓
Dashboard
        ↓
Create Station
        ↓
Create UAV
        ↓
Assign UAV to Station
        ↓
Create Equipment
        ↓
Stock In
        ↓
Reserve / Release Equipment
        ↓
UAV Maintenance
        ↓
Upload Media
        ↓
Dashboard Update
        ↓
Audit Log
```

Phase 1 phải tạo ra một nền tảng ổn định để Phase 2 có thể bắt đầu triển khai **Mission & UAV Service Booking** mà không cần thiết kế lại hệ thống User, Permission, Station, UAV, Inventory và Media.

---

## 1.6. Mục tiêu cốt lõi

**Mục tiêu quan trọng nhất của Giai đoạn 1 là xây dựng một nền tảng quản lý tài khoản, quyền truy cập, tài nguyên UAV, kho thiết bị và media ổn định, để các nghiệp vụ Mission, AI, Search & Rescue và Payment có thể được tích hợp ở các giai đoạn tiếp theo.**