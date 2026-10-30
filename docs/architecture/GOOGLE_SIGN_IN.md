# Google Sign-in

Đăng nhập bằng tài khoản Google cho website. Frontend lấy ID token từ Google Identity Services và gửi cho backend; backend xác minh token rồi trả cùng kiểu phản hồi như đăng nhập bằng mật khẩu.

## Endpoint

`POST /api/v1/auth/google`, công khai (không cần JWT, không cần CSRF như `/auth/login`).

```json
{ "credential": "<Google ID token>" }
```

Phản hồi giống hệt `POST /api/v1/auth/login`: `accessToken`, `refreshToken`, `user` (kèm cookie phiên), hoặc `mfaRequired: true` với `challengeToken`, `mfaMethod`, `maskedEmail` khi tài khoản bật 2FA. Bước tiếp theo khi đó vẫn là `POST /api/v1/auth/verify-2fa`.

| Trường hợp | HTTP | `code` |
|---|---|---|
| Chưa cấu hình client ID | 503 | `GOOGLE_LOGIN_DISABLED` ("Đăng nhập Google chưa được cấu hình.") |
| Token không hợp lệ, sai aud/iss, hết hạn, email chưa xác minh, thiếu credential | 401 | `GOOGLE_TOKEN_INVALID` ("Không xác minh được tài khoản Google. Vui lòng thử lại.") |
| Không liên lạc được Google (timeout, lỗi 5xx) | 503 | `GOOGLE_UNAVAILABLE` |
| Vượt giới hạn tần suất | 429 | `AUTH_RATE_LIMITED` |
| Tài khoản bị khóa, chờ duyệt, không ACTIVE | như `/auth/login` (401, 403 `ACCOUNT_PENDING_APPROVAL`, 400) | |
| Tài khoản nhân sự (không phải `ROLE_PILOT`) chưa bật 2FA | 403 | `GOOGLE_STAFF_REQUIRES_2FA` ("Tài khoản nhân sự cần bật xác thực 2 lớp để đăng nhập bằng Google. Vui lòng đăng nhập bằng mật khẩu.") |

## Cấu hình

`app.auth.google.client-ids=${GOOGLE_CLIENT_ID:}`: danh sách OAuth Web client ID, cách nhau bằng dấu phẩy. Để trống thì endpoint trả 503. Đặt `GOOGLE_CLIENT_ID` trong `backend/.env` (được `scripts/run-local.sh` nạp) hoặc `deploy/.env.production` (được `docker-compose.prod.yml` nạp qua `env_file`). Client ID phải trùng client ID mà frontend dùng cho nút Google.

## Xác minh token

Classpath không có Nimbus/Spring OAuth2 JOSE, nên backend gọi `https://oauth2.googleapis.com/tokeninfo?id_token=` qua `RestClient` (kết nối 3 giây, đọc 5 giây). Google kiểm chữ ký và hạn; backend kiểm thêm: `aud` thuộc danh sách client ID, `iss` là `accounts.google.com` hoặc `https://accounts.google.com`, `exp` chưa qua, `email_verified` là true. Mã: `GoogleIdTokenServiceImpl`.

## Quy tắc tài khoản

- Giới hạn tần suất như đăng nhập: theo IP (`LOGIN`) ở controller và theo email (`checkAccount(LOGIN, email)`) ở service.
- Tìm người dùng theo email, không phân biệt hoa thường, như `/auth/login`.
- **Email đã có tài khoản:** áp dụng kiểm tra của đăng nhập (khóa, chờ duyệt, trạng thái ACTIVE). Tài khoản bật 2FA nhận challenge từ `createLoginChallenge` như đăng nhập; Google không bỏ qua 2FA. Còn lại cấp access và refresh token. Số lần nhập sai được đặt lại. Vai trò không thay đổi.
- **Tài khoản nhân sự** (mọi vai trò khác `ROLE_PILOT`): chỉ đăng nhập bằng Google khi tài khoản đã bật 2FA, để luôn qua `createLoginChallenge`. Chưa bật 2FA thì trả 403 `GOOGLE_STAFF_REQUIRES_2FA`, tài khoản không thay đổi gì. Lý do: tài khoản được khớp chỉ theo email, và Google chỉ bảo đảm lâu dài quyền sở hữu địa chỉ gmail.com và Google Workspace. Khách hàng (`ROLE_PILOT`) không bị ràng buộc này.
- **Email chưa xác minh:** được đánh dấu đã xác minh vì Google đã xác minh. Vì bất kỳ ai cũng có thể đăng ký trước địa chỉ này qua `/auth/register` với mật khẩu của họ, mật khẩu cũ bị xóa (`password_hash` null) và mọi refresh token của tài khoản bị thu hồi; "Quên mật khẩu" đặt được mật khẩu mới. Tài khoản chưa xác minh chưa từng nhận access token (đăng nhập luôn hỏi mã gửi qua email trước), nên chỉ cần thu hồi refresh token. Tài khoản đã xác minh giữ nguyên mật khẩu và phiên.
- **Email chưa có tài khoản:** tạo tài khoản khách hàng (`ROLE_PILOT`, ACTIVE, không 2FA) như đăng ký tự phục vụ. Username lấy từ phần trước `@` (chỉ giữ `a-z0-9._-`, tối đa 40 ký tự, tên dành riêng hoặc quá ngắn thêm tiền tố `user`), thêm hậu tố `-2`, `-3`… nếu trùng. Họ tên lấy từ `name` của token. Email đã xác minh. Không có số điện thoại.
- Tài khoản tạo qua Google không có mật khẩu (`password_hash` null): đăng nhập bằng mật khẩu luôn thất bại; "Quên mật khẩu" vẫn đặt được mật khẩu mới.
- Không bao giờ tạo hoặc nâng quyền quản trị/vận hành qua Google.
- Đăng nhập mật khẩu không ghi audit log, nên đăng nhập Google cũng không ghi.
