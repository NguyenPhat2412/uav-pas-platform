# Nhánh `operations`: Cổng Vận Hành, Trạm Mặt Đất & KV260 Edge AI (`:3200`)

Nhánh này **chỉ chứa ứng dụng Web `operations/` và tác tử biên `edge/kv260/`** (được tách cô lập từ `main`):

- `operations/` — Cổng Vận hành (`http://localhost:3200`): gợi ý điều phối thông minh, phiếu kiểm tra an toàn trước bay, trung tâm mô phỏng bay số (`/operations/simulation`), buồng lái SAR AI (`/operations/sar-cockpit`), bảo trì đội bay và biên tập học liệu đào tạo.
- `edge/kv260/` — Tác tử thu thập telemetry & nhận diện mục tiêu biên trên phần cứng AMD Xilinx Kria KV260.

## Chạy và kiểm thử độc lập

```bash
cd operations
npm install
npm run dev                  # http://localhost:3200
npm run architecture:check && npm run typecheck && npm run lint && npm test
```
