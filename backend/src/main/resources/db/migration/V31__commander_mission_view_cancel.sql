-- Commanders confirm, dispatch and close missions but could not list or open them (MISSION_VIEW)
-- or cancel them (MISSION_CANCEL). Both are now commander defaults (PermissionDataInitializer);
-- this grants them to commander role templates that were already initialized before that change.
INSERT INTO permissions (code, description, created_at, updated_at)
SELECT c.code, c.code, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES ('MISSION_VIEW'), ('MISSION_CANCEL')) AS c(code)
WHERE NOT EXISTS (SELECT 1 FROM permissions p WHERE p.code = c.code);

INSERT INTO role_template_permissions (role_template_id, permission_id, created_at, updated_at)
SELECT t.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM role_templates t
JOIN permissions p ON p.code IN ('MISSION_VIEW', 'MISSION_CANCEL')
WHERE t.role = 'ROLE_COMMANDER'
  AND t.defaults_initialized = TRUE
  AND NOT EXISTS (
      SELECT 1 FROM role_template_permissions x
      WHERE x.role_template_id = t.id AND x.permission_id = p.id);
