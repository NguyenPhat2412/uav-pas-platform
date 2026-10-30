# Nhánh `database`

Cơ sở dữ liệu là PostgreSQL, migration chạy bằng Flyway và nằm ở `backend/src/main/resources/db/migration/`. Nhánh này được đồng bộ từ `main`.

## Migration mới: `V36__weather_flight_safety_module.sql`

| Bảng | Mục đích |
|---|---|
| `weather_provider_settings` | Chỉ có một dòng (id = 1): nhà cung cấp (`OPEN_METEO` hoặc `OPENWEATHERMAP`), API key đã mã hoá AES-256-GCM, thời gian sống của cache tính bằng phút, cờ chặn cất cánh khi NO_GO, người và thời điểm cập nhật |
| `weather_observations_cache` | Cache dự báo theo ô lưới. Chỉ mục duy nhất trên `(grid_lat, grid_lng, target_hour, provider)` |

Thêm 4 ngưỡng an toàn vào `system_configurations` (category `SAFETY`). Admin chỉnh được các ngưỡng này trong trang Cài đặt.

| Khoá | Mặc định | Khoảng |
|---|---|---|
| `uav.safety.max_wind_gust_limit` | 15.0 m/s | 2–45 |
| `uav.safety.min_visibility_meters` | 3000 m | 500–20000 |
| `uav.safety.max_precipitation_mm` | 0.5 mm/giờ | 0–50 |
| `uav.safety.max_kp_index` | 5.0 | 1–9 |

## Quy tắc

- **Không sửa migration đã chạy.** Mọi thay đổi phải nằm trong một file `V<n>__mo_ta.sql` mới.
- **Sao lưu trước khi triển khai:** phải sao lưu database trước khi deploy lên VPS (xem `deploy/DEPLOY.md`).
- **Môi trường test:** test dùng H2 với `ddl-auto=create-drop` và tắt Flyway. Vì vậy entity phải khớp với schema của migration.
- **Ghi cache thời tiết không được làm hỏng luồng chính:** lỗi trùng khoá bị bỏ qua, và việc đánh giá chạy ngoài transaction của nơi gọi.
