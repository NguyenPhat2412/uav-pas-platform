-- ==============================================================================
-- V42__production_airspace_permits_and_push_tokens.sql
-- 1. Clean remaining demo wording in AI router prompt and webhook subscriptions
-- 2. Civil aviation & urban airspace zones (PROHIBITED / RESTRICTED / WARNING)
-- 3. Mission flight permit columns & verification metadata
-- 4. Multi-device push notification tokens (Expo Push / mobile & web clients)
-- ==============================================================================

-- 1. Clean remaining DB demo strings from V40
UPDATE ai_router_settings
SET system_prompt = REPLACE(system_prompt, '(bản demo đồ án cá nhân)', '(hệ thống điều phối vận hành bay)')
WHERE system_prompt LIKE '%(bản demo đồ án cá nhân)%';

UPDATE webhook_subscriptions
SET name = 'Cảnh báo khẩn cấp Tìm kiếm Cứu nạn (SAR)'
WHERE name = 'Demo: hệ thống cứu nạn (giả lập)';

UPDATE webhook_subscriptions
SET name = 'Cảnh báo xâm phạm vùng không phận'
WHERE name = 'Demo: cảnh báo vùng cấm bay (giả lập)';

UPDATE webhook_subscriptions
SET name = 'Thông báo đối soát thanh toán VietQR'
WHERE name = 'Demo: thông báo thanh toán (giả lập)';

-- 2. Airspace zones table + spatial/lookup indexes
CREATE TABLE IF NOT EXISTS airspace_zones (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(40) NOT NULL UNIQUE,
    name VARCHAR(180) NOT NULL,
    zone_type VARCHAR(20) NOT NULL,
    geometry_type VARCHAR(20) NOT NULL,
    center_lat NUMERIC(10,7) NOT NULL,
    center_lng NUMERIC(10,7) NOT NULL,
    radius_meters INTEGER,
    polygon_vertices TEXT,
    max_altitude_agl_m INTEGER,
    authority VARCHAR(180) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    description VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_airspace_zones_active_type
    ON airspace_zones (active, zone_type);

CREATE INDEX IF NOT EXISTS idx_airspace_zones_center
    ON airspace_zones (center_lat, center_lng);

-- Seed Vietnam civil aviation airport CTRs and urban safety corridors
INSERT INTO airspace_zones (
    code,
    name,
    zone_type,
    geometry_type,
    center_lat,
    center_lng,
    radius_meters,
    polygon_vertices,
    max_altitude_agl_m,
    authority,
    active,
    description
) VALUES
    (
        'VVNB-CTR',
        'Vùng kiểm soát sân bay quốc tế Nội Bài',
        'PROHIBITED',
        'CIRCLE',
        21.2212000,
        105.8072000,
        8000,
        NULL,
        0,
        'Cục Hàng không Việt Nam (CAAV)',
        TRUE,
        'Vùng cấm bay dân dụng quanh Cảng hàng không quốc tế Nội Bài nhằm bảo đảm an toàn tiếp cận và cất hạ cánh.'
    ),
    (
        'VVTS-CTR',
        'Vùng kiểm soát sân bay quốc tế Tân Sơn Nhất',
        'PROHIBITED',
        'CIRCLE',
        10.8188000,
        106.6519000,
        8000,
        NULL,
        0,
        'Cục Hàng không Việt Nam (CAAV)',
        TRUE,
        'Vùng cấm bay dân dụng quanh Cảng hàng không quốc tế Tân Sơn Nhất.'
    ),
    (
        'VVDN-CTR',
        'Vùng kiểm soát sân bay quốc tế Đà Nẵng',
        'PROHIBITED',
        'CIRCLE',
        16.0439000,
        108.1994000,
        7000,
        NULL,
        0,
        'Cục Hàng không Việt Nam (CAAV)',
        TRUE,
        'Vùng cấm bay dân dụng quanh Cảng hàng không quốc tế Đà Nẵng.'
    ),
    (
        'VVCR-CTR',
        'Vùng kiểm soát sân bay quốc tế Cam Ranh',
        'PROHIBITED',
        'CIRCLE',
        11.9982000,
        109.2194000,
        7000,
        NULL,
        0,
        'Cục Hàng không Việt Nam (CAAV)',
        TRUE,
        'Vùng cấm bay dân dụng quanh Cảng hàng không quốc tế Cam Ranh.'
    ),
    (
        'VVPQ-CTR',
        'Vùng kiểm soát sân bay quốc tế Phú Quốc',
        'PROHIBITED',
        'CIRCLE',
        10.1698000,
        103.9931000,
        6500,
        NULL,
        0,
        'Cục Hàng không Việt Nam (CAAV)',
        TRUE,
        'Vùng cấm bay dân dụng quanh Cảng hàng không quốc tế Phú Quốc.'
    ),
    (
        'VN-HN-CENTER-P1',
        'Khu hành chính trung tâm Ba Đình',
        'PROHIBITED',
        'CIRCLE',
        21.0368000,
        105.8346000,
        2500,
        NULL,
        0,
        'Cơ quan quản lý không phận đô thị Hà Nội',
        TRUE,
        'Khu vực cấm bay bảo vệ an toàn công trình hành chính trung tâm đô thị Hà Nội.'
    ),
    (
        'VVGL-ATZ',
        'Vùng quản lý bay Gia Lâm',
        'RESTRICTED',
        'CIRCLE',
        21.0411000,
        105.8861000,
        5000,
        NULL,
        60,
        'Cục Hàng không Việt Nam (CAAV)',
        TRUE,
        'Vùng hạn chế bay sân bay Gia Lâm; mọi hoạt động bay UAV phải có giấy phép bay hợp lệ trước khi cất cánh.'
    ),
    (
        'VN-HN-REDRIVER-R1',
        'Hành lang an toàn cầu Nhật Tân - Sông Hồng',
        'RESTRICTED',
        'CIRCLE',
        21.0850000,
        105.8220000,
        2500,
        NULL,
        90,
        'Sở Giao thông Vận tải Hà Nội',
        TRUE,
        'Hành lang bảo vệ kết cấu cầu dây văng và giao thông đường thủy Sông Hồng; yêu cầu giấy phép bay.'
    ),
    (
        'VN-HN-HOALAC-W1',
        'Hành lang bay Khu Công nghệ cao Hòa Lạc',
        'WARNING',
        'CIRCLE',
        21.0124000,
        105.5253000,
        3500,
        NULL,
        120,
        'Ban Quản lý Khu Công nghệ cao Hòa Lạc',
        TRUE,
        'Khu vực khuyến cáo lưu ý mật độ bay thử nghiệm và khảo sát kỹ thuật; bay trên trần 120m AGL yêu cầu giấy phép bay.'
    )
ON CONFLICT (code) DO NOTHING;

-- 3. Add flight permit columns to missions
ALTER TABLE missions
    ADD COLUMN IF NOT EXISTS permit_status VARCHAR(20) NOT NULL DEFAULT 'NOT_REQUIRED',
    ADD COLUMN IF NOT EXISTS permit_number VARCHAR(80),
    ADD COLUMN IF NOT EXISTS permit_authority VARCHAR(180),
    ADD COLUMN IF NOT EXISTS permit_valid_from TIMESTAMP,
    ADD COLUMN IF NOT EXISTS permit_valid_until TIMESTAMP,
    ADD COLUMN IF NOT EXISTS permit_max_altitude_m INTEGER,
    ADD COLUMN IF NOT EXISTS permit_media_id BIGINT REFERENCES media_assets(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS permit_verified_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS permit_verified_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS permit_note VARCHAR(1000);

CREATE INDEX IF NOT EXISTS idx_missions_permit_status
    ON missions (permit_status);

-- 4. Create push_device_tokens table
CREATE TABLE IF NOT EXISTS push_device_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    platform VARCHAR(20) NOT NULL,
    device_name VARCHAR(120),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_push_device_tokens_user_active
    ON push_device_tokens (user_id, active);
