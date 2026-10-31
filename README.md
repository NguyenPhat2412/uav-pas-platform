# Nhánh `testcase`: Kiểm thử

Nhánh này được đồng bộ từ `main` và tổng hợp bộ kiểm thử của đợt thay đổi ngày 31/10/2026.

## Kết quả gần nhất

| Bộ | Lệnh | Kết quả |
|---|---|---|
| Backend | `./mvnw -B -Duav.build.directory=/tmp/uav-verify verify jacoco:report` | 1184 test, 0 lỗi. 191 test được bỏ qua là các test cần Docker |
| Định dạng | `./mvnw spotless:check` | Sạch |
| Frontend | `node --test tests/*.test.mjs` | 221/221 pass |
| Kiểu | `npm run typecheck` | Sạch |
| Kiến trúc | `npm run architecture:check` | OK |

Độ phủ JaCoCo của module `weather` là 99,2% dòng và 96,8% nhánh:

| Package | Dòng |
|---|---|
| controller, dto, entity, enums, specification | 100% |
| service.impl | 99,1% |

## Test mới

Backend, thư mục `backend/src/test/java/com/uav/platform/` (bố cục `<tầng>/<tính năng>` giống mã nguồn):

| File | Tầng | Nội dung chính |
|---|---|---|
| `specification/weather/WeatherObservationSpecificationsTest` | DAO | Lọc theo ô lưới, nhà cung cấp và thời điểm lấy dữ liệu trên H2. Dùng `@SpringBootTest` vì Spring Boot 4 tách `@DataJpaTest` ra module riêng |
| `service/weather/WeatherCipherOperationsTest` | Service | AES-GCM mã hoá rồi giải mã đúng, IV ngẫu nhiên, phát hiện dữ liệu bị sửa |
| `service/weather/FlightSafetyEvaluatorOperationsTest` | Service | Từng ngưỡng NO_GO/CAUTION, điểm, hệ số pin, khung giờ đề xuất |
| `service/weather/WeatherServiceImplTest` | Service | Cache-aside, trả dữ liệu cũ khi lỗi, ngoài 24 giờ, toạ độ hoặc thời gian sai, cập nhật nhà cung cấp |
| `controller/weather/WeatherControllerTest` | REST | 5 endpoint, mã lỗi 400 |
| `service/impl/mission/MissionWeatherPreflightTest` | Service | Chặn khi NO_GO nếu bật cờ, chỉ ghi nhận nếu tắt, lỗi thời tiết không chặn |
| `service/impl/alerts/AlertCenterWeatherTest` | Service | Cảnh báo `MISSION_WEATHER_HAZARD`, CAUTION không tạo cảnh báo, lỗi không ảnh hưởng cảnh báo khác |
| `config/routes/ApiRoutesTest` | Quy ước | Thêm đường dẫn Weather |
| `service/impl/billing/PlanStatisticsIntegrationTest` | Service | Thống kê gói |

Frontend, thư mục `frontend/tests/`:

- `weather-safety.test.mjs`: route khớp với `ApiRoutes.Weather`, không dùng `fetch`, không dùng màu xanh lá hay `rounded-full`, i18n vi/en/ja đồng bộ, áp dụng khung giờ bay, cả ba cổng đều dùng thẻ thời tiết.
- `plan-stats.test.mjs`, `admin-files.test.mjs`.
- `business-route-contract.test.mjs`: đối chiếu route frontend với `ApiRoutes`.

## Lưu ý khi chạy

- **Thư mục build riêng:** luôn chạy Maven với `-Duav.build.directory=/tmp/...` để không ghi đè `backend/target` của server đang chạy.
- **Tiến trình đang chạy:** không dừng các tiến trình localhost hoặc Docker để chạy test.
- **Thời tiết thật:** cấu hình test tắt `app.weather.remote-enabled`, nên test không gọi API thời tiết thật.
