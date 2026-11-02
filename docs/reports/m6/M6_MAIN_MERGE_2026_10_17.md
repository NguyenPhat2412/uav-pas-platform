# Hợp nhất nhánh nền tảng vào main — 17/10/2026

Hợp nhất `codex/m1-monorepo-foundation` tại `a14d32d` vào `main` tại `55c2fd7`, giữ lịch sử của cả hai parent. Chủ dự án đã yêu cầu xử lý xung đột, kiểm tra và đẩy main. Thực hiện ở worktree riêng; canonical `/Volumes/D/Codex/projects/uav-pas-platform`, runtime và dữ liệu đang chạy được giữ nguyên.

## Xử lý xung đột

- Giải quyết 175 đường dẫn xung đột. Đối chiếu 1.675 đường dẫn của main qua sơ đồ chuyển tên/thư mục: 1.165 giữ nguyên nội dung, 508 đã có bản cập nhật trong nhánh hợp nhất; hai tệp riêng của main là PR template và Dependabot được giữ và cập nhật đường dẫn.
- Loại 78 đường dẫn cũ trùng với tệp đã chuyển vào cấu trúc mới. Giữ backend DTO/enums/service implementation mới và ba thư mục sản phẩm backend/frontend/docs.
- Sửa kết quả tự ghép ở chín tệp: giữ bản vá chặn demo bypass của admin/operations, tải đủ trang danh sách legacy, bỏ export không còn tồn tại và giữ đường dẫn Next.js production types. Không đưa lại hành vi cũ đã được sửa.
- Mã ứng dụng và test trong `backend/src` cùng toàn bộ `frontend` khớp từng byte với `a14d32d` sau hợp nhất. V1–V11 đã xuất bản trên main giữ nguyên byte; giữ V12–V15 của nhánh tính năng.
- Giữ quy tắc ignore riêng của main. Không đưa môi trường bí mật, dữ liệu test, build output hoặc bản sao lưu vào commit.

## Điều chỉnh công cụ tích hợp

Dependabot và PR template dùng đường dẫn frontend mới. Database disposable của CI đổi tên thành `uav_ba_test_suite`, khớp điều kiện chạy FinancialOutboxPostgresTest; tên cũ khiến sáu test bị bỏ qua và gate đầy đủ thất bại. Wrapper backend chạy Maven `verify` để kiểm cả định dạng Java; kiểm thử wrapper được cập nhật tương ứng. Đây là thay đổi cấu hình kiểm thử, không đổi database đang chạy.

## Kiểm tra mới trên bản hợp nhất

| Kiểm tra | Kết quả |
|---|---|
| Maven verify với PostgreSQL và MinIO riêng | 726 test, 0 failure/error/skip; build và Spotless PASS |
| Bốn app và shared packages | lint, build, typecheck, workspace tests PASS |
| Frontend contracts | 151/151 PASS, không skip |
| Legacy frontend | lint, build, typecheck, 10/10 tests PASS |
| CI failure paths | 8/8 PASS |
| Workflow/Dependabot YAML và Compose | Parse PASS; đường dẫn lockfile và tên database khớp |
| Diff của phần giải quyết hợp nhất | Không conflict marker/unmerged entry; diff check PASS |
| Audit dependencies dùng khi chạy ứng dụng | 0 finding trên cả hai cây |
| Audit đầy đủ gồm công cụ phát triển | FAIL: 5 HIGH trên mỗi cây, tồn tại trước hợp nhất |

Các kết quả trên là kiểm tra cục bộ trước push, không phải kết quả GitHub Actions hosted. Audit đầy đủ vẫn báo lỗi công cụ phát triển; không che cảnh báo hoặc tự nâng major dependency trong lượt hợp nhất. Các giới hạn HTTPS staging/SSO, tích hợp ngoài và lỗi KPI đã biết vẫn được theo dõi trong M6_FULL_PRIORITIES_2026_10_17.md.

Bằng chứng cục bộ: `docs/work/merge-main-20261017/` chứa log private, summary, sơ đồ đường dẫn và cách giải quyết; thư mục này được ignore. Thay đổi getter/setter được người dùng giao riêng cho chat khác trong lúc kiểm thử không nằm trong commit hợp nhất này và cần commit tiếp theo.
