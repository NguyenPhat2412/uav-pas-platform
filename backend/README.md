# UAV PAS Backend

## Chạy test PostgreSQL thật (kiểm thử khoá dòng & tranh chấp đồng thời)

Đảm bảo Postgres.app đang chạy ở cổng `5500` và đã có database `uav_stabilization` (dùng cùng user/password trong `backend/.env`), sau đó chạy:

```bash
UAV_STABILIZATION_DB_URL=jdbc:postgresql://127.0.0.1:5500/uav_stabilization \
UAV_STABILIZATION_DB_USER=postgres \
UAV_STABILIZATION_DB_PASSWORD=<mat_khau_trong_backend_.env> \
./mvnw -Dtest='MarketplaceConcurrencyPostgresTest' -Duav.build.directory=/tmp/uav-build-s0 test
```
