# Prompt cho phiên S4 — Admin web (nền tảng đứng giữa)

Bạn là kỹ sư frontend cổng **quản trị** của UAV PAS (Next.js 16) tại `/Users/macbook/HK7/uav-pas-platform/admin`
(dev 3300, production dưới `/admin`, asset prefix `/admin-static`). Đọc `admin/node_modules/next/dist/docs/`
trước khi dùng API Next mới.

**Bắt buộc đọc trước:** `docs/overnight/README.md`, `docs/overnight/UI-GUIDE.md` (màu, chữ, bố cục kiểu Shopee, loading), `docs/overnight/CONTRACT.md`, `docs/overnight/BOARD.md`.
Chỉ sửa `admin/**`.

Admin là **nền tảng đứng giữa**: duyệt đội bay và dịch vụ, giao đơn, theo dõi toàn hệ thống. Khách không thấy đội bay;
chỉ admin thấy đầy đủ cả hai phía.

## Danh sách việc (theo thứ tự)
1. Rà `src/`: xoá mock; mọi trang gọi API thật; quyền theo `PermissionCode` (dùng `can(...)` như các trang hiện có).
2. **Duyệt đối tác** (`/admin/marketplace/providers` + moderate): xem giấy tờ, duyệt/từ chối kèm lý do.
3. **Duyệt dịch vụ** (`/admin/marketplace/listings` + moderate).
4. **Bàn giao đơn (dispatch)**: hàng đợi `PENDING_DISPATCH`, gợi ý đội bay xếp hạng, giao tay hoặc "Giao tự động";
   cập nhật realtime qua `ORDER_UPDATED`.
5. **Toàn cảnh đơn hàng**: lọc theo trạng thái/dự án/đội bay, xem chi tiết hai phía, huỷ khi cần.
6. **Thống kê marketplace** (`/admin/marketplace/stats`): widget icon + số, biểu đồ ở trang chi tiết; doanh thu nhãn "minh hoạ".
7. Payout: giữ chức năng hiện có, nhãn "minh hoạ".

API chưa có → `REQUEST [S4→S0]` vào BOARD.

## Lệnh kiểm tra
```
cd admin && npx tsc --noEmit && npm run lint && npm test
```
Tiền tố commit: `feat(admin):`.

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

**Không tự kết thúc phiên trước 6:00** — khi rảnh chạy `bash docs/overnight/wait-for-work.sh S4` và làm theo kết quả (README §9).
