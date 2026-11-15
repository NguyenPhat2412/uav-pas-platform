-- ==============================================================================
-- V55__dynamic_marketplace_settings_and_indexes.sql
-- Dynamic Marketplace & Billing System Settings (zero hardcoding) + Hot Indexes
-- ==============================================================================

INSERT INTO system_configurations
    (config_key, config_value, category, description, updated_by, value_type, min_value, max_value, is_public)
VALUES
    (
        'marketplace.min_payout_vnd',
        '100000',
        'MARKETPLACE',
        'Hạn mức rút tiền tối thiểu mỗi lần cho Đối tác trên sàn (VNĐ)',
        'SYSTEM',
        'INTEGER',
        50000,
        50000000,
        TRUE
    ),
    (
        'marketplace.max_payout_vnd',
        '500000000',
        'MARKETPLACE',
        'Hạn mức rút tiền tối đa mỗi lệnh cho Đối tác trên sàn (VNĐ)',
        'SYSTEM',
        'INTEGER',
        1000000,
        5000000000,
        TRUE
    ),
    (
        'marketplace.default_service_radius_km',
        '100',
        'MARKETPLACE',
        'Bán kính phục vụ mặc định khi tạo hồ sơ hoặc tin đăng dịch vụ (km)',
        'SYSTEM',
        'INTEGER',
        5,
        2000,
        TRUE
    ),
    (
        'marketplace.rfq_enabled',
        'true',
        'MARKETPLACE',
        'Cho phép đăng yêu cầu báo giá mở (Open RFQ) và đối tác chào thầu',
        'SYSTEM',
        'BOOLEAN',
        NULL,
        NULL,
        TRUE
    ),
    (
        'marketplace.require_escrow_before_start',
        'false',
        'MARKETPLACE',
        'Bắt buộc hoàn tất nạp tạm giữ (Escrow) trước khi đối tác bắt đầu bay',
        'SYSTEM',
        'BOOLEAN',
        NULL,
        NULL,
        TRUE
    ),
    (
        'billing.invoice_due_days',
        '7',
        'BILLING',
        'Số ngày hạn thanh toán mặc định kể từ khi phát hành hóa đơn',
        'SYSTEM',
        'INTEGER',
        1,
        90,
        TRUE
    )
ON CONFLICT (config_key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_invoices_mission_status
    ON invoices (mission_id, status, id DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_rating
    ON marketplace_listings (moderation_status, featured DESC, rating_avg DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_price
    ON marketplace_listings (moderation_status, base_price_vnd ASC, id ASC);
