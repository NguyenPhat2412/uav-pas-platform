-- Seed public Zalo support phone number into typed system settings.
-- Administrators can update or clear this value in Admin -> Platform Settings -> Public Contact Details.
INSERT INTO system_configurations
    (config_key, config_value, category, description, updated_by, value_type, min_value, max_value, is_public)
VALUES
    (
        'contact.zalo_phone',
        '0983549821',
        'CONTACT',
        'Số Zalo hỗ trợ & tư vấn trực tuyến hiển thị công khai (mở https://zalo.me/...). Để trống để ẩn',
        'SYSTEM',
        'PHONE',
        NULL,
        NULL,
        TRUE
    )
ON CONFLICT (config_key) DO UPDATE
SET config_value = CASE
        WHEN system_configurations.config_value = '' THEN EXCLUDED.config_value
        ELSE system_configurations.config_value
    END,
    is_public = TRUE;
