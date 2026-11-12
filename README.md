# Nhánh `customer`: Trang Chủ Công Khai & Cổng Khách Hàng (`:3100`)

Nhánh này **chỉ chứa ứng dụng Web `customer/`** (được tách cô lập từ `main`, không kèm code của `backend`, `admin`, `operations` hay `mobile`):

- Website giới thiệu dịch vụ UAV PAS (`/`), popup gợi ý dịch vụ theo ngữ cảnh cuộn trang, kênh liên hệ Zalo & khung hỗ trợ trực tuyến 2 chiều với Admin.
- Cổng Khách hàng (`/customer/*`): khởi tạo nhiệm vụ khảo sát GIS, theo dõi vùng bay NFZ, quản lý gói cước/hóa đơn PDF và Học viện đào tạo UAV.

## Chạy và kiểm thử độc lập

```bash
cd customer
npm install
npm run dev                  # http://localhost:3100
npm run architecture:check && npm run typecheck && npm run lint && npm test
```
