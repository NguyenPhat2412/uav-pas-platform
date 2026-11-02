# Edge AI trên Kria KV260

Suy luận AI chạy trên board KV260 (DPU, Vitis AI), không chạy trong backend Java. Backend chỉ giao việc
và nhận kết quả phát hiện (module SAR, `controller/sar/AiController.java`).

## Model

Tệp `.xmodel` nặng hơn 10MB nên không lưu trong git (`.gitignore` bỏ qua `*.xmodel`). Đặt tệp vào `models/`
và đối chiếu SHA-256 trước khi nạp lên board:

| Tệp | Mục đích | SHA-256 |
|---|---|---|
| `models/yolo11s_kd_dpu.xmodel` | YOLO11s (knowledge distillation) biên dịch cho DPU | `20dc97aae118b24dc23edfb1d707a519cf97edc8c79b6419b4c08e9c4eb49176` |
| `models/yolov8_human_kv260_b3136.xmodel` | YOLOv8 phát hiện người, DPU B3136 của KV260 | `c10bd89ab28ec4b4797a5a96949b8c591367ffb9b4fa7d4f33f34dbb2d75a09e` |

```sh
shasum -a 256 edge/kv260/models/*.xmodel
```
