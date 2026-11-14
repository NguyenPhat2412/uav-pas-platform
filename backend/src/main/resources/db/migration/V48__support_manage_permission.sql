-- The support inbox (REST /admin/support and the admin frames of the realtime socket) was gated on
-- DASHBOARD_VIEW, which every customer template holds: any signed-in customer could read every
-- visitor thread and received all ADMIN_SUPPORT_UPDATED frames. Support now needs SUPPORT_MANAGE,
-- granted to the staff templates only (ROLE_ADMIN gets it through allOf in PermissionDataInitializer).
INSERT INTO permissions (code, description, created_at, updated_at)
SELECT 'SUPPORT_MANAGE', 'SUPPORT_MANAGE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'SUPPORT_MANAGE');

INSERT INTO role_template_permissions (role_template_id, permission_id, created_at, updated_at)
SELECT t.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM role_templates t
JOIN permissions p ON p.code = 'SUPPORT_MANAGE'
WHERE t.role IN ('ROLE_ADMIN', 'ROLE_COMMANDER', 'ROLE_OPERATOR')
  AND t.defaults_initialized = TRUE
  AND NOT EXISTS (
      SELECT 1 FROM role_template_permissions x
      WHERE x.role_template_id = t.id AND x.permission_id = p.id);
