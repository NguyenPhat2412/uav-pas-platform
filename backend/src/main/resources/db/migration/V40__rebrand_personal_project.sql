-- UAV PAS is a personal project demo, not affiliated with any school or public agency.
-- Earlier migrations seeded school branding and webhook endpoints that looked like real
-- government/payment partners; this rewrites that seed data without touching applied migrations.

-- Assistant system prompt: drop the school name (only if it is still the seeded text).
UPDATE ai_router_settings
SET system_prompt = REPLACE(system_prompt, 'nền tảng điều phối UAV PAS (VJU)', 'nền tảng điều phối UAV PAS (bản demo đồ án cá nhân)')
WHERE id = 1
  AND system_prompt LIKE '%UAV PAS (VJU)%';

-- Map centre descriptions: the coordinates stay, the school name goes.
UPDATE system_configurations
SET description = REPLACE(description, '(Khu CNC Hòa Lạc - VJU)', '(Khu CNC Hòa Lạc)')
WHERE config_key IN ('map.default_center_lat', 'map.default_center_lng');

-- Seeded webhook endpoints pointed at real-looking government and payment hosts. They were never
-- real integrations: rename them as demo entries, point them at a reserved .invalid host and disable them.
UPDATE webhook_subscriptions
SET name       = 'Demo: hệ thống cứu nạn (giả lập)',
    target_url = 'https://sar-alerts.example.invalid/webhook',
    secret_key = 'demo_sec_sar_alerts_7f3e8f1c',
    is_active  = FALSE
WHERE target_url = 'https://api.vmrcc.gov.vn/webhook/v1/sar-alerts';

UPDATE webhook_subscriptions
SET name       = 'Demo: cảnh báo vùng cấm bay (giả lập)',
    target_url = 'https://geofence-alerts.example.invalid/webhook',
    secret_key = 'demo_sec_geofence_ab2523',
    is_active  = FALSE
WHERE target_url = 'https://coastal.haiphong.gov.vn/api/uav-geofence-breach';

UPDATE webhook_subscriptions
SET name       = 'Demo: thông báo thanh toán (giả lập)',
    target_url = 'https://payment-ipn.example.invalid/webhook',
    secret_key = 'demo_sec_payment_ipn_2026',
    is_active  = FALSE
WHERE target_url = 'https://pay.uavpas.vju.edu.vn/api/v1/billing/webhook/payment-ipn';
