# Overnight run — luật chung cho mọi phiên agent

Mỗi phiên Antigravity **phải đọc hết file này trước khi làm**, rồi đọc `BOARD.md` và prompt của phiên mình
trong `prompts/`. Phiên giao diện (S1–S4) đọc thêm `UI-GUIDE.md`. File này thắng mọi suy đoán; nếu prompt của phiên mâu thuẫn với file này, theo file này.

## 1. Mục tiêu đêm nay

Biến UAV PAS thành **chợ dịch vụ UAV kiểu Shopee, do nền tảng đứng giữa**:

- Khách hàng chỉ thấy dịch vụ mang thương hiệu UAV PAS (huy hiệu "Đối tác đã xác minh" + điểm đánh giá),
  **không thấy tên đội bay**. Nền tảng tự giao đơn cho đội bay phù hợp.
- Chủ đội bay (ví dụ 10 UAV, chỉ có kỹ sư điều khiển, không có dev) tự đăng ký, khai báo UAV/kỹ sư, chọn dịch
  vụ từ mẫu, nhận đơn, phân công — **toàn bộ bằng giao diện**, không cần API.
- Khách đăng ký dịch vụ **theo từng dự án**. Đặt hàng dễ như Shopee: chọn dịch vụ → "Đăng ký cho dự án" →
  vẽ vùng bay → chọn lịch → xác nhận.
- Đơn đang bay được theo dõi bằng **trình mô phỏng** (`/api/v1/simulation`) như theo dõi giao hàng.

## 2. Luật dữ liệu (bắt buộc)

1. **Không còn mock.** Mọi dữ liệu hiển thị phải đến từ PostgreSQL qua API backend. Cấm mảng hằng số giả,
   `setTimeout` giả lập API, JSON tĩnh làm dữ liệu nghiệp vụ, `Math.random()` làm số liệu.
2. Mỗi thực thể nghiệp vụ có đủ **GET (list + detail, phân trang) / POST / PATCH / DELETE** (DELETE là xoá mềm
   khi dữ liệu có lịch sử: đơn, hoá đơn, nhiệm vụ). Hành động nghiệp vụ dùng endpoint động từ:
   `POST /orders/{id}/cancel`, `/start`, `/complete`, `/respond` — theo kiểu đã có trong `ApiRoutes.java`.
3. Dữ liệu mẫu cho demo chỉ được tạo bằng **Flyway migration seed** hoặc `*DataInitializer` phía backend,
   luôn ghi rõ là dữ liệu minh hoạ. Frontend không bao giờ tự bịa dữ liệu.
4. Trạng thái rỗng / đang tải / lỗi là trạng thái thật: skeleton khi tải, màn rỗng có nút hành động, lỗi có
   nút thử lại. Không lấp chỗ trống bằng dữ liệu giả.

## 3. Luật nội dung (đã có test `content-guard` kiểm tra)

- Dự án demo cá nhân của Nguyễn Phát. **Không** tên/logo VJU hay trường nào. Không từ ngữ quân sự.
- Không bay thật; không tuyên bố điều không chứng minh được (RTK cm, SLA, VAT, "chính thức", 100%).
- Mọi giá, thanh toán, ví, payout ghi nhãn **"minh hoạ"**.
- Đăng nhập ưu tiên Google; email+mật khẩu chỉ cho tài khoản nhân sự do admin cấp.
- Giao diện **ít chữ, nhiều icon/widget, kiểu Shopee nhưng màu UAV PAS** — chi tiết trong `UI-GUIDE.md`; số liệu chi tiết để ở trang chi tiết.
- Mọi chuỗi giao diện qua i18n (vi / en / ja), không viết cứng chữ trong component.

## 4. Phân vai phiên — ai được sửa gì

| Phiên | Thư mục được sửa | Không được sửa |
|---|---|---|
| **S0 Backend (chủ hợp đồng API)** | `backend/**`, `api-contract/**`, `docs/overnight/CONTRACT.md` | `customer/` `admin/` `operations/` `mobile/` |
| **S1 Mobile** | `mobile/**` | `backend/`, 3 cổng web |
| **S2 Customer web** | `customer/**` | `backend/`, cổng khác, `mobile/` |
| **S3 Operations web** (đội bay + kỹ sư) | `operations/**` | như trên |
| **S4 Admin web** (nền tảng, kiểm duyệt, giao đơn) | `admin/**` | như trên |

- **Chỉ S0 được tạo Flyway migration.** Migration mới nhất hiện là `V61`. S0 dùng số tiếp theo, không bao giờ sửa
  migration đã có.
- Phiên frontend cần API mới → **ghi yêu cầu vào `BOARD.md`**, không tự sửa backend. Trong lúc chờ, làm phần
  giao diện dựa trên hợp đồng trong `CONTRACT.md` (gọi đúng URL dự kiến, hiện trạng thái lỗi rõ ràng nếu 404).
- Mobile lấy code dùng chung bằng `npm run sync:shared` (sinh `mobile/src/shared` từ web). Không sửa tay
  `mobile/src/shared`.

## 5. Giao tiếp giữa các phiên — `BOARD.md`

- Đầu mỗi chu kỳ làm việc: đọc `BOARD.md` + `git log --oneline -20`.
- Ghi **nối thêm** (không xoá dòng của phiên khác) theo mẫu:
  `- [2026-11-18 23:10] [S2→S0] REQUEST: GET /api/v1/projects/{id}/subscriptions (cần cho trang Dự án)`
  Loại dòng: `REQUEST`, `DONE`, `CONTRACT-CHANGED`, `BLOCKED`, `HANDOFF`, `QUESTION`.
- S0 trả lời mọi `REQUEST` bằng `DONE` (kèm commit hash) hoặc `QUESTION`. Đổi hợp đồng thì ghi
  `CONTRACT-CHANGED` và cập nhật `CONTRACT.md` trong cùng commit.
- Kẹt quá 30 phút ở một việc → ghi `BLOCKED` kèm lý do rồi chuyển sang việc khác trong danh sách.

## 6. Luật git và môi trường

- Làm trên nhánh hiện tại; **commit nhỏ, thường xuyên**, chỉ `git add` đúng file của phiên mình
  (`git add <đường dẫn>`, không `git add -A`). Tiền tố message theo phiên: `feat(mobile): …`, `feat(backend): …`.
- **Cấm**: `git stash`, `git reset`, `git checkout -- .`, `git clean`, `git push --force`, rebase, đổi nhánh.
  Nhiều phiên dùng chung một thư mục làm việc.
- **Không push, không deploy production.** Người giám sát sẽ deploy sau khi kiểm tra.
- Không tắt/khởi động lại server đang chạy (backend 8080, web 3100/3200/3300, Metro 8081, Docker, Postgres).
- Maven luôn chạy với thư mục build riêng: `./mvnw -Duav.build.directory=/tmp/uav-build-<phiên> test`.

## 7. Định nghĩa "xong" cho mỗi việc

Một việc chỉ được ghi `DONE` khi:

1. Lệnh kiểm tra của phiên chạy xanh (xem prompt phiên): typecheck + lint + test.
2. Màn hình liên quan gọi API thật, đã thử ít nhất một lần với backend local (8080) có dữ liệu trong DB.
3. Đã commit. Không để file của phiên mình ở trạng thái dở dang khi kết thúc chu kỳ.

## 8. Thứ tự ưu tiên đêm nay

1. Luồng đặt hàng xuyên suốt: dịch vụ → đăng ký cho dự án → giao đơn → đội bay nhận → bay mô phỏng → bàn giao → đánh giá.
2. Xoá mock còn sót, nối API thật cho mọi màn đã có.
3. CRUD đầy đủ cho: dự án, gói đăng ký theo dự án, listing dịch vụ, đội UAV, kỹ sư, đơn hàng, đánh giá.
4. Đánh bóng giao diện theo luật "ít chữ, nhiều icon".

Ngoài phạm vi đêm nay: ví/rút tiền thật, đấu giá công khai, voucher/flash sale, chat trực tiếp khách ↔ đội bay.

## 9. Không bao giờ tự kết thúc phiên trước 6:00 sáng

- Hết việc, đang chờ API của phiên khác, hoặc vừa ghi DONE → **không kết thúc lượt**. Chạy:
  `bash docs/overnight/wait-for-work.sh <S0|S1|S2|S3|S4>`
  Lệnh này đứng chờ tới khi BOARD có việc mới cho phiên mình (hoặc 20 phút), rồi in ra việc cần làm.
- Làm theo nội dung lệnh in ra, rồi lại chạy lệnh chờ. Lặp đến khi lệnh báo đã tới 6:00.
- Trong lúc chờ API, luôn còn việc: làm giao diện theo CONTRACT (hiện ErrorState khi 404), rà UI-GUIDE §6, viết test.
