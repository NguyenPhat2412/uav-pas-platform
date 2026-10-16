# Evidence — điều phối operator, trạm, thiết bị

Baseline `86bdd1244d63d2dc78fa315a6e785aeee36f5e55`. Xem báo cáo `../../../M6_RESOURCE_REDISPATCH_2026_10_16.md` và `summary.json` cho phạm vi, kết quả và giới hạn.

- `source-manifest.json`: SHA-256 của 661 tệp nguồn ở trạng thái kiểm chứng, 89 tệp auth/config/schema/dependency không đổi so với baseline.
- `regression-before-*`: 5 lỗi ban đầu tái hiện trên H2 và PostgreSQL trước sửa (10 ca FAIL).
- `backend-verified-*`: 494 ca PASS, không skip; gồm 25 ca điều phối mới trên mỗi database, stabilization PostgreSQL/MinIO và toàn bộ hồi quy sẵn có.
- `root-*`, `legacy-*`: lint/typecheck/test/build thực tế; root 76 lượt test, legacy 7.
- `browser-redispatch.json`: 21 nhóm UI và API bổ trợ với PostgreSQL/MinIO thật; `browser-audit.json`: 2 nhóm audit UI.
- `screenshots/`: ảnh desktop/mobile từ lượt kiểm chứng cuối, chỉ có dữ liệu synthetic.
- `runtime-verified.json`, `cleanup.json`: readiness đúng backend sở hữu; đã dừng/xóa môi trường dùng riêng.
- `iteration-classification.json`: phân biệt lỗi sản phẩm, lỗi phát sinh trong triển khai và lỗi harness.

Scripts trong `scripts/` là bản sao có thể kiểm tra lại. Muốn chạy lại, sao chép chúng vào `work/uav-resource-redispatch-20261016/` trong đúng repository; kiểm tra các port cô lập còn trống; chạy `runtime.py infra`, `runtime.py backend`, `runtime.py seed`; chạy `gates.py root`/`legacy` xong mới chạy `runtime.py frontends`; chạy browser scripts; cuối cùng `runtime.py cleanup`. `backend-tests.py <label>` cần infrastructure riêng đang chạy và tạo database test riêng. Dùng Node 20, Java/Maven dự án, Docker và Playwright/Chromium đã cài. Không chạy trên production.

Không có fixture credentials, token, cookie, storage state, signed URL hoặc raw backend/surefire logs trong thư mục evidence. Script tạo dữ liệu đăng nhập ngẫu nhiên và chỉ lưu tạm trong thư mục work bị ignore. Khóa môi trường/token không phải là dữ liệu trong báo cáo.
