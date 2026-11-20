-- ==============================================================================
-- V64__scrub_ui_translations_rtk_and_demo_pilot.sql
-- 1. Scrub restricted RTK / centimeter claims from PostgreSQL ui_translations
--    so /api/v1/public/i18n/{locale} serves 100% content-guard compliant copy.
-- 2. Seed demo_pilot (ROLE_OPERATOR) linked to Fleet 1 for S3 Pilot Workbench QA.
-- ==============================================================================

-- 1. Override specific publicSite showcase/capabilities/pricing keys in ui_translations
UPDATE ui_translations
SET message_text = 'Telemetry & Định vị GNSS', updated_at = CURRENT_TIMESTAMP
WHERE translation_key = 'publicSite.capabilities.f2Badge' AND locale = 'vi';

UPDATE ui_translations
SET message_text = 'Live Telemetry & GNSS', updated_at = CURRENT_TIMESTAMP
WHERE translation_key = 'publicSite.capabilities.f2Badge' AND locale = 'en';

UPDATE ui_translations
SET message_text = 'ライブテレメトリ & GNSS', updated_at = CURRENT_TIMESTAMP
WHERE translation_key = 'publicSite.capabilities.f2Badge' AND locale = 'ja';

UPDATE ui_translations
SET message_text = 'Định vị vệ tinh đa hệ GNSS ổn định', updated_at = CURRENT_TIMESTAMP
WHERE translation_key = 'publicSite.showcase.p2Spec' AND locale = 'vi';

UPDATE ui_translations
SET message_text = 'Multi-constellation GNSS positioning', updated_at = CURRENT_TIMESTAMP
WHERE translation_key = 'publicSite.showcase.p2Spec' AND locale = 'en';

UPDATE ui_translations
SET message_text = 'マルチGNSS衛星測位対応', updated_at = CURRENT_TIMESTAMP
WHERE translation_key = 'publicSite.showcase.p2Spec' AND locale = 'ja';

UPDATE ui_translations
SET message_text = 'Xác định vị trí qua đa hệ vệ tinh GPS, GLONASS, Galileo, BeiDou phục vụ đồng bộ toạ độ lộ trình bay và gắn thẻ địa lý cho ảnh khảo sát.',
    updated_at = CURRENT_TIMESTAMP
WHERE translation_key = 'publicSite.showcase.p2Text' AND locale = 'vi';

UPDATE ui_translations
SET message_text = 'Tracks multi-constellation GPS, GLONASS, Galileo, and BeiDou satellites for flight-path tracking and geo-tagged survey imagery.',
    updated_at = CURRENT_TIMESTAMP
WHERE translation_key = 'publicSite.showcase.p2Text' AND locale = 'en';

UPDATE ui_translations
SET message_text = 'GPS・GLONASS・Galileo・BeiDou衛星を受信し、飛行経路の同期と測量画像のジオタグ記録を支援します。',
    updated_at = CURRENT_TIMESTAMP
WHERE translation_key = 'publicSite.showcase.p2Text' AND locale = 'ja';

-- Scrub any remaining RTK occurrences across ui_translations
UPDATE ui_translations
SET message_text = REPLACE(
        REPLACE(
            REPLACE(
                REPLACE(message_text, 'GNSS / RTK', 'GNSS'),
                'GNSS/RTK',
                'GNSS'
            ),
            'GPS RTK',
            'GNSS'
        ),
        'RTK',
        'GNSS'
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE message_text LIKE '%RTK%';

-- 2. Seed demo_pilot (ROLE_OPERATOR) and link to demo_fleet pilot #1
INSERT INTO users (username, email, password_hash, full_name, phone_number, role, status, email_verified, failed_attempts, manual_locked, created_at, updated_at)
VALUES (
    'demo_pilot',
    'demo.pilot@gmail.com',
    '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi5L3s2W0p8tG5Q7r0nQ4Y6s8m9K1a2',
    'Kỹ sư Trần Minh Quân — minh hoạ',
    '0909300101',
    'ROLE_OPERATOR',
    'ACTIVE',
    TRUE,
    0,
    FALSE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (username) DO NOTHING;

UPDATE provider_pilots
SET pilot_user_id = (SELECT u.id FROM users u WHERE u.username = 'demo_pilot')
WHERE license_number = 'CC-BAY-DEMO-101'
  AND EXISTS (SELECT 1 FROM users u WHERE u.username = 'demo_pilot');
