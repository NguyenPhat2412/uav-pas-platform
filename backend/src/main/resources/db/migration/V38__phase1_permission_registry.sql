-- Phase 1 BA permission registry (section 8.2): one permission per function instead of one READ and
-- one MANAGE per module. Existing grants are carried over so nobody gains or loses access:
--   * READ codes and PERMISSION_MANAGE are renamed (same meaning, BA names);
--   * every template or user grant/deny of a split code is copied to each of its function codes,
--     then the split codes (STATION/UAV/INVENTORY/MEDIA_MANAGE) are removed;
--   * USER_MANAGE stays (back office outside Phase 1) and also seeds USER_CREATE/UPDATE/LOCK/UNLOCK;
--   * MEDIA_VIEW seeds MEDIA_DOWNLOAD and each area's VIEW code seeds its dashboard code, because the
--     download URL and the dashboard figures used to follow those codes.

UPDATE permissions SET code = 'USER_VIEW', description = 'USER_VIEW' WHERE code = 'USER_READ';
UPDATE permissions SET code = 'USER_PERMISSION_MANAGE', description = 'USER_PERMISSION_MANAGE'
    WHERE code = 'PERMISSION_MANAGE';
UPDATE permissions SET code = 'STATION_VIEW', description = 'STATION_VIEW' WHERE code = 'STATION_READ';
UPDATE permissions SET code = 'UAV_VIEW', description = 'UAV_VIEW' WHERE code = 'UAV_READ';
UPDATE permissions SET code = 'INVENTORY_VIEW', description = 'INVENTORY_VIEW' WHERE code = 'INVENTORY_READ';
UPDATE permissions SET code = 'MEDIA_VIEW', description = 'MEDIA_VIEW' WHERE code = 'MEDIA_READ';
UPDATE permissions SET code = 'DASHBOARD_VIEW', description = 'DASHBOARD_VIEW' WHERE code = 'DASHBOARD_READ';
UPDATE permissions SET code = 'AUDIT_VIEW', description = 'AUDIT_VIEW' WHERE code = 'AUDIT_READ';

CREATE TEMPORARY TABLE permission_split (source VARCHAR(40) NOT NULL, target VARCHAR(40) NOT NULL);
INSERT INTO permission_split (source, target) VALUES
    ('STATION_MANAGE', 'STATION_CREATE'),
    ('STATION_MANAGE', 'STATION_UPDATE'),
    ('STATION_MANAGE', 'STATION_STATUS_UPDATE'),
    ('UAV_MANAGE', 'UAV_CREATE'),
    ('UAV_MANAGE', 'UAV_UPDATE'),
    ('UAV_MANAGE', 'UAV_STATUS_UPDATE'),
    ('UAV_MANAGE', 'UAV_MAINTENANCE_VIEW'),
    ('UAV_MANAGE', 'UAV_MAINTENANCE_CREATE'),
    ('UAV_MANAGE', 'UAV_MAINTENANCE_UPDATE'),
    ('INVENTORY_MANAGE', 'INVENTORY_ITEM_CREATE'),
    ('INVENTORY_MANAGE', 'INVENTORY_ITEM_UPDATE'),
    ('INVENTORY_MANAGE', 'INVENTORY_STOCK_IN'),
    ('INVENTORY_MANAGE', 'INVENTORY_STOCK_OUT'),
    ('INVENTORY_MANAGE', 'INVENTORY_RESERVE'),
    ('INVENTORY_MANAGE', 'INVENTORY_RELEASE'),
    ('INVENTORY_MANAGE', 'INVENTORY_TRANSFER'),
    ('INVENTORY_MANAGE', 'INVENTORY_HISTORY_VIEW'),
    ('MEDIA_MANAGE', 'MEDIA_UPLOAD'),
    ('MEDIA_MANAGE', 'MEDIA_DELETE'),
    ('MEDIA_VIEW', 'MEDIA_DOWNLOAD'),
    ('USER_MANAGE', 'USER_CREATE'),
    ('USER_MANAGE', 'USER_UPDATE'),
    ('USER_MANAGE', 'USER_LOCK'),
    ('USER_MANAGE', 'USER_UNLOCK'),
    ('USER_VIEW', 'DASHBOARD_USER'),
    ('UAV_VIEW', 'DASHBOARD_UAV'),
    ('STATION_VIEW', 'DASHBOARD_STATION'),
    ('INVENTORY_VIEW', 'DASHBOARD_INVENTORY');

INSERT INTO permissions (code, description, created_at, updated_at)
SELECT DISTINCT s.target, s.target, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM permission_split s
WHERE NOT EXISTS (SELECT 1 FROM permissions p WHERE p.code = s.target);

INSERT INTO role_template_permissions (role_template_id, permission_id, created_at, updated_at)
SELECT DISTINCT x.role_template_id, target.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM role_template_permissions x
JOIN permissions source ON source.id = x.permission_id
JOIN permission_split s ON s.source = source.code
JOIN permissions target ON target.code = s.target
WHERE NOT EXISTS (
    SELECT 1 FROM role_template_permissions y
    WHERE y.role_template_id = x.role_template_id AND y.permission_id = target.id);

INSERT INTO user_permissions (user_id, permission_id, granted, created_at, updated_at)
SELECT DISTINCT u.user_id, target.id, u.granted, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM user_permissions u
JOIN permissions source ON source.id = u.permission_id
JOIN permission_split s ON s.source = source.code
JOIN permissions target ON target.code = s.target
WHERE NOT EXISTS (
    SELECT 1 FROM user_permissions v WHERE v.user_id = u.user_id AND v.permission_id = target.id);

DELETE FROM role_template_permissions WHERE permission_id IN (
    SELECT id FROM permissions WHERE code IN ('STATION_MANAGE', 'UAV_MANAGE', 'INVENTORY_MANAGE', 'MEDIA_MANAGE'));
DELETE FROM user_permissions WHERE permission_id IN (
    SELECT id FROM permissions WHERE code IN ('STATION_MANAGE', 'UAV_MANAGE', 'INVENTORY_MANAGE', 'MEDIA_MANAGE'));
DELETE FROM permissions WHERE code IN ('STATION_MANAGE', 'UAV_MANAGE', 'INVENTORY_MANAGE', 'MEDIA_MANAGE');

DROP TABLE permission_split;
