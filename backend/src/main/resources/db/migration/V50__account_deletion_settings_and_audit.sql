-- Flyway Migration V50: Self-service account deletion audit fields & dynamic Admin settings

ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_reason VARCHAR(500) NULL;

INSERT INTO system_configurations
    (config_key, config_value, category, description, updated_by, value_type, min_value, max_value, allowed_values, is_public)
VALUES
    (
        'account.deletion.enabled',
        'true',
        'ACCOUNT',
        'Cho phép người dùng tự xoá tài khoản trên Web và Mobile',
        'SYSTEM',
        'BOOLEAN',
        NULL,
        NULL,
        NULL,
        FALSE
    ),
    (
        'account.deletion.allow_staff_roles',
        'false',
        'ACCOUNT',
        'Cho phép tài khoản nhân sự vận hành (Operator/Commander) tự xoá tài khoản',
        'SYSTEM',
        'BOOLEAN',
        NULL,
        NULL,
        NULL,
        FALSE
    ),
    (
        'account.deletion.block_active_missions',
        'true',
        'ACCOUNT',
        'Chặn xoá tài khoản khi còn nhiệm vụ bay chưa hoàn tất',
        'SYSTEM',
        'BOOLEAN',
        NULL,
        NULL,
        NULL,
        FALSE
    ),
    (
        'account.deletion.block_unpaid_invoices',
        'true',
        'ACCOUNT',
        'Chặn xoá tài khoản khi còn hóa đơn chờ thanh toán',
        'SYSTEM',
        'BOOLEAN',
        NULL,
        NULL,
        NULL,
        FALSE
    ),
    (
        'account.deletion.require_password',
        'true',
        'ACCOUNT',
        'Yêu cầu nhập lại mật khẩu hiện tại khi xoá tài khoản (nếu tài khoản có mật khẩu)',
        'SYSTEM',
        'BOOLEAN',
        NULL,
        NULL,
        NULL,
        FALSE
    ),
    (
        'account.deletion.require_reason',
        'false',
        'ACCOUNT',
        'Bắt buộc người dùng nhập lý do xoá tài khoản',
        'SYSTEM',
        'BOOLEAN',
        NULL,
        NULL,
        NULL,
        FALSE
    ),
    (
        'account.deletion.confirmation_phrase',
        'XOA TAI KHOAN',
        'ACCOUNT',
        'Cụm từ xác nhận người dùng phải nhập đúng khi xoá tài khoản',
        'SYSTEM',
        'STRING',
        3,
        30,
        NULL,
        FALSE
    ),
    (
        'account.deletion.mode',
        'ANONYMIZE',
        'ACCOUNT',
        'Chế độ xử lý dữ liệu khi xoá tài khoản (ANONYMIZE ẩn danh PII, HARD_DELETE xoá bản ghi nếu chưa phát sinh giao dịch)',
        'SYSTEM',
        'ENUM',
        NULL,
        NULL,
        'ANONYMIZE,HARD_DELETE',
        FALSE
    ),
    (
        'account.deletion.notice_message',
        'Sau khi xác nhận xoá, toàn bộ phiên đăng nhập và thiết bị nhận thông báo sẽ bị thu hồi ngay lập tức; dữ liệu định danh cá nhân được xử lý theo chính sách bảo mật của hệ thống.',
        'ACCOUNT',
        'Thông điệp cảnh báo hiển thị cho người dùng trước khi xoá tài khoản',
        'SYSTEM',
        'STRING',
        10,
        400,
        NULL,
        FALSE
    )
ON CONFLICT (config_key) DO NOTHING;
