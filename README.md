# Nhánh `ba`: Phân tích nghiệp vụ

Nhánh này chứa tài liệu nghiệp vụ trong `docs/ba/` và được đồng bộ từ `main`. README này tóm tắt các quy tắc nghiệp vụ của đợt thay đổi ngày 31/10/2026.

## Thời tiết và an toàn bay

### Mức đánh giá

| Mức | Ý nghĩa | Điểm |
|---|---|---|
| GO | Đủ điều kiện bay | 80–100 |
| CAUTION | Bay được nhưng cần thận trọng | Tối đa 79 |
| NO_GO | Không nên cất cánh | Tối đa 39 |
| UNAVAILABLE | Không có dữ liệu, ví dụ nguồn lỗi, quá 24 giờ hoặc nhiệm vụ chưa có vị trí | Không chấm điểm |

Cách tính điểm:

- Điểm khởi đầu là 100.
- Trừ 35 cho mỗi lý do NO_GO.
- Trừ 12 cho mỗi lý do CAUTION.
- Trừ thêm tối đa 20 theo tỉ lệ giữa sức gió và giới hạn.

### Lý do NO_GO

Các ngưỡng đều chỉnh được trong Admin → Cài đặt.

- Gió ở độ cao 80 m vượt giới hạn gió của UAV (`WIND_LIMIT_EXCEEDED`).
- Gió giật vượt 15 m/s (`WIND_GUST_EXCEEDED`).
- Mưa vượt 0,5 mm/giờ (`PRECIPITATION_UNSAFE`).
- Tầm nhìn dưới 3000 m (`VISIBILITY_TOO_LOW`).
- Chỉ số Kp từ 5 trở lên (`GEOMAGNETIC_STORM`), vì bão từ làm GPS và la bàn kém tin cậy.

### Khung giờ đề xuất

Hệ thống đưa ra 3 khung giờ ban ngày (06:00–18:00) có điểm cao nhất trong 24 giờ tới.

### Hệ số hao pin

Gió càng mạnh thì pin càng hao nhanh. Giao diện hiển thị hệ số hao pin, ví dụ ×1,25.

### Luồng theo vai trò

- **Khách hàng:** xem gợi ý thời tiết khi tạo hoặc sửa nhiệm vụ, và có thể áp dụng khung giờ đề xuất. Gợi ý chỉ mang tính tham khảo.
- **Vận hành:**
  - Xem thẻ thời tiết trong chi tiết nhiệm vụ.
  - Kết luận thời tiết được ghi vào sự kiện bắt đầu bay.
  - Nếu admin bật chặn cất cánh, nhiệm vụ NO_GO không thể bắt đầu (`MISSION_WEATHER_UNSAFE`).
- **Quản trị:**
  - Chọn nguồn dữ liệu, nhập API key và đặt thời gian sống của cache.
  - Bật hoặc tắt chặn cất cánh.
  - Nhận cảnh báo `MISSION_WEATHER_HAZARD` cho các nhiệm vụ trong 6 giờ tới gặp dự báo NO_GO.
- **Lỗi nguồn dữ liệu:** hệ thống dùng dữ liệu cache còn lưu. Nếu không có cache, kết quả là UNAVAILABLE. Lỗi thời tiết không bao giờ chặn cất cánh hay làm mất các cảnh báo khác.

## Chuẩn hoá kỹ thuật (không thay đổi nghiệp vụ)

- **Backend:** đường dẫn API tập trung trong `ApiRoutes`.
- **Frontend:** cấu trúc theo tính năng, với một tầng dữ liệu thống nhất.

Hành vi các màn hình hiện có không đổi.
