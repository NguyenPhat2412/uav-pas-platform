# Sắp xếp thư mục — 17/10/2026

Bản được thay đổi: `/Volumes/D/Codex/projects/uav-pas-platform`.

Thư mục gốc chỉ còn ba mục thường: `frontend`, `backend`, `docs`. Các thư mục và tệp ẩn phục vụ Git, CI và môi trường cục bộ được giữ lại. Xem [hướng dẫn chạy và ánh xạ đường dẫn](../README.md).

## Thay đổi

- Gom các ứng dụng, thư viện, kiểm thử và node_modules vào `frontend`; giao diện cũ chuyển nguyên vẹn vào `frontend/legacy`.
- Di chuyển Compose vào `backend`, giữ tên project và volume cũ, sửa build context và đường dẫn tệp môi trường.
- Di chuyển kế hoạch và tệp tạm vào `docs/tasks` và `docs/work`.
- Cập nhật đường dẫn CSS, API-origin test, CI và cấu hình Next standalone/Turbopack. CI legacy cài cả workspace để test dùng chung tìm được TypeScript.
- Bổ sung lệnh tiện dụng trong `frontend/package.json` và hướng dẫn chạy.
- Dựng sạch cả năm giao diện; cache cũ có đường dẫn tuyệt đối được chuyển vào vùng tạm. Sau build và khởi động thử không tạo lại thư mục ở gốc.

## Xác minh

| Kiểm tra | Kết quả |
|---|---|
| frontend-tests | PASS |
| legacy-tests | PASS |
| frontend-lint | PASS |
| frontend-typecheck | PASS |
| legacy-lint | PASS |
| legacy-typecheck | PASS |
| frontend-build | PASS |
| legacy-build | PASS |
| frontend-clean-build | PASS |
| legacy-clean-build | PASS |
| npm ci dry-run offline, workspace và legacy | PASS |
| Docker Compose: cấu hình và build context | PASS |
| Đối chiếu 1446 tệp được Git quản lý | Không thiếu tệp |
| Hai package-lock.json | Không đổi |
| Symlink các package @uav | Hợp lệ |

Backend Maven: 570 test được ghi nhận, 436 đạt, 134 bỏ qua, 0 thất bại, 0 lỗi. Các kiểm thử tích hợp yêu cầu PostgreSQL/MinIO riêng không được bật trong lượt này; không tác động dữ liệu đang chạy.

Năm máy chủ standalone được khởi động trên cổng localhost tạm, kiểm tra trang và tài nguyên tĩnh rồi tắt. Web, customer, operations, admin trả `/health` HTTP 204; trang công khai/đăng nhập của cả năm giao diện trả HTTP 200; toàn bộ 61 tài nguyên tĩnh được kiểm tra trả HTTP 200. Đây là kiểm tra khởi động và phân phối giao diện, không thay thế E2E nghiệp vụ có đăng nhập hoặc kiểm thử PostgreSQL/MinIO.

Không build Docker image hoặc triển khai lại hệ thống trong lượt này. Cấu hình Docker đã được phân tích và xác minh đường dẫn. Frontend được kiểm tra bằng Node 22.23.2 có sẵn; npm mặc định của máy trỏ tới đường dẫn ứng dụng cũ, cách đặt PATH đã ghi trong hướng dẫn.

## Phối hợp giữa các luồng

Đã thông báo trước khi thay đổi và gửi ánh xạ đường dẫn cho luồng “uav pas”. Luồng đó xác nhận tiếp tục làm trong `uav-pas-main-integration`; bản tích hợp vẫn dùng cấu trúc cũ. Khi tích hợp chức năng, chuyển đường dẫn theo bảng trong hướng dẫn và giữ các thay đổi cấu hình của lượt này.

Thay đổi đang ở working tree, chưa commit hoặc push. Log và dữ liệu xác minh cục bộ nằm tại `docs/work/directory-migration-20261017/` (Git bỏ qua); báo cáo này chỉ ghi thông tin không chứa bí mật.

## Cập nhật công cụ cùng ngày

Theo yêu cầu tiếp theo của người dùng, đã sửa launcher `node`, `npm`, `npx` tại `/Volumes/D/Codex/tools/bin` để dùng bộ Node 22.23.2 và npm 10.9.8 sẵn có, thay cho đường dẫn ChatGPT.app cũ. Cấu hình NVM và shell startup được giữ nguyên. Terminal mới dùng NVM vẫn chạy tốt; không cần export PATH thủ công. Các launcher cũ được sao lưu trong `docs/work/npm-path-fix-20261017-092929/`.
