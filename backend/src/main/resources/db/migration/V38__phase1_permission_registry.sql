-- Phase 1 BA permission registry (section 8.2): one permission per function instead of one READ and
-- one MANAGE per module. Existing grants are carried over so nobody gains or loses access:
--   * READ codes and PERMISSION_MANAGE are renamed (same meaning, BA names);
--   * every template or user grant/deny of a split code is copied to each of its function codes,
--     then the split codes (STATION/UAV/INVENTORY/MEDIA_MANAGE) are removed;
--   * USER_MANAGE stays (back office outside Phase 1) and also seeds USER_CREATE/UPDATE/LOCK/UNLOCK;
--   * MEDIA_VIEW seeds MEDIA_DOWNLOAD and each area's VIEW code seeds its dashboard code, because the
--     download URL and the dashboard figures used to follow those codes.

-- Renames merge rather than UPDATE the code: a server that already started with the new code base has
-- inserted the new codes (PermissionDataInitializer), and a plain rename would then hit the unique key.
CREATE TEMPORARY TABLE permission_rename (source VARCHAR(40) NOT NULL, target VARCHAR(40) NOT NULL);
INSERT INTO permission_rename (source, target) VALUES
    ('USER_READ', 'USER_VIEW'),
    ('PERMISSION_MANAGE', 'USER_PERMISSION_MANAGE'),
    ('STATION_READ', 'STATION_VIEW'),
    ('UAV_READ', 'UAV_VIEW'),
    ('INVENTORY_READ', 'INVENTORY_VIEW'),
    ('MEDIA_READ', 'MEDIA_VIEW'),
    ('DASHBOARD_READ', 'DASHBOARD_VIEW'),
    ('AUDIT_READ', 'AUDIT_VIEW');

INSERT INTO permissions (code, description, created_at, updated_at)
SELECT r.target, r.target, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM permission_rename r
WHERE EXISTS (SELECT 1 FROM permissions p WHERE p.code = r.source)
  AND NOT EXISTS (SELECT 1 FROM permissions p WHERE p.code = r.target);

INSERT INTO role_template_permissions (role_template_id, permission_id, created_at, updated_at)
SELECT x.role_template_id, target.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM role_template_permissions x
JOIN permissions source ON source.id = x.permission_id
JOIN permission_rename r ON r.source = source.code
JOIN permissions target ON target.code = r.target
WHERE NOT EXISTS (
    SELECT 1 FROM role_template_permissions y
    WHERE y.role_template_id = x.role_template_id AND y.permission_id = target.id);

-- A user override already set on the new code wins over the one carried over from the old code.
INSERT INTO user_permissions (user_id, permission_id, granted, created_at, updated_at)
SELECT u.user_id, target.id, u.granted, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM user_permissions u
JOIN permissions source ON source.id = u.permission_id
JOIN permission_rename r ON r.source = source.code
JOIN permissions target ON target.code = r.target
WHERE NOT EXISTS (
    SELECT 1 FROM user_permissions v WHERE v.user_id = u.user_id AND v.permission_id = target.id);

DELETE FROM role_template_permissions WHERE permission_id IN (
    SELECT p.id FROM permissions p JOIN permission_rename r ON r.source = p.code);
DELETE FROM user_permissions WHERE permission_id IN (
    SELECT p.id FROM permissions p JOIN permission_rename r ON r.source = p.code);
DELETE FROM permissions WHERE code IN (SELECT source FROM permission_rename);
DROP TABLE permission_rename;

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
