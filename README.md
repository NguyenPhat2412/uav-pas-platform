# Nhánh `backend`: Dịch vụ Backend Spring Boot & Hợp đồng API

Nhánh này **chỉ chứa mã nguồn Backend và đặc tả API** (được tách cô lập từ `main`):

- `backend/` — Dịch vụ Spring Boot 4.1 (Java 21), bảo mật JWT/RBAC, điều phối nhiệm vụ UAV, không phận NFZ, thời tiết, mô phỏng bay, thanh toán SePay/VietQR, hỗ trợ trực tuyến 2 chiều và bộ kiểm thử JUnit.
- `api-contract/` — Đặc tả OpenAPI (`openapi.json`) và bộ kiểm thử Postman (`postman_collection.json`).

## Chạy và kiểm thử độc lập

```bash
cd backend
./mvnw spotless:check
./mvnw spring-boot:run       # http://localhost:8080
./mvnw test
```
