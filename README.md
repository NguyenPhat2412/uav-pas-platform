# Nhánh `backend`

Spring Boot 4.1.1 (Java 21), mã nguồn ở `backend/`. Nhánh này được đồng bộ từ `main`.

## 1. Cấu trúc package và chuẩn hoá controller

Các tầng đứng ngang cấp với `common`, `config`, `error`, `security`, mỗi tầng chia theo tính năng (thư mục `modules/` đã bỏ):

```text
com/uav/platform/
├── common/  config/  error/  security/
├── controller/<tính năng>/         entity/<tính năng>/       repository/<tính năng>/
├── service/<tính năng>/            service/impl/<tính năng>/
├── dto/{request,response,record}/<tính năng>/
├── enums/  mapper/  specification/  transport/   (mỗi thư mục chia theo tính năng)
└── config/mission, config/permission             (DataInitializer)
```

`ArchitecturePackageTest` bắt buộc bố cục `<tầng>/<tính năng>` và chặn tạo lại `modules/`. Test tích hợp theo tính năng nằm ở `integration/<tính năng>`.


- **Đường dẫn tập trung:** mọi đường dẫn REST lấy từ `config/routes/ApiRoutes.java`, nhóm theo module. Ví dụ: `ApiRoutes.Weather.BASE + ApiRoutes.Weather.FORECAST`. Lớp `common/constant/RestEndpoint.java` đã bị xoá.
- **Controller chỉ điều phối:** nó nhận request, kiểm tra quyền bằng `@PreAuthorize` rồi gọi service. Mọi nghiệp vụ nằm trong `service/impl`.
- **Controller cảnh báo:** `AdminAlertController` đã chuyển phần xử lý sang `AlertCenterService` và dùng quyền `PERMISSION_MANAGE`.
- **Kiểm thử bảo vệ quy ước:** `ApiRoutesTest` giữ cho đường dẫn đúng chuẩn. `ArchitecturePackageTest`, `ModuleDtoStructureTest`, `EntityDtoBoundaryTest` và `ConstantsIntegrityTest` kiểm tra cấu trúc package và ranh giới entity/DTO.

## 2. Module `weather`

Các lớp của tính năng `weather`, mỗi lớp nằm trong `<tầng>/weather/`:

| Thành phần | Nội dung |
|---|---|
| `entity` | `WeatherObservationCache` (cache theo ô lưới), `WeatherProviderSettings` (chỉ có một dòng, id = 1) |
| `repository` | Kế thừa `JpaRepository` và `JpaSpecificationExecutor` |
| `specification` | `withinGrid`, `byProvider`, `fetchedAfter` |
| `dto/request`, `dto/response`, `dto/record` | Không có record lồng trong ServiceImpl hay Controller |
| `service/impl/weather/WeatherServiceImpl` | Gọi Open-Meteo 25 giờ tới, NOAA Kp và OpenWeatherMap. Cache-aside; khi lỗi thì trả dữ liệu cũ hoặc UNAVAILABLE |
| `service/impl/weather/FlightSafetyEvaluatorOperations` | Chấm điểm GO/CAUTION/NO_GO, tính hệ số hao pin, đề xuất 3 khung giờ bay |
| `service/impl/weather/WeatherCipherOperations` | AES/GCM/NoPadding, khoá 256 bit, IV 12 byte, tag 128 bit. Không bao giờ trả về API key |
| `controller/weather/WeatherController` | 5 endpoint, liệt kê bên dưới |

| Phương thức | Đường dẫn | Quyền |
|---|---|---|
| GET | `/api/v1/weather/forecast?lat&lng&time&maxWindMs` | Đã đăng nhập |
| GET | `/api/v1/weather/missions/{missionId}` | Quyền đọc nhiệm vụ |
| GET | `/api/v1/weather/stations` | `STATION_READ` |
| GET/PUT | `/api/v1/admin/weather/provider` | `PERMISSION_MANAGE` |

Tích hợp với các module khác, vẫn giữ tương thích ngược qua constructor overload và `ObjectProvider<WeatherService>`:

- **`MissionLifecycleServiceImpl`:** khi bắt đầu bay, hệ thống ghi kết luận thời tiết vào sự kiện. Nếu bật chặn cất cánh và kết quả là NO_GO, nó trả `409 MISSION_WEATHER_UNSAFE`.
- **`AlertCenterServiceImpl`:** tạo cảnh báo `MISSION_WEATHER_HAZARD` cho các nhiệm vụ sẽ bay trong 6 giờ tới vào vùng dự báo NO_GO.
- **Cấu hình:** `app.weather.encryption-secret`, mặc định dùng JWT secret. `app.weather.remote-enabled` được tắt khi chạy test.

## 3. Plan statistics và storage

- **Thống kê gói:** API thống kê cho trang quản trị, gồm `PlanStatisticsService` và `PlanStatsResponse`.
- **Module `storage`:** cung cấp trình duyệt file cho admin.
- **JaCoCo:** đã thêm plugin vào `pom.xml`.

## Kiểm thử

```bash
cd backend
./mvnw spotless:apply
./mvnw -B -Duav.build.directory=/tmp/uav-verify verify jacoco:report
# Báo cáo độ phủ: /tmp/uav-verify/site/jacoco/index.html
```

> Luôn dùng `-Duav.build.directory=...` để không ghi đè `backend/target` của server đang chạy. Không dừng các tiến trình localhost hoặc Docker.

Kết quả gần nhất:

- 1184 test, 0 lỗi. 191 test được bỏ qua vì cần Docker.
- Độ phủ của module weather là 99,2% dòng và 96,8% nhánh. Controller, entity, DTO và specification đạt 100%. Service đạt 99,1%.
