# Nhánh `admin`: Cổng Quản Trị Hệ Thống (`:3300`)

Nhánh này **chỉ chứa ứng dụng Web `admin/`** (được tách cô lập từ `main`, không kèm code của `customer`, `operations`, `backend` hay `mobile`):

- Quản trị người dùng, phân quyền RBAC chi tiết, khóa thiết bị telemetry và nhật ký kiểm toán.
- Quản lý vùng trời & NOTAM tạm thời (`/admin/airspace`), cấu hình thời tiết & an toàn bay, cấu hình thanh toán & liên hệ công khai (Hotline / Zalo / Email).
- Hộp thư hỗ trợ trực tuyến `/admin/support` kèm mẫu trả lời nhanh 1 chạm và phân tích chất lượng phục vụ (`/admin/reports`).

## Chạy và kiểm thử độc lập

```bash
cd admin
npm install
npm run dev                  # http://localhost:3300
npm run architecture:check && npm run typecheck && npm run lint && npm test
```
