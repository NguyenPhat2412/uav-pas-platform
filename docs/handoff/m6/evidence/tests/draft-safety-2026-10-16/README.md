# Evidence — bản nháp và unknown route

Lượt kiểm chứng ngày 16/10/2026; baseline `f7b9f1318a8c06de9cca474ed2842efe46603b5b`.

- `summary.json`: phân loại phạm vi và tổng kết cuối.
- `backend-final-summary.json`: 530 tests, 0 failure/error/skip, gồm PostgreSQL/MinIO thật; 36 ca mới đã nằm trong tổng.
- `regression-before-failures.json`: lỗi sản phẩm tái hiện trước sửa; `regression-after-summary.json`: cùng bộ hồi quy sau sửa.
- `backend-full-summary.json`: lượt đầy đủ đầu tiên còn 2 fixture note-limit thiếu phiên bản, sau đó đã sửa và chạy lại đầy đủ.
- `root-gates.json`, `legacy-gates.json` và logs: bốn gate trên root và legacy.
- `browser-drafts.json`: 13 nhóm UI/API bổ trợ cuối PASS; network chỉ lưu method/path/status, không header/token/body.
- `browser-attempt*.json`: lỗi harness và timing đã phân loại trong báo cáo, không phải kết quả cuối.
- `screenshots/`: ảnh tổng hợp an toàn; bản gốc cho người dùng ở `/Volumes/D/Codex/outputs/uav-draft-safety-20261016/`.
- `source-manifest.json`: 664 tệp nguồn cùng SHA-256; 89 tệp auth/config/schema/dependency so với baseline không đổi.
- `runtime.json`, `cleanup.json`: health/readiness, kiểm sở hữu listener và dọn runtime riêng.

Các script dưới `scripts/` là bản sao harness sử dụng ở lượt này, tham chiếu workspace và work directory cục bộ. Chuẩn bị thư mục `work/uav-draft-safety-20261016`, chép script vào đó, bảo đảm các port 18080/3101/55444/9014/9015 trống; `runtime.py infra` sinh credential mới, `backend-tests.py <label>` tạo test database riêng, `gates.py root`/`legacy` tạo build, `runtime.py backend`, `runtime.py seed`, `runtime.py frontends customer`, rồi `browser-drafts.mjs`. Chạy `runtime.py cleanup` khi xong. Không đưa `env.json`, `fixture.json`, raw logs hay Maven target/Surefire XML vào evidence.

Playwright dùng runtime đã có; lý do: Browser plugin not available. Đây là kiểm chứng cục bộ, không phải staging/production/security audit.

Trước commit, logs được chuẩn hóa CRLF/khoảng trắng cuối dòng và dòng trắng cuối tệp để đạt `git diff --check`; nội dung kết quả không thay đổi.
