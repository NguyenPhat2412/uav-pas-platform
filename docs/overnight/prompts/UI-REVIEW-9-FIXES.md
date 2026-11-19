# Sửa 9 điểm từ đợt review giao diện (mobile + 3 cổng web)

Mọi phiên đọc trước `docs/overnight/README.md` (luật git, phạm vi thư mục, không push/deploy, không tắt server) và
`docs/overnight/UI-GUIDE.md` (màu, chữ, bố cục kiểu Shopee). Mỗi phiên **chỉ làm phần của mình** bên dưới, chỉ sửa thư
mục được phân. Cần phiên khác làm gì → ghi `REQUEST` vào `docs/overnight/BOARD.md`. Bằng chứng review:
`docs/overnight/evidence/mobile/*.png`, `docs/overnight/evidence/0416-ui-final/`, `docs/overnight/evidence/0130-ui-auth/`.

## 9 điểm (tham chiếu)
1. Chữ "minh hoạ" quá dày: có trong tên dịch vụ, tên kỹ sư, tên UAV, tên dự án, giá, mô tả — thẻ lặp 3 lần, làm tên bị cắt.
2. Ảnh dịch vụ lặp (6 dịch vụ dùng 3 ảnh) và có ảnh in logo **"USGS"** của tổ chức khác.
3. Mobile: thanh tab đáy đè lên nội dung cuối màn (nút đỏ thẻ "Gói theo dự án" bị che).
4. Theo dõi bay: bản đồ chỉ có 1 ghim, không vẽ đường bay/vị trí UAV; báo "Đang bay" khi tiến độ 100% và còn 0 phút.
5. "Đấu thầu RFQ" còn hiện (ngoài phạm vi đã chốt); admin còn ghi "Sàn đối tác 3P" (trái mô hình nền tảng đứng giữa).
6. Admin: thanh tab trang đang mở và nút lối tắt bị cắt chữ hết ("Triển…", "Toàn cảnh đơn hà…").
7. Web: 2 nút tròn nổi (chat, trợ lý) đè lên nội dung mép phải (đè cả số doanh thu ở admin).
8. Danh mục không thống nhất: web 5 mục, mobile 8 mục.
9. Đội bay: ô chọn UAV bị cắt tên; nút "Lưu phân công" trông như chữ thường.

Quy tắc chung cho điểm 1 (mọi frontend): **không tự gắn "— minh hoạ" vào tên**. Hiển thị **một** nhãn nhỏ `minh hoạ`
(badge cỡ caption, màu muted) **ngay cạnh giá/số tiền**, và **một** dòng chú thích chung cuối trang hoặc trong footer
("Giá và giao dịch trên nền tảng là minh hoạ phục vụ đồ án"). Không xoá nhãn ở giá — luật nội dung (README §3) vẫn bắt
buộc. Cập nhật test content-guard nếu test đang đòi chuỗi cũ.

---

## S0 — Backend (`backend/**`, `api-contract/**`)
- **Điểm 1:** migration mới (số tiếp theo, không sửa migration cũ) bỏ hậu tố/cụm "— minh hoạ", "(minh hoạ)", "minh hoạ"
  khỏi **tên** dữ liệu demo: listing `title`, tên UAV, tên kỹ sư/người dùng demo, tên dự án, tên đội bay. Giữ chữ
  "minh hoạ" chỉ trong mô tả chung nếu cần. Chạy được trên DB đã có dữ liệu (UPDATE có điều kiện) và DB trắng.
- **Điểm 2:** cùng migration: mỗi listing demo một `cover_image_url` **khác nhau**, chọn trong
  `customer/public/images/{services,solutions,hero-slides,process,uav-photos}` — **không** dùng
  `uav-photos/usgs-plum-island-team*.webp` (có logo USGS); kiểm tra ảnh bằng cách mở file trước khi chọn. Thiếu ảnh phù
  hợp thì để `NULL` (frontend sẽ hiện khung icon theo UI-GUIDE §4), không dùng ảnh trùng.
- **Điểm 5:** migration đặt `system_configurations.marketplace.rfq_enabled = 'false'`. Không xoá code RFQ.
- Test: migration chạy trên DB trắng (`./mvnw ... test`), thêm assert không còn tên nào chứa "minh hoạ" và không còn
  `cover_image_url` trùng giữa các listing demo. Ghi `CONTRACT-CHANGED` nếu đổi dữ liệu frontend dựa vào.

## S1 — Mobile (`mobile/**`)
- **Điểm 1:** theo quy tắc chung (thẻ dịch vụ, chi tiết, đơn hàng, đội bay, kỹ sư, UAV).
- **Điểm 3:** mọi màn nằm trong tab (Trang chủ, Khám phá, Dự án, Hỗ trợ, Tôi) có khoảng đệm đáy bằng chiều cao tab bar
  + safe area (dùng hook/ hằng có sẵn của NativeTabs/expo-router nếu có, không đoán số cứng). Kiểm tra cuộn hết thấy trọn
  nút cuối cùng.
- **Điểm 4:** màn "Theo dõi chuyến bay": vẽ `waypoints` (đường bay dự kiến, nét đứt, màu muted) và `track` (vết đã bay,
  nét liền màu primary) từ `GET /api/v1/orders/{id}/tracking`; marker UAV tại `position` xoay theo `headingDeg`; tự
  zoom vừa đường bay. Khi `status == IN_PROGRESS` và `progressPct >= 100` hoặc `activeSimulation == false`: badge
  **"Đã bay xong · Chờ bàn giao"** thay cho "Đang bay", ẩn "Còn lại 0 phút".
- **Điểm 5:** ẩn mọi lối vào RFQ: đổi tiêu đề "Đơn đặt & Đấu thầu RFQ" → "Đơn được giao", bỏ tab "Sàn thầu RFQ",
  bỏ "Cần báo giá riêng? Mở thầu RFQ", "Đăng gói bay, nhận thầu RFQ…" (sửa chuỗi i18n vi/en/ja). Không xoá code API.
- **Điểm 8:** dùng danh mục dùng chung mà S2 xuất (xem phần S2) qua `npm run sync:shared`; `ServiceCategoryShowcase`
  đọc từ đó thay cho danh sách cứng.
- Kiểm tra: `npm run sync:shared && npx tsc --noEmit && npx expo lint && npm test && npm run architecture:check`;
  chụp `xcrun simctl io booted screenshot` các màn đã sửa vào `docs/overnight/evidence/mobile/fix-*.png`.

## S2 — Customer web (`customer/**`)
- **Điểm 1:** theo quy tắc chung trên chợ dịch vụ, chi tiết dịch vụ, dự án, đơn hàng, dashboard.
- **Điểm 2:** thẻ/chi tiết dịch vụ: `coverImageUrl` null → khung `primaryLight` + icon danh mục (UI-GUIDE §4). Gỡ
  `uav-photos/usgs-plum-island-team*.webp` khỏi mọi chỗ dùng trong UI (banner, landing); giữ ghi công ở trang credits
  nếu ảnh còn được dùng nơi khác — nếu không còn dùng thì ghi `REQUEST` để người dùng quyết định xoá file.
- **Điểm 4:** trang theo dõi đơn: cùng hành vi như S1 (vẽ `waypoints` + `track`, marker UAV, trạng thái "Đã bay xong ·
  Chờ bàn giao").
- **Điểm 7:** 2 nút nổi (chat hỗ trợ, trợ lý) không được đè nội dung: gom thành **một** nút nổi mở menu 2 lựa chọn,
  hoặc chừa lề phải cho vùng nội dung bằng chiều rộng nút + 16px trên desktop; trên 390px đặt trên thanh đáy/ không che
  nút hành động.
- **Điểm 8:** tạo **một** nguồn danh mục dùng chung (vd. `src/lib/marketplace/service-categories.ts`: key, nhãn i18n,
  icon lucide) khớp với danh mục backend (`ServiceOffering`/`MissionType` — đối chiếu API, không bịa); dùng cho thanh
  danh mục chợ dịch vụ; đăng ký file này trong danh sách sync của `mobile/scripts/sync-shared.mjs` qua `REQUEST` cho S1
  nếu file đó thuộc thư mục mobile. Thống nhất **8 mục tối đa**, mục "Tất cả" chỉ có trên web.
- Kiểm tra: `npx tsc --noEmit && npm run lint && npm test`; tự kiểm 390px + 1280px.

## S3 — Operations web (`operations/**`)
- **Điểm 1:** theo quy tắc chung (đơn được giao, đội UAV, kỹ sư, dịch vụ, ví).
- **Điểm 5:** ẩn lối vào RFQ trên cổng đội bay (nhãn, tab, nút); không xoá code API.
- **Điểm 7:** như S2 cho các nút nổi trên cổng vận hành.
- **Điểm 9:** ô chọn UAV: mỗi lựa chọn 2 dòng (mã serial đậm 1 dòng + model caption) hoặc hiện model trong dòng phụ
  dưới select khi đã chọn — không cắt mã serial. "Lưu phân công" thành nút thật (`Button` variant secondary/outline có
  viền, disabled khi chưa đổi gì), đặt cạnh nhau với thứ bậc rõ: "Bắt đầu bay mô phỏng" là nút chính duy nhất.
- Kiểm tra: `npx tsc --noEmit && npm run lint && npm test`; 390px + 1280px.

## S4 — Admin web (`admin/**`)
- **Điểm 1:** theo quy tắc chung (thống kê, đơn, payouts, dự án, duyệt dịch vụ).
- **Điểm 5:** đổi "Sàn đối tác 3P" → "Đối tác đội bay" (vi/en/ja); bỏ chữ "3P" ở mọi nhãn hiển thị.
- **Điểm 6:** thanh tab trang đang mở: tối đa 6 tab hiển thị, phần còn lại vào menu "…"; mỗi tab icon + nhãn đầy đủ
  (tooltip khi hẹp), không cắt nhãn ngắn. Nút lối tắt trên trang thống kê: icon + nhãn 2 dòng hoặc nhãn ngắn — không "…".
- **Điểm 7:** như S2 cho các nút nổi trên cổng admin (đang đè số doanh thu ở `/admin/marketplace/stats`).
- **Thêm:** đo thời gian màn "Đang xác thực" khi mở trực tiếp `/admin/marketplace/*` (ảnh review bị kẹt ở loader > 2.5s);
  nếu do gọi tuần tự nhiều API trước khi render, cho phần khung trang render trước bằng skeleton.
- Kiểm tra: `npx tsc --noEmit && npm run lint && npm test`; 390px + 1280px.

---

## Xong việc
Mỗi phiên: commit theo tiền tố của mình (`fix(mobile|customer|operations|admin|backend): …`), ghi `DONE` kèm hash và
điểm đã sửa vào `docs/overnight/BOARD.md`. Không push, không deploy.
