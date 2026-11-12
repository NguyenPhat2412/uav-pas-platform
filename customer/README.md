# UAV PAS Platform — Cổng Khách hàng & Trang Công khai (`customer/`)

Ứng dụng Next.js độc lập phục vụ **Website công khai (`/`)** và **Cổng Khách hàng (`/customer/*`)** tại cổng mặc định `http://localhost:3100` (tương ứng trực tiếp với nhánh `customer` trên GitHub).

## Phạm vi cô lập (`check-architecture.mjs`)

- **Routes (`src/app/`):** Chỉ chứa `(public)`, `(customer)` và `health` (**31 route entries**, **373 file nguồn**). Không chứa bất kỳ route hoặc component nào của `operations` hay `admin`.
- **Chức năng chính:**
  - Trang chủ giới thiệu dịch vụ UAV, Học viện Đào tạo, Nghiên cứu & Liên hệ.
  - Bảng điều khiển Khách hàng, Đặt lịch nhiệm vụ bay (kèm gợi ý thời tiết `MissionWeatherAdvisor` và kiểm tra vùng trời `AirspacePreflightBadge`), Địa điểm bay đã lưu (`SavedFlightSitesBar`), Nhân bản nhiệm vụ, Nghiệm thu & Đánh giá bàn giao (`MissionHandoverReviewCard`), Quản lý giấy phép bay (`MissionPermitSection`), Thanh toán VietQR & Biên lai PDF, Tệp kết quả bàn giao, Hồ sơ & Thiết bị nhận thông báo.

## Chạy và kiểm thử

```bash
cd customer
npm install
npm run dev                  # http://localhost:3100
npm run architecture:check   # Kiểm tra cô lập kiến trúc
npm run typecheck            # Kiểm tra kiểu TypeScript
npm run lint                 # Kiểm tra ESLint
npm test                     # Chạy 60 kiểm thử hợp đồng & nghiệp vụ
```
