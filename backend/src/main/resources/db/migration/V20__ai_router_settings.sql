-- Single-row settings for the 9router AI gateway used by the admin assistant.
-- The API key is stored AES-GCM encrypted (never returned to clients); NULL means not connected.
CREATE TABLE IF NOT EXISTS ai_router_settings (
    id             SMALLINT PRIMARY KEY CHECK (id = 1),
    base_url       VARCHAR(255) NOT NULL,
    api_key_cipher TEXT,
    api_key_hint   VARCHAR(8),
    mode1_label    VARCHAR(40)  NOT NULL,
    mode1_model    VARCHAR(120),
    mode2_label    VARCHAR(40)  NOT NULL,
    mode2_model    VARCHAR(120),
    system_prompt  VARCHAR(4000),
    enabled        BOOLEAN      NOT NULL DEFAULT FALSE,
    version        BIGINT       NOT NULL DEFAULT 0,
    updated_at     TIMESTAMP(6),
    updated_by     VARCHAR(100)
);

INSERT INTO ai_router_settings (id, base_url, mode1_label, mode2_label, system_prompt, enabled)
VALUES (1, 'https://router.anhchau.all1.vn/v1', 'Nhanh', 'Chuyên sâu',
        'Bạn là trợ lý quản trị của nền tảng điều phối UAV PAS (VJU). Trả lời ngắn gọn, chính xác bằng ngôn ngữ người dùng đang dùng. Không bịa số liệu hệ thống; nếu không có dữ liệu, hãy nói rõ.',
        FALSE)
ON CONFLICT (id) DO NOTHING;
