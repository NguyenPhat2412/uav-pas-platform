# Hướng dẫn UI/UX — "gần như Shopee, nhưng là UAV PAS"

Mọi phiên frontend (S1–S4) **đọc file này trước khi viết giao diện**. Mục tiêu: dễ dùng, ít chữ, nhiều hình và icon,
chữ nhỏ gọn dễ nhìn — học **cách bố trí và luồng** của Shopee, nhưng giữ **màu, font, component** của UAV PAS.
Không sao chép logo, tên, màu cam hay hình ảnh của Shopee.

## 1. Màu sắc — chỉ dùng token, không viết mã màu mới

| Vai trò | Mobile (`mobile/src/styles/tokens.ts`) | Web (`src/styles/globals.css`) | Giá trị |
|---|---|---|---|
| Thương hiệu, nút chính, giá, badge số | `colors.primary` | `--uav-color-primary` / `bg-primary` | `#ab2523` đỏ UAV PAS |
| Hover / nhấn | `colors.primaryHover` | `--uav-color-primary-hover` | `#8f1c1a` |
| Nền nhạt cho icon, chip đang chọn | `colors.primaryLight` | `--uav-color-primary-light` | `#fdf2f2` |
| Chữ chính / phụ / mờ | `colors.text` / `textSecondary` / `muted` | `--uav-color-text…` | slate 900 / 600 / 500 |
| Nền trang / thẻ / viền | `colors.canvas` / `surface` / `border` | `--background` / `--card` / `--uav-color-border` | |
| Cảnh báo / lỗi | `colors.warning*` / `danger*` | `--uav-color-warning*` / `danger*` | |

- Đỏ thương hiệu dùng **tiết kiệm**: nút hành động chính, giá, badge số, tab đang chọn. Phần còn lại trung tính slate.
- Trạng thái "an toàn/xong" dùng slate (như `clearanceTone.GO`), không dùng xanh lá chói.
- Mobile cấm `#hex` trong component (`architecture:check` sẽ fail). Web dùng class Tailwind theo token.

## 2. Chữ — nhỏ gọn, dễ đọc

| Cấp | Mobile (`font.*`) | Web | Dùng cho |
|---|---|---|---|
| caption | 12 | `text-xs` | nhãn dưới icon, chú thích, badge |
| small | 13 | `text-[13px]` | mô tả ngắn trên thẻ |
| body | 15 | `text-sm` | nội dung chính |
| title | 17 / 600 | `text-base font-semibold` | tên dịch vụ, tiêu đề thẻ |
| heading | 22 / 700 | `text-xl font-bold` | tiêu đề trang |
| price | title + `colors.primary` 700 | `text-primary font-bold` | giá (kèm nhãn "minh hoạ" cỡ caption) |

- Font Inter (đã cấu hình). Tối đa **2 dòng** tên trên thẻ (`numberOfLines={2}` / `line-clamp-2`), mô tả 1 dòng.
- Nhãn dưới icon **1–2 từ**: "Khảo sát", "Đang bay", "Bàn giao". Câu dài để trong tooltip / `accessibilityLabel`.
- Tôn trọng cỡ chữ người dùng chọn (`TextSizeContext` trên mobile).

## 3. Mẫu bố cục học từ Shopee

1. **Trang chủ**: ô tìm kiếm trên cùng → banner trượt (ảnh thật) → **lưới icon danh mục 4–5 cột** (icon tròn nền
   `primaryLight`, nhãn 1 từ) → thẻ "Gói theo dự án" → lưới dịch vụ đề xuất.
2. **Thẻ dịch vụ** (lưới 2 cột mobile, 4–5 cột web): ảnh bìa tỉ lệ 4:3 bo `radius.card` → tên 2 dòng → hàng icon
   nhỏ (📍 tỉnh · ⏱ bàn giao) → giá đỏ + "minh hoạ" → huy hiệu "Đối tác đã xác minh ⭐4.8 (32)". **Không tên đội bay.**
3. **Chi tiết dịch vụ**: ảnh lớn trượt được → giá + huy hiệu → hàng icon thông số → khối "Bạn nhận được" dạng
   checklist icon → đánh giá → **thanh nút cố định đáy màn hình**: "Đăng ký cho dự án" (đỏ, rộng).
4. **Đặt hàng 3 bước** có thanh tiến trình ở trên: Dự án → Vùng bay (bản đồ) → Lịch & xác nhận. Mỗi bước 1 màn,
   nút "Tiếp" cố định đáy, có thể quay lại không mất dữ liệu.
5. **Thanh trạng thái đơn** 5 icon có badge số: ⏳ Chờ xác nhận · 📅 Chờ bay · 🛩️ Đang bay · 📦 Bàn giao · ⭐ Đánh giá.
6. **Theo dõi đơn** như theo dõi giao hàng: bản đồ với UAV mô phỏng + timeline dọc các mốc, mốc hiện tại tô đỏ.
7. **Tài khoản**: lưới ô icon (như `AccountQuickGrid` sẵn có) thay cho danh sách dài.
8. Số liệu chi tiết, bảng, biểu đồ → **trang chi tiết riêng**, không nhồi vào trang chủ.

## 4. Hình ảnh sinh động

- Dùng ảnh có sẵn trong `customer/public/images/**` (services, uav-photos, hero-slides, process…) và ảnh bìa listing
  (`coverImageUrl`, lưu trên R2 qua media API). Định dạng webp, có `alt` mô tả.
- Không hotlink ảnh từ web khác, không ảnh có logo thương hiệu khác. Ảnh nguồn công cộng giữ ghi công như hiện có.
- Thiếu ảnh → khung màu `primaryLight` + icon lucide của danh mục, không để ô trống xám.
- Icon: `lucide-react` (web) / `lucide-react-native` (mobile), nét 1.75–2, cỡ 20–24 trong lưới, 16 trong dòng chữ.
- Chuyển động nhẹ: nhấn thu nhỏ 0.97, fade-in thẻ 150–200 ms; tắt khi người dùng bật Reduce Motion.

## 5. Loading — đã có sẵn, dùng đúng chỗ

| Tình huống | Dùng | Không dùng |
|---|---|---|
| Vào cổng / kiểm tra phiên đăng nhập (web) | `UavLoader` 3D (đã tự trễ 300 ms, chờ nhanh thì không hiện) | |
| Chuyển trang trong cổng (web) | `(portal)/loading.tsx` → `PageSkeleton`; trang có hình dạng riêng thì làm skeleton đúng hình (lưới thẻ, bảng, form) | `UavLoader`, spinner giữa trang |
| Mở app (mobile) | Splash gốc giữ đến khi kiểm tra phiên xong; quá 1.5 s → `AppSplash` với `UavLoader3D` | màn trắng |
| Lần tải đầu của màn (mobile) | `LoadingState` (đã là `SkeletonList`) hoặc `Skeleton` ghép đúng hình thẻ | `ActivityIndicator` giữa màn |
| Đổi trang danh sách / lọc | `placeholderData: keepPreviousData` — giữ dữ liệu cũ, mờ nhẹ | xoá trắng rồi tải lại |
| Mở lại app | cache React Query đã lưu theo user (mobile) → hiện ngay, làm mới ngầm | |
| Nút đang gửi | spinner nhỏ trong nút + khoá nút | khoá cả màn |
| Kéo xuống | pull-to-refresh | |

Trạng thái rỗng: hình minh hoạ/icon lớn + 1 câu ngắn + 1 nút hành động ("Tạo dự án đầu tiên"). Lỗi: `ErrorState`
(mobile) / `PortalErrorView` / `Alert` (web) với nút "Thử lại".

## 6. Kiểm tra trước khi commit một màn hình

- [ ] Không chuỗi cứng (i18n vi/en/ja), không mã màu mới, không dữ liệu giả.
- [ ] Mỗi khối có icon; nhãn ≤ 2 từ; tên ≤ 2 dòng.
- [ ] Có đủ 4 trạng thái: đang tải (skeleton đúng hình) · có dữ liệu · rỗng · lỗi.
- [ ] Nút chính nổi bật duy nhất mỗi màn; vùng chạm ≥ 44 pt; tương phản chữ đạt AA.
- [ ] Mobile: thử iPhone cỡ nhỏ (SE) và lớn (17 Pro); web: thử 375 px và desktop, không cuộn ngang.
