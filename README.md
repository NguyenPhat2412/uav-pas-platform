# Nhánh `admin`: Cổng Quản trị

Đường dẫn: `/admin`. Mã nguồn nằm ở `frontend/src/app/(admin)` và các component admin trong `frontend/src/components/<tính năng>`. Nhánh này được đồng bộ từ `main`.

## Các thay đổi

### Cài đặt nguồn thời tiết (Admin → Cài đặt)

Component `components/weather/WeatherProviderSettingsSection.tsx`, chỉ hiện với người có quyền `PERMISSION_MANAGE`. Các mục cài đặt:

- **Nguồn dữ liệu:** Open-Meteo (không cần key) hoặc OpenWeatherMap.
- **API key:**
  - Server mã hoá key bằng AES-256-GCM. Giao diện chỉ biết key đã được cấu hình hay chưa, không bao giờ nhận lại key.
  - Có nút xoá key.
- **Thời gian sống của cache:** 1–120 phút.
- **Chặn cất cánh khi NO_GO:** mặc định tắt. Khi tắt, hệ thống chỉ ghi nhận NO_GO vào sự kiện bắt đầu bay.

API dùng cho mục này là `GET/PUT /api/v1/admin/weather/provider`.

### Ngưỡng an toàn bay

Trang Cài đặt có thêm 4 ngưỡng an toàn bay trong nhóm SAFETY:

- Gió giật tối đa.
- Tầm nhìn tối thiểu.
- Lượng mưa tối đa.
- Chỉ số Kp tối đa.

Nhãn của các ngưỡng là `settings.labels.uav_safety_*`.

### Trung tâm cảnh báo

- **Cảnh báo mới `MISSION_WEATHER_HAZARD` (mức WARNING):** xuất hiện khi một nhiệm vụ sẽ bay trong 6 giờ tới vào vùng dự báo NO_GO. Cảnh báo dẫn tới `/operations/missions/{id}`.
- **Backend:** `AdminAlertController` chỉ còn gọi `AlertCenterService`, đường dẫn lấy từ `ApiRoutes`.

### Khác

- **Thống kê gói dịch vụ:** component `AdminPlanStats`.
- **Trình duyệt file:** trang `/admin/files`.
- **Tầng dữ liệu:** các panel admin lấy dữ liệu qua hook của feature, không gọi API trực tiếp.

## Kiểm tra

```bash
cd frontend && node --test tests/m3-admin.test.mjs tests/weather-safety.test.mjs tests/plan-stats.test.mjs tests/admin-files.test.mjs
```
