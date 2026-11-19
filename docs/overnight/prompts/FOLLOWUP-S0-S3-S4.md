# Bổ sung phần còn thiếu của `UI-REVIEW-9-FIXES.md` + `WEBSITE-REDESIGN.md` (S0, S3, S4, dọn S2)

> **Cập nhật 19/11 16:30:** S3 đã xong (`fd569c24`, `9ce58d92`, supervisor review đạt — 70/70 test). **Còn S0, S4, S2.**
> S4 chép `UnifiedFloatingLauncher` và cách dịch mã 409/enum từ `operations/` (đã làm mẫu) thay vì từ customer.
> Sau khi S0 xong V67, S1/S2/S3 **giữ** lớp che `cleanEntityName`/`sanitizeEntityName` (vô hại), không cần gỡ.

Supervisor đã review `01f81330`, `b2cbddb9`, `0a0088a0`, `03327647`: backend, customer, mobile **đạt**, test xanh.
Còn thiếu: S0 chưa có migration dữ liệu demo; S3 và S4 **chưa làm gì** từ cả hai prompt (commit cuối 05:16).
Đọc trước `docs/overnight/README.md`, `docs/overnight/UI-GUIDE.md`, rồi đọc phần của mình trong
`docs/overnight/prompts/UI-REVIEW-9-FIXES.md` và `docs/overnight/prompts/WEBSITE-REDESIGN.md` — prompt này **không thay**
hai prompt đó, chỉ chỉ rõ chỗ còn thiếu và cách làm. Chỉ sửa thư mục được phân. Không push, không deploy, không tắt server.

---

## S0 — Backend (`backend/**`, `api-contract/**`)
Hiện frontend đang **che** dữ liệu xấu bằng code (mobile `utils/marketplace/clean-text.ts` cắt "— minh hoạ" và đổi
RTK→GNSS; customer `MarketplaceListingCard.tsx` có regex chặn ảnh USGS). Sửa tận gốc bằng **một migration mới
`V67__clean_demo_names_covers_and_disable_rfq.sql`** (không sửa V1–V66):
1. Bỏ "— minh hoạ", "– minh hoạ", "(minh hoạ)", "· minh hoạ", "minh hoạ" ở cuối **tên**: listing `title`, tên UAV,
   họ tên user demo (`demo_*`), tên dự án, tên đội bay (`provider_profiles`). Mô tả dài giữ nguyên. Dùng `UPDATE … WHERE`
   có điều kiện, chạy được cả DB trắng lẫn DB đã có dữ liệu, chạy lại không đổi gì.
2. Ảnh bìa listing demo: mỗi listing một `cover_image_url` **khác nhau**, chỉ chọn trong danh sách ảnh **sạch** S1 đã mở
   kiểm tra: `services/aerial-inspection-grid.webp`, `services/aerial-recording-cinema.webp`,
   `services/uav-rental-fleet.webp`, `solutions/infra-3d-survey.webp`, `solutions/edge-ai-kv260-tracking.webp`,
   `solutions/sar-emergency-response.webp`, `process/step-05-data-handover.webp`. **Cấm**: `usgs-*`,
   `data-collection-corridor`, `managed-ops-command`, `step-01-select-service`. Thiếu ảnh → `NULL`.
3. `system_configurations`: `marketplace.rfq_enabled = 'false'` (không xoá code RFQ).
4. Seed Java (`DevSeedDataInitializer` và tương tự): sửa luôn để DB trắng không sinh lại tên có "minh hoạ"/ảnh cấm.
5. Test: migration trên DB trắng; assert không tên nào chứa "minh ho", không `cover_image_url` trùng giữa listing demo,
   không đường dẫn ảnh cấm, `rfq_enabled = false`.
6. Ghi `CONTRACT-CHANGED` (dữ liệu demo đổi) để S1/S2 biết có thể **giữ** lớp che hiện có (không bắt buộc gỡ).

Lệnh: `cd backend && ./mvnw -q -Duav.build.directory=/tmp/uav-build-s0 spotless:apply test`.
Commit: `fix(backend): clean demo names and cover images, disable RFQ by default`.

## S3 — Operations (`operations/**`)
Làm **toàn bộ** phần S3 của cả hai prompt. Điểm bắt đầu cụ thể:
1. **3P/RFQ**: `src/messages/vi.json:128` "Sàn đối tác 3P" (và en/ja cùng khoá) → "Đối tác đội bay". `grep -rniE
   "3P|RFQ|đấu thầu|chào giá|báo giá"` toàn `src/` — ẩn mọi tab/nút/nhãn RFQ trên cổng đội bay (không xoá hàm API).
2. **Chữ Nhật trong catalog không phải `ja`**: `src/messages/sections/publicSite/en.json:21` (và các file vi/en khác) —
   bỏ ký tự kana/kanji trang trí.
3. **Minh hoạ** (UI-REVIEW điểm 1): không gắn vào tên; 1 badge nhỏ cạnh số tiền + 1 dòng chú thích cuối trang. Trang:
   đơn được giao, đội UAV, kỹ sư, dịch vụ, ví.
4. **Nút nổi** (điểm 7): trợ lý AI + chat không được đè nội dung. Tái dùng cách customer đã làm
   (`customer/src/components/shared/UnifiedFloatingLauncher.tsx` — **chép** sang operations, không import chéo).
5. **Ô chọn UAV + "Lưu phân công"** (điểm 9): kiểm tra lại sau `d8424ff9` ở cả màn phân công đơn (không chỉ trang đội
   UAV); "Lưu phân công" là `Button` outline có viền, disabled khi chưa đổi; "Bắt đầu bay mô phỏng" là nút chính duy nhất.
6. **Mã lỗi 409** từ S0: hiển thị đúng thông báo cho `UAV_TIME_CONFLICT`, `OPERATOR_TIME_CONFLICT`, `UAV_IN_USE`,
   `NO_UAV_AVAILABLE` (vi/en/ja) ở phân công, nhận đơn, bắt đầu bay.
7. Màn tổng quan: icon + số, bỏ thuật ngữ, không enum thô.
8. Mở rộng `tests/content-guard.test.mjs` với danh sách cấm của `WEBSITE-REDESIGN.md` mục 1–4 (lấy mẫu từ
   `customer/tests/content-guard.test.mjs`).

Kiểm tra: `npx tsc --noEmit && npm run lint && npm test`; chụp 390px + 1280px các trang đã sửa vào
`docs/overnight/evidence/followup/ops-*.png`. Commit nhỏ theo tiền tố `fix(operations): …`.

## S4 — Admin (`admin/**`)
Làm **toàn bộ** phần S4 của cả hai prompt. Điểm bắt đầu cụ thể:
1. **3P**: `src/messages/vi.json:122` "Sàn đối tác 3P" (+ en/ja) → "Đối tác đội bay"; grep thêm `3P|RFQ` trong `src/`.
   Nhãn cấu hình `marketplace_rfq_enabled` được giữ (trang cấu hình hệ thống) nhưng ghi rõ "(ngoài phạm vi đồ án)".
2. **Chữ Nhật trang trí**: `src/messages/sections/publicSite/vi.json:21` và các catalog vi/en khác.
3. **Thanh tab trang đang mở** (điểm 6): tối đa 6 tab, còn lại vào menu "…", không cắt nhãn ngắn; nút lối tắt trang
   thống kê không "…".
4. **Nút nổi** (điểm 7): như S3 (chép `UnifiedFloatingLauncher`), đặc biệt không đè số doanh thu ở
   `/admin/marketplace/stats`.
5. **Minh hoạ** (điểm 1): thống kê, đơn, payouts, dự án, duyệt dịch vụ.
6. **"Đang xác thực" chậm**: đo thời gian khi mở trực tiếp `/admin/marketplace/*`; nếu do gọi API tuần tự trước khi
   render, cho khung trang + skeleton render trước. Ghi số đo trước/sau vào dòng DONE.
7. Bảng/badge không enum thô; nhãn điều hướng ngắn. Mở rộng `tests/content-guard.test.mjs` như S3.

Kiểm tra: `npx tsc --noEmit && npm run lint && npm test`; chụp 390px + 1280px vào
`docs/overnight/evidence/followup/admin-*.png`. Commit theo tiền tố `fix(admin): …`.

## S2 — Customer (`customer/**`) — dọn nhỏ
1. Xoá file chết sau redesign (kiểm tra bằng grep không còn import nào trước khi xoá):
   `HomeLandingCapabilitiesSection.tsx`, `HomeLandingShowcaseSection.tsx`, `ScrollEngagementPopup.tsx`,
   `components/digital-twin/DigitalTwinShowcase.tsx`, `DigitalTwinViewer.tsx` (và phụ thuộc 3D nếu không còn ai dùng —
   **không** gỡ package khỏi `package.json` trong phiên này, chỉ ghi `REQUEST`).
2. Xoá khoá i18n chỉ file chết dùng (vd. `digitalTwin.explainer` có "Digital twin từ dữ liệu bay UAV") ở vi/en/ja.
3. Các trang `about`, `faq`, `how-it-works`, `digital-twin` đang viết cứng tiếng Việt: chuyển chuỗi sang i18n vi/en/ja.
4. Ảnh người USGS trong `UavPhoto.tsx` / `home-content.ts`: kiểm tra ảnh nào còn hiển thị ở trang công khai; ảnh có logo
   USGS thì thay bằng ảnh sạch (danh sách ở S0 mục 2) hoặc khung icon, giữ ghi công ở `/credits` cho ảnh còn dùng.
5. Đo và ghi chiều cao trang chủ ở 1280px và 390px (ảnh toàn trang) — mục tiêu ≤ 5 và ≤ 8 màn hình.
Kiểm tra: `npx tsc --noEmit && npm run lint && npm test`. Commit `chore(customer): …`.

---

## Xong việc
Mỗi phiên ghi `DONE` kèm hash + danh sách điểm đã sửa vào `docs/overnight/BOARD.md`. Không push, không deploy.
