-- Sign-in is Google first (plus password for staff accounts); the Zalo login was never shipped.
-- Production had no user with a Zalo id when this was written. Dropping the column also drops its
-- unique constraint.
ALTER TABLE users DROP COLUMN IF EXISTS zalo_id;

-- Seed data written before the project became a civil, personal demo still used military wording.
UPDATE service_plans
SET name = 'Gói Enterprise (SAR)'
WHERE code = 'ENTERPRISE'
  AND name = 'Gói Tác Chiến Đặc Biệt (Enterprise/SAR)';

UPDATE training_documents
SET content_markdown = REPLACE(REPLACE(content_markdown,
        'Kiến trúc Buồng lái Tác chiến SAR', 'Kiến trúc Buồng lái SAR'),
        'Lưu ý chiến thuật khi bay', 'Lưu ý vận hành khi bay')
WHERE content_markdown LIKE '%Tác chiến SAR%' OR content_markdown LIKE '%chiến thuật khi bay%';

UPDATE training_lessons
SET body_markdown = REPLACE(REPLACE(body_markdown,
        'Kiến trúc Buồng lái Tác chiến SAR', 'Kiến trúc Buồng lái SAR'),
        'Lưu ý chiến thuật khi bay', 'Lưu ý vận hành khi bay')
WHERE body_markdown LIKE '%Tác chiến SAR%' OR body_markdown LIKE '%chiến thuật khi bay%';
