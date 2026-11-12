# Nhánh `database`: Lược đồ PostgreSQL & Flyway Migrations

Nhánh này **chỉ chứa các tập tin cơ sở dữ liệu và cấu hình khởi chạy PostgreSQL** (được tách cô lập từ `main`):

- `backend/src/main/resources/db/migration/` — Toàn bộ các bản nâng cấp lược đồ Flyway tuần tự (`V1` đến `V47`).
- `docker-compose.yml` — Cấu hình khởi chạy PostgreSQL 16 & dịch vụ lưu trữ phục vụ phát triển cục bộ.
- `docs/architecture/UAV_PAS_SCHEMA_INVENTORY.md` & `BACKEND_DATABASE_MIGRATIONS.md` — Tài liệu danh mục bảng và quy chuẩn migration.
