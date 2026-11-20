-- ==============================================================================
-- V59__intermediary_marketplace_i18n_and_fee_tiers.sql
-- 1. Dynamic Admin-Editable Fee Tiers (10% -> 6% -> 3%) in system_configurations
-- 2. Pure 3P Intermediary Marketplace Conversion (replace 1P UAV-PAS listings with Verified 3P Providers)
-- 3. SaaS Software & Marketplace Membership Positioning for service_plans
-- 4. PostgreSQL ui_translations Table for Database-Backed Multi-Language API (vi, en, ja)
-- ==============================================================================

-- 1. Seed dynamic marketplace fee tiers editable in Admin Settings & exposed via /api/v1/public/site-info
INSERT INTO system_configurations
    (config_key, config_value, category, description, updated_by, value_type, min_value, max_value, is_public)
VALUES
    (
        'marketplace.platform_fee_rate',
        '0.10',
        'MARKETPLACE',
        'Tỷ lệ hoa hồng trung gian mặc định cho tài khoản Cơ bản / Starter (0.10 = 10%)',
        'SYSTEM',
        'DECIMAL',
        0.0000,
        0.5000,
        TRUE
    ),
    (
        'marketplace.pro_fee_rate',
        '0.06',
        'MARKETPLACE',
        'Tỷ lệ hoa hồng trung gian ưu đãi cho đối tác gói Pro Partner (0.06 = 6%)',
        'SYSTEM',
        'DECIMAL',
        0.0000,
        0.5000,
        TRUE
    ),
    (
        'marketplace.enterprise_fee_rate',
        '0.03',
        'MARKETPLACE',
        'Tỷ lệ hoa hồng trung gian đặc quyền cho tổ chức gói Enterprise (0.03 = 3%)',
        'SYSTEM',
        'DECIMAL',
        0.0000,
        0.5000,
        TRUE
    )
ON CONFLICT (config_key) DO UPDATE
SET is_public = TRUE;

-- 2. Reposition service_plans to Software SaaS & Marketplace Partner Tiers (0% 1P drone rental wording)
UPDATE service_plans
SET name = 'Gói Starter (Thành viên Sàn Cơ bản)',
    description = 'Miễn phí tham gia sàn, công cụ lập vùng bay GIS cơ bản, kiểm tra NFZ/thời tiết và ký quỹ bảo vệ hai chiều.'
WHERE code = 'BASIC';

UPDATE service_plans
SET name = 'Gói Pro Partner (Đối tác Chuyên nghiệp)',
    description = 'Ưu đãi giảm phí hoa hồng sàn, mở khóa giám sát Telemetry RTK trực tuyến, sức khỏe pin SOH và ưu tiên hiển thị tin đăng.'
WHERE code = 'PRO';

UPDATE service_plans
SET name = 'Gói Enterprise (Trung tâm Chỉ huy & API)',
    description = 'Mức phí hoa hồng sàn thấp nhất, quản trị đa trạm RBAC, buồng lái khẩn cấp SAR/AI, lưu trữ đám mây lớn và tích hợp Webhook/API.'
WHERE code = 'ENTERPRISE';

-- 3. Seed Verified 3P Independent Partner Accounts & Profiles, and convert any 1P platform listings to 3P
INSERT INTO users (username, email, password_hash, full_name, phone_number, role, status, email_verified, failed_attempts, manual_locked, created_at, updated_at)
VALUES
    ('skysurvey_vn', 'contact@skysurvey.vn', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi5L3s2W0p8tG5Q7r0nQ4Y6s8m9K1a2', 'SkySurvey GeoTech JSC', '0912345601', 'ROLE_PILOT', 'ACTIVE', TRUE, 0, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('aerogrid_inspect', 'ops@aerogrid.vn', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi5L3s2W0p8tG5Q7r0nQ4Y6s8m9K1a2', 'AeroGrid Infrastructure Co.', '0912345602', 'ROLE_PILOT', 'ACTIVE', TRUE, 0, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('mekong_agrodrone', 'dispatch@mekongdrone.vn', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi5L3s2W0p8tG5Q7r0nQ4Y6s8m9K1a2', 'Mekong Agro & Media UAV', '0912345603', 'ROLE_PILOT', 'ACTIVE', TRUE, 0, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (username) DO NOTHING;

INSERT INTO provider_profiles (
    user_id, slug, display_name, provider_type, tax_or_id_number, flight_license_number,
    bio, province, service_radius_km, contact_phone, bank_name, bank_account_number, bank_account_holder,
    verification_status, verified_at, verified_by, rating_avg, review_count, completed_missions_count,
    created_at, updated_at
)
SELECT
    u.id,
    'skysurvey-geotech-jsc',
    'SkySurvey GeoTech JSC',
    'COMPANY',
    '0109881201',
    'VN-CAAV-UAV-2026-018',
    'Đơn vị trắc địa và bản đồ số RTK độc lập chuyên khảo sát địa hình 2D/3D, LiDAR công trình hạ tầng tại miền Bắc & miền Trung.',
    'Hà Nội',
    350,
    '0912345601',
    'Vietcombank',
    '0011009881201',
    'CONG TY CP SKYSURVEY GEOTECH',
    'VERIFIED',
    CURRENT_TIMESTAMP,
    'SYSTEM',
    4.90,
    38,
    124,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM users u
WHERE u.username = 'skysurvey_vn'
  AND NOT EXISTS (SELECT 1 FROM provider_profiles p WHERE p.user_id = u.id);

INSERT INTO provider_profiles (
    user_id, slug, display_name, provider_type, tax_or_id_number, flight_license_number,
    bio, province, service_radius_km, contact_phone, bank_name, bank_account_number, bank_account_holder,
    verification_status, verified_at, verified_by, rating_avg, review_count, completed_missions_count,
    created_at, updated_at
)
SELECT
    u.id,
    'aerogrid-infrastructure',
    'AeroGrid Infrastructure Co.',
    'COMPANY',
    '0316554302',
    'VN-CAAV-UAV-2026-042',
    'Đối tác chuyên kiểm tra hành lang lưới điện cao thế, tuabin điện gió, cầu cảng và cảm biến nhiệt công nghiệp.',
    'Đà Nẵng',
    400,
    '0912345602',
    'ACB',
    '1688554302',
    'CONG TY TNHH AEROGRID INFRASTRUCTURE',
    'VERIFIED',
    CURRENT_TIMESTAMP,
    'SYSTEM',
    4.85,
    27,
    89,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM users u
WHERE u.username = 'aerogrid_inspect'
  AND NOT EXISTS (SELECT 1 FROM provider_profiles p WHERE p.user_id = u.id);

INSERT INTO provider_profiles (
    user_id, slug, display_name, provider_type, tax_or_id_number, flight_license_number,
    bio, province, service_radius_km, contact_phone, bank_name, bank_account_number, bank_account_holder,
    verification_status, verified_at, verified_by, rating_avg, review_count, completed_missions_count,
    created_at, updated_at
)
SELECT
    u.id,
    'mekong-agro-media-uav',
    'Mekong Agro & Media UAV',
    'COMPANY',
    '1801776503',
    'VN-CAAV-UAV-2026-079',
    'Đơn vị cung cấp dịch vụ bay đa phổ nông nghiệp chính xác, ghi hình tiến độ dự án 4K và tổ lái UAV chuyên ngành phía Nam.',
    'TP. Hồ Chí Minh',
    300,
    '0912345603',
    'Techcombank',
    '190377650388',
    'CONG TY TNHH MEKONG AGRO MEDIA UAV',
    'VERIFIED',
    CURRENT_TIMESTAMP,
    'SYSTEM',
    4.80,
    19,
    63,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM users u
WHERE u.username = 'mekong_agrodrone'
  AND NOT EXISTS (SELECT 1 FROM provider_profiles p WHERE p.user_id = u.id);

-- Convert legacy 1P platform listings (provider_id IS NULL) to Verified 3P Providers
UPDATE marketplace_listings m
SET provider_id = (
        CASE
            WHEN m.mission_type = 'DATA_COLLECTION' THEN (SELECT id FROM provider_profiles WHERE slug = 'aerogrid-infrastructure' LIMIT 1)
            WHEN m.mission_type = 'AERIAL_RECORDING' THEN (SELECT id FROM provider_profiles WHERE slug = 'mekong-agro-media-uav' LIMIT 1)
            ELSE (SELECT id FROM provider_profiles WHERE slug = 'skysurvey-geotech-jsc' LIMIT 1)
        END
    ),
    title = REPLACE(m.title, ' (Đội bay Chính hãng UAV-PAS)', ''),
    summary = REPLACE(
        COALESCE(m.summary, ''),
        'do đội ngũ kỹ thuật UAV-PAS trực tiếp triển khai',
        'do đối tác độc lập đã xác minh KYC trên sàn UAV PAS triển khai'
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE m.provider_id IS NULL
   OR m.title LIKE '%Đội bay Chính hãng UAV-PAS%';

-- 4. Database-backed UI Translations table for dynamic trilingual API (vi, en, ja)
CREATE TABLE IF NOT EXISTS ui_translations (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    namespace VARCHAR(60) NOT NULL DEFAULT 'publicSite',
    translation_key VARCHAR(180) NOT NULL,
    locale VARCHAR(10) NOT NULL,
    message_text TEXT NOT NULL,
    description VARCHAR(255),
    updated_by VARCHAR(100) DEFAULT 'SYSTEM',
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_ui_translations_key_locale UNIQUE (translation_key, locale)
);

CREATE INDEX IF NOT EXISTS idx_ui_translations_locale_ns
    ON ui_translations (locale, namespace);

CREATE INDEX IF NOT EXISTS idx_ui_translations_key
    ON ui_translations (translation_key);
