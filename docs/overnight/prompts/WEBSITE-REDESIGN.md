# Làm lại trang chủ + chuẩn hoá nội dung website công khai và 3 cổng (customer, operations, admin)

Đọc trước `docs/overnight/README.md` (luật git, phạm vi thư mục, không push/deploy, không tắt server),
`docs/overnight/UI-GUIDE.md` (màu, chữ, bố cục kiểu Shopee) và nếu chưa làm xong thì làm trước
`docs/overnight/prompts/UI-REVIEW-9-FIXES.md` (điểm 1 "minh hoạ", 2 ảnh, 5 RFQ/3P, 7 nút nổi, 8 danh mục dùng chung —
prompt này dùng lại kết quả đó, không làm trùng). Mỗi phiên chỉ làm phần của mình, chỉ sửa thư mục được phân; cần phiên
khác thì ghi `REQUEST` vào `docs/overnight/BOARD.md`. Ảnh hiện trạng: `docs/overnight/evidence/0416-ui-final/`.

## Định vị sản phẩm (mọi câu chữ phải khớp)
**UAV PAS là nền tảng điều phối dịch vụ bay UAV đứng giữa.** Khách chọn **dịch vụ** (không chọn đội bay), đăng ký cho
**dự án**, UAV PAS **giao đơn cho đội bay đã xác minh**, khách **theo dõi chuyến bay mô phỏng** như theo dõi giao hàng và
nhận kết quả. Chủ đội bay đăng ký làm đối tác để nhận đơn. Đây là **đồ án demo**: không bay thật, giá và thanh toán là
**minh hoạ**, phần cốt lõi được kiểm chứng là **điều phối + mô phỏng bay**.

## Luật nội dung chung (áp cho mọi trang của cả 3 cổng)
1. **Cấm cụm mâu thuẫn mô hình:** "chọn nhà cung cấp", "chọn đối tác", "so sánh báo giá", "báo giá đối tác", "RFQ",
   "đấu thầu", "chào giá", "sàn 3P", "3P", "kết nối ngay đơn vị bay". Thay bằng: "UAV PAS điều phối đội bay đã xác minh".
2. **Cấm tuyên bố chưa chứng minh:** "kích hoạt ngay trong ngày", "phản hồi trong ~5 phút", "có mặt hiện trường N giờ",
   "thanh toán VietQR EMVCo", "GNSS FIXED/FLOAT", "RTK", "SLA", "chính thức", "100%", "digital twin thật/thời gian thực".
   Thời gian triển khai/bàn giao chỉ được ghi kèm "dự kiến · minh hoạ".
3. **Không lộ mã kỹ thuật:** không hiển thị enum thô (`UAV_RENTAL`, `AREA_INSPECTION`, `AERIAL_RECORDING`,
   `DATA_COLLECTION`, `PENDING_DISPATCH`…). Luôn qua nhãn i18n (`displayLabel`/khoá dịch hiện có).
4. **Bỏ chữ trang trí tiếng Nhật** cạnh tiêu đề tiếng Việt ("運用ポータル", "料金プラン", "流れ", "主要機能",
   "飛行パターン", "提供サービス", "機体の構造", "操縦者"…). Bản tiếng Nhật của trang (locale `ja`) vẫn giữ.
5. **Ít chữ, nhiều icon:** tiêu đề ≤ 8 từ, mô tả khối ≤ 25 từ, thẻ ≤ 2 dòng mô tả. Thuật ngữ chuyên môn (AGL, GSD,
   overlap, DPU, IAMSAR, HMAC, Signed-URL, YOLOv8s, EMVCo) **không** xuất hiện ở trang chủ; chỉ ở trang chi tiết kỹ thuật
   nếu thật cần, kèm giải thích ngắn.
6. **Ảnh:** giảm phụ thuộc ảnh USGS; không dùng ảnh có logo tổ chức khác; mỗi khối tối đa 1 ảnh; thiếu ảnh → khung icon
   theo UI-GUIDE §4. Ảnh nguồn công cộng còn dùng thì giữ ghi công ở `/credits`, không rải chú thích nguồn khắp trang.
7. **Thêm vào test content-guard** của thư mục mình mọi cụm ở mục 1–4 để không tái phạm.

---

## S2 — Customer (`customer/**`): trang chủ + các trang công khai + cổng khách

### A. Trang chủ mới (`src/app/(public)/page.tsx` → `src/components/marketing/HomeLanding.tsx`)
Tối đa **6 khối**, mục tiêu chiều cao **≤ 5 màn hình ở 1280px và ≤ 8 màn hình ở 390px** (hiện ≈ 13.000px / 23.000px):
1. **Hero:** 1 câu tiêu đề (vd. "Đặt dịch vụ bay UAV cho dự án của bạn"), 1 câu phụ, **ô tìm dịch vụ** (gửi tới
   `/services?q=`), 2 nút: "Khám phá dịch vụ" (chính) và "Đăng ký đối tác đội bay" (phụ). 1 ảnh/slider ảnh thật không logo.
2. **Lưới icon danh mục:** dùng nguồn danh mục dùng chung (điểm 8 của UI-REVIEW-9-FIXES), mỗi ô icon tròn + nhãn 1–2 từ,
   bấm mở `/services?category=`.
3. **Dịch vụ nổi bật:** 4–8 thẻ lấy **dữ liệu thật** từ `GET /api/v1/public/marketplace/listings` (tái dùng component thẻ
   dịch vụ của chợ `/customer/services`, không viết thẻ mới): ảnh, tên, giá đỏ + nhãn minh hoạ, huy hiệu "Đối tác đã xác
   minh" + sao — **không tên đội bay**. Có trạng thái tải (skeleton), rỗng, lỗi.
4. **Cách hoạt động — 4 bước bằng icon:** Chọn dịch vụ → Vẽ vùng bay & chọn lịch → UAV PAS giao đội bay đã xác minh →
   Theo dõi chuyến bay & nhận kết quả. Tái dùng `HomeProcessRoute` nếu hợp, rút chữ.
5. **Mô phỏng bay (điểm nhấn khoá luận):** hình minh hoạ đường bay quét lưới (SVG/ảnh tĩnh nhẹ, không tải 3D nặng) + 3–4
   ô chỉ số (tiến độ, pin, tín hiệu, còn lại) như màn theo dõi; nút "Xem cách hoạt động" tới `/how-it-works`.
6. **Dải đối tác + kêu gọi cuối trang:** "Có đội UAV? Trở thành đối tác" với 3 lợi ích bằng icon (nhận đơn từ nền tảng ·
   phân công kỹ sư & UAV · theo dõi ví minh hoạ) + nút đăng ký; sau đó footer hiện có.

**Đưa ra khỏi trang chủ** (giữ component nếu trang khác dùng; xoá import thừa, không xoá file đang được dùng nơi khác):
`HomeLandingCapabilitiesSection` (6 thẻ công nghệ nhiều thuật ngữ), `HomeDroneAnatomy` (cấu tạo phần cứng — lạc đề),
`HomeHistoryTimeline`, khối bảng giá phần mềm, bộ sưu tập ảnh USGS "Góc nhìn thực địa", form liên hệ đầy đủ (thay bằng 1
nút "Liên hệ tư vấn" tới `/contact`), `ScrollEngagementPopup` trên trang chủ. `HomeMissionPlanner` chỉ giữ nếu thu gọn
thành khối 5.

### B. Các trang công khai khác
- `/services`: trùng mục đích với chợ dịch vụ — hiển thị cùng lưới thẻ dữ liệu thật + bộ lọc danh mục/tỉnh; bỏ bảng thông
  số dài khỏi thẻ, đưa vào trang chi tiết.
- `/pricing`: định vị lại theo mô hình chợ: **Khách hàng** — miễn phí tạo tài khoản, trả theo dịch vụ đã đặt (minh hoạ);
  **Đối tác đội bay** — 3 gói theo `service_plans` + phí nền tảng lấy từ cấu hình công khai (`/api/v1/public/site-info`,
  khoá `marketplace.*_fee_rate`), **không viết cứng số**. Bỏ "kích hoạt ngay trong ngày".
- `/how-it-works`: đúng 4 bước như khối 4, thêm phần mô phỏng bay; không nói tới RFQ.
- `/digital-twin`: phạm vi đồ án **không** có digital twin thật → đổi thành trang **"Mô phỏng bay"** (đường bay quét lưới,
  fail-safe, chỉ số liên kết) hoặc redirect về `/how-it-works`; cập nhật link ở header/footer.
- `/solutions`, `/about`, `/faq`, `/contact`, `/terms`, `/privacy`: áp luật nội dung chung; FAQ trả lời theo đúng mô hình
  (khách không chọn đội bay, giá minh hoạ, dữ liệu demo); about ghi rõ đây là đồ án demo cá nhân.
- Header công khai: tối đa 5 mục điều hướng, không cắt chữ ở 1024/1280/1440px (đã sửa — giữ nguyên khi đổi mục).

### C. Cổng khách (`/customer/*`)
Rà mọi trang theo luật nội dung chung (đặc biệt mục 1, 3): dashboard, chợ dịch vụ, chi tiết, dự án, đơn hàng, theo dõi,
hồ sơ, hoá đơn, thông báo, đào tạo. Không còn lối vào RFQ/"so sánh báo giá" phía khách.

### Test & kiểm tra (S2)
- **Cập nhật có chủ đích** `tests/public-website-contract.test.mjs` và `tests/marketplace-landing-i18n.test.mjs` theo cấu
  trúc 6 khối mới (khẳng định đủ 6 khối, ô tìm kiếm, CTA, dữ liệu thẻ lấy từ API) — không xoá độ phủ, không hạ assert về
  rỗng. Mở rộng `tests/content-guard.test.mjs` với danh sách cấm ở luật chung.
- `npx tsc --noEmit && npm run lint && npm test`; tự kiểm 390px / 1024px / 1280px: không cuộn ngang, không nhãn bị cắt.
- i18n đủ vi/en/ja cho mọi chuỗi mới; SEO: `<title>`/description/OG cho trang chủ theo định vị mới.

## S3 — Operations (`operations/**`): cổng đội bay
Áp luật nội dung chung cho mọi trang `/operations/*` (tổng quan, đơn được giao, đội UAV, kỹ sư, dịch vụ, ví, mô phỏng,
việc hôm nay của kỹ sư, thời tiết, kiểm toán): bỏ RFQ/đấu thầu/chào giá, không enum thô, bớt thuật ngữ trên màn tổng quan
(icon + số, chi tiết ở trang riêng), bỏ chữ trang trí tiếng Nhật. Thêm danh sách cấm vào content-guard của operations.
`npx tsc --noEmit && npm run lint && npm test`; kiểm 390px + 1280px.

## S4 — Admin (`admin/**`): cổng quản trị
Áp luật nội dung chung cho mọi trang `/admin/*`; admin là nội bộ nên **được** giữ thuật ngữ kỹ thuật ở trang cấu hình hạ
tầng, nhưng nhãn điều hướng/tiêu đề phải ngắn, không "3P", không enum thô ở bảng/badge (dùng nhãn i18n), không chữ trang trí
tiếng Nhật. Trang marketplace của admin dùng đúng từ "Đối tác đội bay", "Giao đơn". Thêm danh sách cấm vào content-guard.
`npx tsc --noEmit && npm run lint && npm test`; kiểm 390px + 1280px.

## S0 — Backend (`backend/**`) — chỉ khi cần
Nếu nhãn hiển thị đang lấy thẳng từ dữ liệu DB có cụm cấm (tên gói `service_plans`, mô tả dịch vụ seed, cấu hình công
khai), sửa bằng migration mới. Không đổi API trừ khi frontend `REQUEST`.

---

## Xong việc
Commit nhỏ theo tiền tố của phiên (`feat(customer): redesign homepage…`, `fix(operations): …`), ghi `DONE` kèm hash vào
`docs/overnight/BOARD.md`, nêu chiều cao trang chủ mới ở 1280px và 390px (đo bằng ảnh chụp toàn trang). Không push,
không deploy.
