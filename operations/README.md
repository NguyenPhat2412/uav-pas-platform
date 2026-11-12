# UAV PAS Platform — Cổng Vận hành & Mô phỏng Bay (`operations/`)

Ứng dụng Next.js độc lập phục vụ **Cổng Vận hành, Trạm mặt đất, Tìm kiếm Cứu nạn AI và Trung tâm Mô phỏng Bay Số (`/operations/*`)** tại cổng mặc định `http://localhost:3200` (tương ứng trực tiếp với nhánh `operations` trên GitHub).

## Phạm vi cô lập (`check-architecture.mjs`)

- **Routes (`src/app/`):** Chỉ chứa `(operations)`, `health` và cổng đăng nhập tại `/` (**25 route entries**, **354 file nguồn**). Không chứa bất kỳ route hoặc component nào của `customer`, `public` hay `admin`.
- **Chức năng chính:**
  - Tổng quan Vận hành & Trung tâm Điều phối nhiệm vụ.
  - Gợi ý phân công thông minh (`SmartDispatchCard` chấm điểm UAV & người vận hành theo khoảng cách Haversine, dung lượng pin, tải trọng và trạng thái bảo trì).
  - Phiếu kiểm tra an toàn trước bay điện tử (`MissionPreflightCard`) & Sổ nhật ký giờ bay (`OperatorLogbookSummary`).
  - Trung tâm Mô phỏng Bay Số (`/operations/simulation` — diễn tập nhiệm vụ thực tế, cấu hình gió/tốc độ thời gian, thử nghiệm tình huống khẩn cấp quay về điểm xuất phát RTH, đối chiếu vùng trời & nhật ký phiên chạy).
  - Buồng lái Tìm kiếm Cứu nạn AI (`/operations/sar-cockpit` — luồng nhận diện KV260 Edge AI và bản đồ tìm kiếm).
  - Quản lý Đội bay UAV, Trạm mặt đất (kèm thời tiết trạm), Thiết bị & Lệnh bảo trì.

## Chạy và kiểm thử

```bash
cd operations
npm install
npm run dev                  # http://localhost:3200
npm run architecture:check   # Kiểm tra cô lập kiến trúc
npm run typecheck            # Kiểm tra kiểu TypeScript
npm run lint                 # Kiểm tra ESLint
npm test                     # Chạy 54 kiểm thử hợp đồng & thuật toán
```
