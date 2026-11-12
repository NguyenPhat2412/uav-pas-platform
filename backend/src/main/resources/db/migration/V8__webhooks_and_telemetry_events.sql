-- ==============================================================================
-- V8__webhooks_and_telemetry_events.sql
-- Module Webhook Engine, Payment IPN Transactions, and Emergency SAR Events
-- Platform: UAV PAS - Vietnam Japan University (VJU)
-- ==============================================================================

-- 1. Bảng webhook_subscriptions: Quản lý các endpoint bên thứ ba đăng ký nhận sự kiện
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    target_url VARCHAR(500) NOT NULL,
    secret_key VARCHAR(120) NOT NULL,
    events_subscribed TEXT NOT NULL, -- e.g. "SAR_EMERGENCY_TRIGGERED,GEOFENCE_BREACH,BATTERY_CRITICAL_RTH,PAYMENT_COMPLETED"
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng webhook_delivery_logs: Nhật ký phát sự kiện Webhook và trạng thái giao hàng
CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
    id BIGSERIAL PRIMARY KEY,
    subscription_id BIGINT REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
    event_type VARCHAR(80) NOT NULL,
    payload TEXT NOT NULL,
    response_status_code INT,
    response_body TEXT,
    delivery_duration_ms INT,
    is_success BOOLEAN NOT NULL DEFAULT FALSE,
    retry_count INT NOT NULL DEFAULT 0,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bảng payment_transactions: Chi tiết giao dịch thanh toán VietQR / IPN Callback
CREATE TABLE IF NOT EXISTS payment_transactions (
    id BIGSERIAL PRIMARY KEY,
    invoice_id BIGINT REFERENCES invoices(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    transaction_code VARCHAR(100) NOT NULL UNIQUE,
    gateway_name VARCHAR(50) NOT NULL DEFAULT 'VIETQR_NAPAS',
    amount NUMERIC(15,2) NOT NULL,
    bank_bin VARCHAR(20) DEFAULT '970415',
    bank_account_number VARCHAR(50) DEFAULT '101869876543',
    emvco_payload TEXT,
    raw_ipn_callback TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_sub_active ON webhook_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_sub_id ON webhook_delivery_logs(subscription_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event ON webhook_delivery_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_trans_invoice ON payment_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_trans_code ON payment_transactions(transaction_code);

-- Seed initial default webhook endpoints (114 SAR Emergency & Maritime Coastal System)
INSERT INTO webhook_subscriptions (name, target_url, secret_key, events_subscribed, is_active)
VALUES 
(
    'Trung tâm Phối hợp Tìm kiếm Cứu nạn Hàng hải Việt Nam (VMRCC 114)',
    'https://api.vmrcc.gov.vn/webhook/v1/sar-alerts',
    'vju_sec_vmrcc_7f3e8f1c_9948',
    'SAR_EMERGENCY_TRIGGERED,BATTERY_CRITICAL_RTH',
    TRUE
),
(
    'Trạm Thông tin Duyên hải Hải Phòng (Hai Phong Coastal Radio)',
    'https://coastal.haiphong.gov.vn/api/uav-geofence-breach',
    'vju_sec_coastal_ab2523_007f',
    'GEOFENCE_BREACH,SAR_EMERGENCY_TRIGGERED',
    TRUE
),
(
    'Cổng Thanh toán VietQR NAPAS 247 Listener',
    'https://pay.uavpas.vju.edu.vn/api/v1/billing/webhook/payment-ipn',
    'vju_sec_napas_ipn_pay_2026',
    'PAYMENT_COMPLETED',
    TRUE
);
