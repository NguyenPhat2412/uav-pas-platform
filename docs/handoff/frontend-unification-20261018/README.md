# Bàn giao frontend một ứng dụng — 18/10/2026

## Kết quả

Frontend canonical ở `/Volumes/D/Codex/projects/uav-pas-platform/frontend` dùng duy nhất một Next application. 56 trang được chuyển vào features; route entries ở `src/app`. Website cùng ba khu vực customer, operations, admin dùng origin `http://localhost:3100`. Không còn thư mục hoặc runtime `apps`, `packages`, `legacy` trong frontend.

Giao diện, ảnh thực tế, cookie session, quyền theo từng trang/thao tác, trạng thái form và hợp đồng API được bảo toàn. Chỉ thay import, vị trí mã, prefix URL và cấu hình chạy. Một dòng hướng dẫn ở trang chủ được sửa để không còn mô tả khách hàng là ứng dụng riêng; favicon sử dụng logo VJU hiện có.

`management-shop` chỉ được đọc để tham khảo tổ chức, không chỉnh sửa. Các thay đổi backend DTO/controller/service của luồng khác được giữ nguyên. Chỉ cập nhật phần chạy frontend trong Compose, runner CI, dependency audit, workflow, template PR, Dependabot và hướng dẫn hiện hành.

## Kiểm chứng

- Build production và TypeScript đạt trên cây nguồn đã loại bỏ thư mục cũ.
- 158/158 kiểm thử hợp đồng đạt, không skip. Bao gồm 5 kiểm thử chống đua phiên đăng nhập chuyển từ legacy sang API client duy nhất.
- Architecture guard: một manifest/lockfile, không workspace/package cũ, 56 route entries mỏng, không gọi fetch trực tiếp trong feature.
- Lint không lỗi; 66 cảnh báo tồn tại trong mã chuyển sang (unused declarations, hook dependencies, img). Không tắt quy tắc để che lỗi.
- Trình duyệt desktop 1440×900, mobile 390×900: 103 lượt kiểm tra màn hình/đăng nhập/quyền trên một origin; menu mobile mở/đóng/Escape; ảnh không lỗi, không tràn ngang; lượt cuối không có page error, server error hoặc console error. Các màn hình portal đọc dữ liệu backend chính, không submit form nghiệp vụ.
- 16 bước browser E2E trên PostgreSQL/MinIO cô lập: tạo/gửi nhiệm vụ, xác nhận, phân công và đổi thiết bị, từ chối tiếp nhận revision cũ, báo vướng mắc, tiếp nhận lại, chạy nhiệm vụ, kiểm tra upload MIME/kích thước, phục hồi upload lỗi, tải báo cáo, hoàn tất, trả tồn kho đúng một lần, chống ghi đè tệp, quyền chủ sở hữu/người vận hành, audit, đăng xuất trên điện thoại.
- 40 lượt API đồng thời có giới hạn trên stack cô lập: 0 lỗi. Runner dọn đúng các container/volume thử nghiệm do nó tạo. Chi tiết an toàn trong `runner.json`, `browser.json` cùng thư mục.
- Luồng phụ trách ảnh xác nhận riêng 14/14 lượt desktop/mobile, SHA các ảnh khớp, đầy đủ credit; metadata ảnh được đổi sang đường dẫn mới.
- Compose config và whitespace check đạt. Chưa chạy GitHub-hosted CI hoặc build Docker image trong phiên này.

Trình duyệt: Google Chrome headless qua Playwright; Browser plugin/skill không có trong phiên. Ảnh chụp và kết quả UI tại `/Volumes/D/Codex/outputs/uav-frontend-unified-20261018/`. Bộ UI có fixture permission-denied riêng trong test, không đưa cơ chế giả lập vào production.

## Chạy và phối hợp

- `cd frontend && npm start` chạy standalone production trên 127.0.0.1:3100; `npm run dev` để phát triển. `PORT` và `UAV_FRONTEND_HOST` có thể cấu hình khi cần.
- Backend canonical ở 127.0.0.1:18082, được luồng backend kiểm chứng health/readiness UP. Runtime metadata backend ở `docs/work/backend-runtime-20261018/backend.json`.
- Runtime frontend ở `docs/work/frontend-unification-20261018/frontend-runtime.json`; registry chung `docs/work/local-runtime/processes.json` chỉ còn backend và frontend.
- Phát triển mới tuân theo `docs/architecture/FRONTEND_STRUCTURE.md`; xem `FRONTEND_ROUTE_MIGRATION.md` để ánh xạ URL. Không tái tạo kiến trúc cũ.
- Không commit/push trong đợt này; giữ nguyên các thay đổi đang làm việc của những luồng khác.

## Sao lưu và dữ liệu

`docs/work/frontend-unification-20261018/frontend-before.tar.gz` gồm 479 file trước thay đổi, kể cả ảnh/cấu hình chưa commit; cả 479 SHA-256 đã đối chiếu đúng. Có manifest và patch Git trước sửa, bảng ánh xạ nguồn/route/asset; các thư mục đã nghỉ nằm tại `retired/`, ngoài source/build và Git-ignore. 39 ánh xạ tài nguyên phục vụ trực tiếp đã đối chiếu byte với nguồn cũ.

Cấu hình `.env` gốc được sao lưu riêng trước khi đổi duy nhất `FRONTEND_PORT` từ loopback 3300 sang loopback 3100. Các thông tin DB, storage và bí mật được giữ nguyên. Không restore/reset DB hoặc object storage. Nhiệm vụ/tệp do bài E2E tạo chỉ nằm trong stack thử nghiệm đã được dọn; không dùng DB chính cho bài tạo dữ liệu.
