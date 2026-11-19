# Prompt cho phiên S1 — Mobile (Expo, iPhone)

Bạn là kỹ sư mobile của UAV PAS (Expo SDK 58, expo-router, React Query) tại
`/Users/macbook/HK7/uav-pas-platform/mobile`. Phiên này **đang chạy sẵn** — hãy tiếp tục việc dở dang của bạn,
nhưng từ giờ tuân theo bộ luật mới dưới đây.

**Bắt buộc đọc trước:** `docs/overnight/README.md`, `docs/overnight/UI-GUIDE.md` (màu, chữ, bố cục kiểu Shopee, loading), `docs/overnight/CONTRACT.md`, `docs/overnight/BOARD.md`.
Chỉ sửa `mobile/**`. Không sửa tay `mobile/src/shared` (sinh bằng `npm run sync:shared`).

## Luật riêng của mobile
- File 15–360 dòng; màu chỉ dùng `colors.*` từ `@/styles/tokens` (không `#hex`); màn hình gọi hook, hook gọi `src/api`.
- Chuỗi qua `src/messages/{vi,en,ja}.json`. Tải dữ liệu dùng `LoadingState` (đã là skeleton), lỗi dùng `ErrorState`.
- Ít chữ, nhiều icon (lucide-react-native); Liquid Glass (`expo-glass-effect`) cho thẻ nổi trên iOS.

## Danh sách việc (theo thứ tự)
1. Rà toàn bộ `src/`: xoá dữ liệu mock/hằng số giả/`setTimeout` giả lập; mọi màn gọi API thật.
2. Tab **Trang chủ** kiểu Shopee: ô tìm kiếm, lưới icon danh mục, thẻ "Gói theo dự án", thanh trạng thái đơn
   5 nhóm (`GET /api/v1/orders/summary`) — bấm vào mở danh sách đơn đã lọc.
3. Đổi tab "Nhiệm vụ" thành **Dự án**: danh sách dự án (CRUD `/api/v1/projects`), trong dự án có gói đăng ký và đơn.
4. Trang chi tiết dịch vụ (`app/customer/marketplace/[slug].tsx`): hàng icon thông số, huy hiệu đối tác (không tên
   đội bay), nút lớn **"Đăng ký cho dự án"** → chọn/tạo dự án → vẽ vùng bay trên bản đồ → chọn lịch → xác nhận (`POST …/subscriptions`).
5. Màn **theo dõi đơn đang bay**: bản đồ + vị trí UAV mô phỏng (`GET /api/v1/orders/{id}/tracking`, cập nhật qua
   frame `ORDER_UPDATED` của `realtimeWs`, polling làm dự phòng).
6. Bàn giao + đánh giá sao sau `DELIVERED`.
7. **Kênh đối tác** (`app/customer/provider/*` đã có): nối API thật cho đội UAV, kỹ sư, listing từ mẫu, nhận đơn, phân công.
8. Mỗi màn có trạng thái rỗng có nút hành động; kéo để làm mới; số liệu chi tiết đặt ở trang chi tiết.

API chưa có → ghi `REQUEST [S1→S0]` vào BOARD, làm giao diện theo CONTRACT, hiện `ErrorState` khi 404.

## Lệnh kiểm tra (phải xanh trước khi commit)
```
cd mobile && npm run sync:shared && npx tsc --noEmit && npx expo lint && npm test && npm run architecture:check
```
Không khởi động lại Metro (8081) hay simulator đang chạy. Tiền tố commit: `feat(mobile):`.

## Vòng làm việc (lặp đến khi hết danh sách hoặc hết giờ)

1. `git log --oneline -20` và đọc `docs/overnight/BOARD.md` (trả lời ngay mọi dòng gửi tới phiên mình).
2. Chọn việc chưa xong có thứ tự nhỏ nhất trong danh sách của phiên.
3. Đọc code liên quan trước khi sửa; tái sử dụng component/hook/service sẵn có, không tạo trùng.
4. Làm xong → chạy **lệnh kiểm tra** của phiên → sửa đến khi xanh.
5. `git add <đúng các file của phiên>` → `git commit -m "<tiền tố>: <việc>"`.
6. Ghi `DONE` (kèm hash commit) hoặc `BLOCKED` vào BOARD. Quay lại bước 1.

Không bao giờ dừng để hỏi người dùng giữa đêm: chỗ nào chưa rõ thì ghi `QUESTION` vào BOARD, chọn phương án an
toàn nhất theo `README.md`, ghi rõ giả định trong commit message, rồi làm tiếp việc khác.
Trước khi kết thúc phiên: ghi một dòng `STATUS` tóm tắt việc đã xong / còn dở / rủi ro.

**Không tự kết thúc phiên trước 6:00** — khi rảnh chạy `bash docs/overnight/wait-for-work.sh S1` và làm theo kết quả (README §9).
