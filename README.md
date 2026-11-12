# Nhánh `testcase`: Bộ Kiểm Thử Tự Động, Hợp Đồng API & Báo Cáo Kiểm Chứng

Nhánh này **chỉ chứa các bộ kiểm thử tự động, kịch bản Postman/OpenAPI và báo cáo kiểm chứng** (được tách cô lập từ `main`):

- `api-contract/` — Bộ kiểm thử tự động Postman CLI (`postman_collection.json`) và đặc tả `openapi.json`.
- `backend/src/test/` — Bộ kiểm thử đơn vị và tích hợp bảo mật/cơ sở dữ liệu của Backend.
- `customer/tests/`, `operations/tests/`, `admin/tests/`, `mobile/tests/`, `edge/kv260/tests/` — Bộ kiểm thử kiến trúc, hợp đồng giao diện và luồng nghiệp vụ phía Client & Edge.
- `docs/reports/` — Hồ sơ kết quả kiểm thử và báo cáo nghiệm thu qua các mốc phát triển.
