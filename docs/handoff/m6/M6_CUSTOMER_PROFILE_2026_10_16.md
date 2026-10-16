# UAV PAS — Hồ sơ khách hàng tự chỉnh sửa

**Ngày:** 16/10/2026. **Kết quả phạm vi:** COMPLETE_LOCAL. **Toàn dự án:** PARTIAL / NOT_READY.

**Người yêu cầu:** Nguyễn Xuân Phát. **Phạm vi đã chốt:** khách hàng tự sửa **họ tên và số điện thoại**. Không đổi auth contract; email, tên đăng nhập, mật khẩu, vai trò/quyền, trạng thái, ảnh đại diện không nằm trong biểu mẫu và không được phép gửi vào lệnh sửa hồ sơ.

## Kết quả thực hiện

- Trang Tài khoản có chỉnh sửa, lưu, hủy; tên trên thanh đầu trang cập nhật ngay; tải lại vẫn giữ dữ liệu đã lưu. Họ tên có thể để trống, tối đa 100 ký tự; điện thoại bắt buộc, tối đa 20 ký tự, trim hai đầu và không trùng theo quy tắc đăng ký hiện có. Không bổ sung quy định số Việt Nam/OTP khi chưa chốt nghiệp vụ.
- Backend xác định người dùng từ phiên đăng nhập, không nhận ID đích. DTO riêng, từ chối trường ngoài danh sách. Tài khoản bị khóa/ngừng hoạt động không được sửa. Không cần quyền quản trị để sửa chính mình.
- Hai tab dùng cùng bản hồ sơ: chỉ một lệnh ghi thắng; lệnh cũ trả 409. UI giữ bản đang nhập, có nút tải bản mới nhất và xác nhận trước khi bỏ nội dung đang nhập. Không tự ghi đè.
- Mất mạng hoặc mất phản hồi sau khi server đã lưu: giữ nội dung, khóa việc gửi lại cho đến khi đối chiếu bản mới nhất. Có thử lại khi tải hồ sơ lỗi. Phản hồi lưu đến sau đăng xuất/đổi tài khoản không hồi sinh phiên hoặc hiển thị hồ sơ A cho B.
- Chỉ cập nhật cột thay đổi, tránh ghi đè hồ sơ bởi thao tác quản trị đồng thời. Audit cùng transaction, ghi tên trường đã sửa, không ghi giá trị họ tên/số điện thoại. Admin xem nhật ký bằng tiếng Việt.
- Giao diện đã kiểm trên Chromium desktop 1440×1000 và mobile viewport 375×812; nút lưu/hủy không bị thanh điều hướng che, không tràn ngang. Đây là mô phỏng viewport, chưa kiểm thiết bị iOS/Android thật.

## Baseline và thay đổi contract

Branch `codex/m1-monorepo-foundation`, HEAD `ba562ffb3a965c48c3207b30e756c7e7aad297ad`. Ban đầu working tree sạch. Không commit/push/reset/rebase/merge/deploy trong lượt này.

API nghiệp vụ mới:

| Endpoint | Nội dung |
|---|---|
| `GET /api/v1/users/profile` | Hồ sơ của phiên hiện tại: id, fullName, phoneNumber, revision. Cache-Control no-store. |
| `PATCH /api/v1/users/profile` | Chỉ nhận fullName (string/null), phoneNumber (string), expectedRevision (64 hex); trả hồ sơ mới. |
| 400 | Dữ liệu sai/thiếu, vượt giới hạn, JSON lỗi, khóa ngoài danh sách. |
| 401 / 403 | Chưa xác thực hoặc tài khoản không khả dụng. |
| 409 | Bản cũ hoặc số điện thoại đã được dùng. |

Revision là SHA-256 của ID và nội dung hai trường, dùng để kiểm xung đột, **không phải token đăng nhập**. Không chống ABA khi nội dung đã trở lại chính xác bản ban đầu; không coi nội dung giống nhau là thay đổi cần chặn.

40 file auth/session/dependency được đối chiếu nguyên trạng với baseline. Không đổi login/refresh/logout, JWT, quyền, cookie, localStorage hay DTO auth. Có thay đổi nội bộ entity/repository và xử lý lỗi ràng buộc điện thoại, cùng migration V4; không tuyên bố schema không đổi.

## Kiểm chứng

| Nhóm | Kết quả | Lệnh/luồng | Evidence trong `evidence/tests/customer-profile-2026-10-16/` |
|---|---|---|---|
| Baseline UI | PASS | Đăng nhập → /profile chỉ đọc trước sửa | browser-baseline.json |
| Backend đầy đủ | PASS | `./mvnw -Duav.build.directory=<isolated target> test` với PostgreSQL/MinIO disposable | full-backend-final-summary.json, full-backend-final-sanitized.log — **620 tests, 0 failure/error/skip** |
| Hồ sơ H2/PostgreSQL | PASS | 13 tình huống × 2: chủ thể, whitelist, giới hạn, duplicate, CAS, đồng thời, khóa, rollback audit, quản trị cạnh tranh, JSON lỗi | UserProfileIntegrationTest / UserProfilePostgresTest trong full summary |
| Migration PostgreSQL | PASS | Fresh/V1/V2→V4, NULL/rỗng, trùng sau trim, V3 trùng thì từ chối và bảo toàn dữ liệu | MigrationUpgradePostgresTest trong full summary |
| Root FE/shared | PASS | `npm run lint`, `typecheck`, `test`, `build`; web/customer/operations/admin/shared | root-gates.json và root-*.log — **85 lượt test** |
| Legacy | PASS | Bốn lệnh tương tự tại frontend | legacy-gates.json và legacy-*.log — **7 lượt test** |
| Browser luồng chính | PASS | 12 nhóm: anonymous/guard, sửa-lưu-đọc lại, hủy/validation, duplicate, hai tab, mất mạng, mất phản hồi thành công, A/B, refresh, mobile, admin audit, logout/đổi tài khoản | browser-profile.json |
| Browser khôi phục | PASS | 3 nhóm: lỗi tải/thử lại, xóa tên tùy chọn, phản hồi lưu đến muộn khi logout/login B | browser-profile-recovery.json |
| Auth giữ nguyên | PASS | So sánh source và response refresh; refresh thật sau một phản hồi 401 được chủ động mô phỏng | auth-contract-check.json, browser-profile.json |
| Rà soát độc lập | PASS sau sửa | Một lượt read-only, sửa duplicate label; kiểm lại gates | review.md |
| Git whitespace | PASS | `git diff --check` | final-checks.json |

Các bài browser dùng tài khoản synthetic và đăng nhập thật. API chỉ hỗ trợ fixture/read-back/negative ownership; không thay cho thao tác form. Lỗi mạng/503 và một phản hồi 401 được chủ động mô phỏng. Refresh gọi backend thật; **không phải bài đợi JWT hết hạn tự nhiên**. 15 nhóm browser chính/khôi phục đều PASS, không có pageerror hoặc overlay runtime. Các lượt đỏ và chạy lặp không được cộng vào số kiểm thử cuối.

## Lỗi/giới hạn được ghi trung thực

- Backend trước bổ sung chưa có self-profile endpoint (10/11 bài mới thất bại, anonymous đã bị chặn đúng). UI trước sửa chỉ đọc.
- Khi tích hợp phát hiện thông báo duplicate phone chưa khớp chuỗi backend: thêm bài đỏ theo thông báo thật rồi sửa ánh xạ tiếng Việt.
- Bài M4 cũ kiểm thông báo “chưa hỗ trợ chỉnh sửa” không còn đúng; bỏ assertion đó, thay độ bao phủ bằng kiểm thử payload/validation và browser thao tác thật, giữ kiểm tra nội dung mission liên quan.
- Final review phát hiện nhãn USER_PROFILE bị khai báo trùng khiến typecheck lỗi; đã sửa, toàn bộ root gates chạy lại PASS.
- Console 409/401 và lỗi mạng là nhánh negative chủ động; 503 là fault injection ở bài khôi phục. Admin còn **`/favicon.ico` 404** có sẵn từ lượt trước, xác nhận bằng browser location và HTTP; không ảnh hưởng lưu hồ sơ. Xem browser-admin-console.json.
- Chưa kiểm Safari/Firefox, thiết bị thật, staging HTTPS, hosted CI, tải lớn, kiểm thử bảo mật toàn hệ thống, OTP/đổi email/đổi mật khẩu, avatar hay SSO/CSRF. Không gọi bearer localStorage là SSO.

## Migration và vận hành

V4 thêm unique index có điều kiện trên `btrim(users.phone_number)`, bỏ qua NULL/rỗng. Migration **không sửa dữ liệu trùng cũ** và sẽ dừng nếu phát hiện trùng. Trước khi áp dụng lên môi trường có dữ liệu cần kiểm tra số nhóm trùng, quyết định dữ liệu đúng và sửa có kiểm soát; chưa áp dụng lên database của người dùng/production.

Lệnh kiểm tra chỉ trả số nhóm, không đưa số điện thoại vào evidence:

```sql
SELECT count(*) AS duplicate_phone_groups
FROM (
  SELECT btrim(phone_number)
  FROM users
  WHERE phone_number IS NOT NULL AND btrim(phone_number) <> ''
  GROUP BY btrim(phone_number) HAVING count(*) > 1
) duplicates;
```

H2 dùng unique constraint thường cho fixture; kết luận trim/blank dựa trên kiểm PostgreSQL thật. Chuẩn hóa toàn cầu (ví dụ 09… và +849…) và xác minh chủ số chưa nằm trong phạm vi.

Runtime riêng: Docker Compose project `uav-customer-profile-20261016`, PostgreSQL 55444, MinIO 9014/9015, Spring 18080, customer 3101, admin 3103. Không chiếm 8080. Scripts tái hiện trong thư mục evidence/scripts; tạo secret ngẫu nhiên trong work chmod 600, không chép secret/token/signed URL vào evidence. Môi trường và log thô chứa thông tin riêng được dọn sau kiểm tra; trạng thái thực tế trong final-checks.json.

Ảnh và bản báo cáo người dùng: `/Volumes/D/Codex/outputs/uav-customer-profile-20261016/`. Mã nguồn và evidence hiện ở working tree, chưa commit/push.
