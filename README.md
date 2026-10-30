# Nhánh `customer`: Cổng Khách hàng

Đường dẫn: `/customer`. Mã nguồn nằm ở `frontend/src/app/(customer)` và `features/missions/components/customer`. Nhánh này được đồng bộ từ `main`.

## Các thay đổi

### Thời tiết tại điểm bay (`SiteWeather`)

- **Thẻ thời tiết:** màn hình dùng chung `PreflightWeatherCard` với cổng Vận hành, thay cho phần gọi Open-Meteo trực tiếp từ trình duyệt trước đây.
- **Nguồn dữ liệu:** hook `useSiteWeather` lấy dữ liệu qua `useMissionWeather`, tức là đi qua backend.

### Tạo và sửa nhiệm vụ (`CustomerMissionCreate`, `CustomerMissionEdit`)

- **Gợi ý thời tiết:** `MissionWeatherAdvisor` đánh giá thời tiết tại điểm đã chọn trên bản đồ, đúng thời điểm khách hàng muốn bay.
- **Áp dụng khung giờ:** khách hàng bấm "Dùng khung giờ này" trên một khung đề xuất. Giờ bắt đầu được đổi theo khung đó, còn thời lượng bay và ngày đã chọn giữ nguyên (`utils/flight-window.ts`).
- **Chỉ mang tính tham khảo:** khách hàng vẫn có thể gửi yêu cầu. Bộ phận vận hành sẽ quyết định cất cánh.

### Khác

- **Bố cục:** đổi tên `CustomerLayout.tsx` và `CustomerUi.tsx` theo PascalCase.
- **Tầng dữ liệu:** các màn hình khách hàng lấy dữ liệu qua hook của feature, với cache tách riêng theo từng người dùng.
- **Sửa giao diện:** hàng cảm biến lấp đầy lưới ở bước xem lại, bước xem lại hiển thị kế hoạch bay, và nút trợ lý không còn che nút cuối.

## Kiểm tra

```bash
cd frontend && node --test tests/m4-customer.test.mjs tests/weather-safety.test.mjs
```
