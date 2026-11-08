# UAV PAS Platform — Cổng Quản trị Hệ thống (`admin/`)

Ứng dụng Next.js độc lập phục vụ **Cổng Quản trị Hệ thống (`/admin/*`)** tại cổng mặc định `http://localhost:3300` (tương ứng trực tiếp với nhánh `admin` trên GitHub).

## Phạm vi cô lập (`check-architecture.mjs`)

- **Routes (`src/app/`):** Chỉ chứa `(admin)`, `health` và cổng đăng nhập tại `/` (**51 route entries**, **438 file nguồn**). Không chứa bất kỳ route hoặc component nào của `customer`, `public` hay `operations`.
- **Chức năng chính:**
  - Bảng điều khiển Quản trị tổng thể, Giám sát hàng đợi & Cảnh báo hệ thống.
  - Phân tích Chất lượng Phục vụ & Dự báo Nhu cầu Đội bay (`AdminSlaIntelligenceSection` trong `/admin/reports`).
  - Quản lý Vùng trời & Thông báo Hàng không Tạm thời NOTAM (`AdminAirspacePanel` tại `/admin/airspace` với bản đồ tương tác Leaflet).
  - Quản lý Người dùng, Ma trận Phân quyền RBAC, Mẫu Vai trò & Nhật ký Kiểm toán.
  - Quản lý Hóa đơn, Đối soát Thanh toán SePay/VietQR, Danh mục Gói dịch vụ, Học viện Đào tạo, Khóa Thiết bị, Lưu trữ Tệp, Webhook và Cấu hình Thời tiết/An toàn bay.

## Chạy và kiểm thử

```bash
cd admin
npm install
npm run dev                  # http://localhost:3300
npm run architecture:check   # Kiểm tra cô lập kiến trúc
npm run typecheck            # Kiểm tra kiểu TypeScript
npm run lint                 # Kiểm tra ESLint
npm test                     # Chạy 143 kiểm thử hợp đồng & liên cổng
```
