# Nhánh `operations`: Cổng Vận hành

Đường dẫn: `/operations`. Mã nguồn nằm ở `frontend/src/app/(operations)` và `frontend/src/components/mission/operations`. Nhánh này được đồng bộ từ `main`.

## Các thay đổi

### Chi tiết nhiệm vụ (`OperationsMissionDetail`)

- **Thẻ thời tiết trước bay:** `PreflightWeatherCard` nằm trong phần Tổng quan và lấy dữ liệu từ `GET /api/v1/weather/missions/{id}`. Thẻ hiển thị:
  - Kết luận GO, CAUTION, NO_GO hoặc UNAVAILABLE, kèm điểm an toàn.
  - Gió ở độ cao 10 m và 80/120 m, so với giới hạn của UAV.
  - Gió giật, hướng gió, tầm nhìn, mưa, nhiệt độ, độ ẩm và chỉ số Kp.
  - Hệ số hao pin dự kiến.
  - Lý do dẫn tới kết luận và các khung giờ bay đề xuất trong khoảng 06:00–18:00.
- **Khi bấm Bắt đầu bay:**
  - Sự kiện được ghi kèm thời tiết, ví dụ "weather NO_GO, wind 80 m 12.5 m/s".
  - Nếu admin bật chặn cất cánh và kết quả là NO_GO, backend trả `409 MISSION_WEATHER_UNSAFE`. Giao diện hiển thị thông báo lỗi đã dịch, theo khoá `opsMissions.apiErrors.MISSION_WEATHER_UNSAFE`.
  - Nếu không lấy được thời tiết, việc cất cánh vẫn không bị chặn.

### Trạm mặt đất (`StationPanel`)

Bảng trạm có thêm cột thời tiết (`StationWeatherCell`), dùng dữ liệu `GET /api/v1/weather/stations` và cần quyền `STATION_READ`.

### Khác

- **Cấu trúc:** các màn hình vận hành nằm trong `components/<tính năng>` và lấy dữ liệu qua `hooks/<tính năng>`.
- **Điều phối nhiệm vụ:** `OperationsMissionDetail` và `ResourceRedispatch` gọi các bước tuần tự (gán trạm, UAV, nhân sự, upload media, chuyển trạng thái) qua `useMissionWorkflow`, không gọi API trực tiếp.

## Kiểm tra

```bash
cd frontend && node --test tests/m2-operations.test.mjs tests/operations-workflows.test.mjs tests/weather-safety.test.mjs
```
