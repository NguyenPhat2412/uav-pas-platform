# Edge AI & Cổng Giao Tiếp MAVLink trên Xilinx Kria KV260

Thư mục này chứa runtime Python 3 triển khai trực tiếp trên board **Xilinx Kria KV260 Vision AI Starter Kit** (Ubuntu 22.04 LTS + Vitis AI DPU B3136). Agent đảm nhận vai trò cầu nối giữa bộ điều khiển bay **PX4 / ArduPilot**, bộ tăng tốc phần cứng **DPU** và **Spring Boot Backend** của nền tảng UAV-PAS phục vụ tìm kiếm cứu nạn (SAR), kiểm tra hạ tầng và khảo sát dân sự.

Suy luận AI chạy trực tiếp trên board KV260 (`vart.Runner` / `xir.Graph`), không chạy trong backend Java. Backend chỉ điều phối yêu cầu xử lý và lưu nhận kết quả phát hiện (`controller/sar/AiController.java`) cùng luồng dữ liệu hành trình bay (`controller/uav/TelemetryController.java`).

---

## 1. Cấu trúc thư mục

```text
edge/kv260/
├── agent/
│   ├── __init__.py          # Khởi tạo gói runtime KV260
│   ├── config.py            # Đọc cấu hình có kiểu dữ liệu từ biến môi trường / tệp .env
│   ├── offline_spool.py     # Hàng đợi SQLite3 WAL lưu-và-chuyển-tiếp khi đứt kết nối 4G/LTE
│   ├── mavlink_bridge.py    # Chuẩn hóa bản tin MAVLink v2 sang TelemetryReportRequest JSON
│   ├── dpu_detector.py      # Kiểm định SHA-256, chạy Vitis AI DPU, NMS & chiếu tọa độ WGS84
│   ├── cloud_client.py      # HTTP/TLS client thuần thư viện chuẩn kết nối Telemetry, AI & Media API
│   └── main.py              # CLI & tiến trình nền (daemon) quản lý vòng đời thiết bị biên
├── models/                  # Chứa các tệp mô hình .xmodel đã biên dịch cho DPU B3136
├── systemd/
│   └── uav-kv260-agent.service
├── tests/
│   └── test_agent.py        # Bộ kiểm thử đơn vị và tích hợp cục bộ
├── .env.example             # Mẫu cấu hình triển khai thực tế
└── requirements.txt         # Phụ thuộc tùy chọn cho luồng camera & cổng MAVLink trực tiếp
```

---

## 2. Mô hình Vitis AI (`.xmodel`) và kiểm định toàn vẹn SHA-256

Các tệp `.xmodel` có dung lượng lớn hơn 10 MB nên được bỏ qua trong `.gitignore`. Trước khi khởi chạy tiến trình suy luận trên DPU, cần đặt tệp vào `models/` và kiểm tra mã băm SHA-256 để đảm bảo tệp không bị lỗi trong quá trình sao chép:

| Tệp | Mục đích | SHA-256 |
|---|---|---|
| `models/yolo11s_kd_dpu.xmodel` | YOLO11s (knowledge distillation) biên dịch cho DPU | `20dc97aae118b24dc23edfb1d707a519cf97edc8c79b6419b4c08e9c4eb49176` |
| `models/yolov8_human_kv260_b3136.xmodel` | YOLOv8 phát hiện người phục vụ cứu nạn, DPU B3136 của KV260 | `c10bd89ab28ec4b4797a5a96949b8c591367ffb9b4fa7d4f33f34dbb2d75a09e` |

Kiểm tra nhanh bằng công cụ dòng lệnh của agent hoặc `shasum`:

```sh
cd edge/kv260
python3 -m agent.main --verify-models
# Hoặc kiểm tra thủ công:
shasum -a 256 models/*.xmodel
```

---

## 3. Tương thích hợp đồng API với Spring Boot Backend

1. **Luồng Telemetry (`POST /api/v1/uavs/{id}/telemetry`)**
   - Xác thực bằng khóa thiết bị qua header `X-Device-Key` (không gửi kèm `Authorization` trên cùng yêu cầu theo đúng quy tắc của `DeviceKeyAuthenticationFilter`).
   - Bộ chuyển đổi `MavlinkTelemetryAssembler` gom các bản tin MAVLink v2 (`GLOBAL_POSITION_INT`, `SYS_STATUS`, `BATTERY_STATUS`, `ATTITUDE`, `GPS_RAW_INT`, `HEARTBEAT`) sang đúng cấu trúc `TelemetryReportRequest`:
     - `latitude`, `longitude`: đổi từ `1e-7 deg` sang độ thập phân WGS84.
     - `altitudeAglMeters`: đổi `relative_alt` từ `mm` sang `m`.
     - `groundSpeedMs`: hợp tốc độ mặt đất `hypot(vx, vy)` từ `cm/s` sang `m/s`.
     - `headingDeg`: đổi `hdg` từ `cdeg` sang độ `[0..360)` (tự động dự phòng bằng góc `yaw` từ `ATTITUDE` khi `hdg = 65535`).
     - `rtkStatus`: ánh xạ chuẩn sang `NONE | SINGLE | FLOAT | FIXED`.
2. **Luồng Suy luận AI & Tọa độ mặt đất (`GET /api/v1/ai/missions/{missionId}/tasks` & `POST /api/v1/ai/tasks/{id}/results`)**
   - Xác thực bằng tài khoản dịch vụ biên qua header `Authorization: Bearer <UAV_BEARER_TOKEN>`.
   - Thực hiện tiền xử lý letterbox, chạy mô hình lượng tử hóa INT8 trên DPU, hậu xử lý NMS và chiếu tâm/chân khung bao đối tượng từ tọa độ điểm ảnh sang tọa độ địa lý WGS84 (`latitude`, `longitude`) dựa trên độ cao AGL, hướng mũi UAV, góc nghiêng gimbal và góc mở ống kính (`CAMERA_HFOV_DEG`, `CAMERA_VFOV_DEG`).
3. **Tải ảnh phát hiện qua URL ký sẵn (`MediaController`)**
   - Tự động thực hiện quy trình 4 bước: đăng ký siêu dữ liệu (`POST /api/v1/media`) -> lấy URL ký sẵn (`GET /api/v1/media/{id}/upload-url`) -> đẩy dữ liệu JPEG (`PUT`) -> xác nhận hoàn tất (`POST /api/v1/media/{id}/confirm`).
4. **Cơ chế lưu đệm ngoại tuyến (`OfflineSpool`)**
   - Sử dụng SQLite3 chế độ WAL lưu bền vững trên bộ nhớ của board với giới hạn số bản ghi dạng vòng (ring buffer) và thời gian chờ thử lại tăng theo cấp số nhân. Khi sóng 4G/LTE mất kết nối giữa chuyến bay, các mẫu telemetry và kết quả phát hiện người vẫn được ghi an toàn xuống đĩa và tự động phát bù theo đúng thứ tự FIFO ngay khi có mạng trở lại.

---

## 4. Cài đặt và vận hành trên Kria KV260 (Ubuntu 22.04)

```sh
# 1. Cài đặt các gói Python bổ trợ cho MAVLink và xử lý ảnh
cd /opt/uav-pas/edge/kv260
pip3 install -r requirements.txt

# 2. Thiết lập biến môi trường và thư mục lưu hàng đợi ngoại tuyến
sudo mkdir -p /etc/uav-kv260 /var/lib/uav-kv260
sudo chown ubuntu:ubuntu /var/lib/uav-kv260
sudo cp .env.example /etc/uav-kv260/agent.env
sudo nano /etc/uav-kv260/agent.env

# 3. Kiểm tra mô hình và chạy thử một chu kỳ đơn
python3 -m agent.main --verify-models
python3 -m agent.main --env-file /etc/uav-kv260/agent.env --once

# 4. Đăng ký dịch vụ tự khởi động cùng hệ thống qua systemd
sudo cp systemd/uav-kv260-agent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now uav-kv260-agent.service
sudo journalctl -u uav-kv260-agent.service -f
```

---

## 5. Chạy bộ kiểm thử tự động

Bộ kiểm thử sử dụng hoàn toàn thư viện chuẩn `unittest` và máy chủ `http.server` cục bộ trên cổng ngẫu nhiên, không cần kết nối phần cứng DPU hay mạng ngoài:

```sh
cd edge/kv260
python3 -m unittest discover -s tests -v
```
