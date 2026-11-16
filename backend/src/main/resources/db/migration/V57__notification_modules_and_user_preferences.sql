-- V57: Notification Module Governance Registry, User Module Preferences, and Screen/OS Popup Channels

ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS module_code VARCHAR(40) NOT NULL DEFAULT 'SYSTEM',
    ADD COLUMN IF NOT EXISTS severity VARCHAR(20) NOT NULL DEFAULT 'INFO';

UPDATE notifications
SET module_code = CASE
        WHEN reference_type = 'SAR' OR type = 'SAR_TARGET_FOUND' THEN 'SAR'
        WHEN reference_type IN ('PERMIT', 'AIRSPACE') THEN 'AIRSPACE'
        WHEN reference_type = 'MISSION' OR type IN ('MISSION_ASSIGNED', 'MISSION_STATUS_CHANGED') THEN 'MISSION'
        WHEN reference_type IN ('MARKETPLACE', 'ESCROW', 'LISTING', 'PAYOUT', 'PROVIDER') THEN 'MARKETPLACE'
        WHEN reference_type IN ('INVOICE', 'QUOTA') OR type IN ('PAYMENT', 'QUOTA_WARNING') THEN 'BILLING'
        WHEN reference_type = 'SUPPORT' THEN 'SUPPORT'
        WHEN reference_type = 'MAINTENANCE' THEN 'MAINTENANCE'
        WHEN reference_type = 'STORAGE' THEN 'STORAGE'
        ELSE 'SYSTEM'
    END,
    severity = CASE
        WHEN reference_type IN ('SAR', 'PERMIT', 'AIRSPACE') OR type = 'SAR_TARGET_FOUND' THEN 'CRITICAL'
        WHEN reference_type IN ('MISSION', 'MARKETPLACE', 'ESCROW', 'INVOICE', 'SUPPORT')
             OR type IN ('MISSION_ASSIGNED', 'MISSION_STATUS_CHANGED', 'PAYMENT', 'QUOTA_WARNING') THEN 'ACTION'
        ELSE 'INFO'
    END;

CREATE INDEX IF NOT EXISTS idx_notifications_user_module_created
    ON notifications (user_id, module_code, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_module_policies (
    id BIGSERIAL PRIMARY KEY,
    module_code VARCHAR(40) NOT NULL UNIQUE,
    display_name_vi VARCHAR(120) NOT NULL,
    display_name_en VARCHAR(120) NOT NULL,
    display_name_ja VARCHAR(120) NOT NULL,
    description_vi VARCHAR(400) NOT NULL,
    description_en VARCHAR(400) NOT NULL,
    description_ja VARCHAR(400) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'ACTION',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    mandatory BOOLEAN NOT NULL DEFAULT FALSE,
    in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    screen_popup_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    desktop_os_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    mobile_push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    cooldown_seconds INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    module_code VARCHAR(40) NOT NULL,
    muted BOOLEAN NOT NULL DEFAULT FALSE,
    screen_popup_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    desktop_os_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    mobile_push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_user_notification_preferences_user_module UNIQUE (user_id, module_code)
);

CREATE INDEX IF NOT EXISTS idx_user_notification_prefs_user
    ON user_notification_preferences (user_id);

INSERT INTO notification_module_policies (
    module_code,
    display_name_vi, display_name_en, display_name_ja,
    description_vi, description_en, description_ja,
    severity, enabled, mandatory,
    in_app_enabled, screen_popup_enabled, desktop_os_enabled, mobile_push_enabled, email_enabled,
    cooldown_seconds, sort_order
) VALUES
    (
        'SAR',
        'Tìm kiếm & Cứu nạn (SAR AI)', 'Search & Rescue (SAR AI)', '捜索救助 (SAR AI)',
        'Phát hiện mục tiêu cứu nạn, điều phối khẩn cấp và cảnh báo buồng lái thực địa.',
        'Rescue target detections, emergency dispatch, and live field cockpit alerts.',
        '要救助者の検出、緊急出動指示、現場コックピット警報。',
        'CRITICAL', TRUE, TRUE,
        TRUE, TRUE, TRUE, TRUE, TRUE,
        0, 10
    ),
    (
        'AIRSPACE',
        'Không phận & Phép bay NFZ', 'Airspace & Flight Permits', '空域・飛行許可 (NFZ)',
        'Cảnh báo vùng cấm bay NFZ, NOTAM tạm thời và trạng thái thẩm định phép bay.',
        'No-fly zone alerts, temporary NOTAMs, and flight permit review updates.',
        '飛行禁止空域警報、一時NOTAM、飛行許可審査ステータス。',
        'CRITICAL', TRUE, TRUE,
        TRUE, TRUE, TRUE, TRUE, TRUE,
        0, 20
    ),
    (
        'MISSION',
        'Điều phối & Nhiệm vụ bay', 'Flight Missions & Dispatch', '飛行ミッション・配車',
        'Phân công phi công/UAV, thay đổi trạng thái nhiệm vụ và nghiệm thu bàn giao.',
        'Operator/UAV assignments, mission lifecycle changes, and handover reviews.',
        '操縦士・機体割当、ミッション状態変更、引渡し検収。',
        'ACTION', TRUE, FALSE,
        TRUE, TRUE, TRUE, TRUE, TRUE,
        0, 30
    ),
    (
        'MARKETPLACE',
        'Sàn dịch vụ UAV & Ký quỹ Escrow', 'UAV Marketplace & Escrow', 'UAVマーケット・エスクロー',
        'Đơn đặt dịch vụ mới, báo giá RFQ, tạm giữ/giải ngân ký quỹ và rút tiền đối tác.',
        'New service bookings, RFQ bids, escrow holds/releases, and provider payouts.',
        '新規予約、RFQ入札、エスクロー保留・解放、パートナー出金。',
        'ACTION', TRUE, FALSE,
        TRUE, TRUE, TRUE, TRUE, TRUE,
        0, 40
    ),
    (
        'BILLING',
        'Hoá đơn, Thanh toán & Hạn mức', 'Billing, Payments & Quotas', '請求・決済・利用枠',
        'Đối soát chuyển khoản VietQR/SePay, phát hành hoá đơn và cảnh báo hạn mức giờ bay.',
        'VietQR/SePay payment reconciliation, invoice issuance, and flight-hour quota warnings.',
        'VietQR/SePay入金消込、請求書発行、飛行時間枠アラート。',
        'ACTION', TRUE, FALSE,
        TRUE, TRUE, TRUE, TRUE, TRUE,
        15, 50
    ),
    (
        'SUPPORT',
        'Hỗ trợ trực tuyến 2 chiều', 'Live Customer Support', 'リアルタイムサポート',
        'Tin nhắn mới từ khách hàng hoặc phản hồi trực tiếp từ đội ngũ vận hành/quản trị.',
        'Incoming customer support messages and live replies from operations/admin teams.',
        '顧客からの新規お問い合わせと運営チームからのリアルタイム返信。',
        'ACTION', TRUE, FALSE,
        TRUE, TRUE, TRUE, TRUE, FALSE,
        5, 60
    ),
    (
        'MAINTENANCE',
        'Bảo trì & Sức khoẻ đội bay', 'Fleet Health & Maintenance', '機体保守・ヘルスケア',
        'Lịch bảo dưỡng định kỳ đến hạn, phiếu sửa chữa kỹ thuật và cảnh báo pin/cảm biến.',
        'Scheduled maintenance due dates, repair work orders, and battery/sensor health alerts.',
        '定期点検期限、修理オーダー、バッテリー・センサー診断通知。',
        'INFO', TRUE, FALSE,
        TRUE, TRUE, FALSE, TRUE, FALSE,
        30, 70
    ),
    (
        'STORAGE',
        'Kho tệp & Cụm Google Drive Pool', 'Storage & Google Drive Pool', 'ストレージ・Google Driveプール',
        'Cảnh báo dung lượng ổ lưu trữ, sức khoẻ kết nối OAuth/SA và tiến trình di chuyển R2.',
        'Drive node quota thresholds, OAuth/SA health status, and R2 migration progress.',
        'ドライブ容量しきい値、OAuth/SA接続状態、R2移行進捗。',
        'INFO', TRUE, FALSE,
        TRUE, TRUE, FALSE, FALSE, FALSE,
        60, 80
    ),
    (
        'SYSTEM',
        'Hệ thống, Bảo mật & Đào tạo', 'System, Security & Academy', 'システム・セキュリティ・研修',
        'Thông báo vận hành chung, cập nhật tài khoản/quyền hạn và học liệu đào tạo mới.',
        'General platform announcements, account/security updates, and new academy courses.',
        'システム全体のお知らせ、アカウント・権限更新、新規研修コース。',
        'INFO', TRUE, FALSE,
        TRUE, TRUE, FALSE, FALSE, FALSE,
        0, 90
    )
ON CONFLICT (module_code) DO NOTHING;
