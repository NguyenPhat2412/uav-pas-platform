import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const atRoot = path => `${root}${path}`;
const backend = atRoot('backend');
const operations = atRoot('apps/operations');
const customer = atRoot('apps/customer');
const admin = atRoot('apps/admin');

test('Database Flyway migrations V4, V5, V6, V7 exist and contain proper schemas', () => {
  const migrationsDir = `${backend}/src/main/resources/db/migration`;
  
  assert.equal(existsSync(`${migrationsDir}/V4__sar_and_ai_detection.sql`), true, 'V4 migration must exist');
  assert.equal(existsSync(`${migrationsDir}/V5__notifications.sql`), true, 'V5 migration must exist');
  assert.equal(existsSync(`${migrationsDir}/V6__billing_and_quotas.sql`), true, 'V6 migration must exist');
  assert.equal(existsSync(`${migrationsDir}/V7__system_configurations.sql`), true, 'V7 migration must exist');
  assert.equal(existsSync(`${migrationsDir}/V8__webhooks_and_telemetry_events.sql`), true, 'V8 migration must exist');

  const v4 = readFileSync(`${migrationsDir}/V4__sar_and_ai_detection.sql`, 'utf8');
  assert.match(v4, /CREATE TABLE (?:IF NOT EXISTS )?sar_missions/);
  assert.match(v4, /CREATE TABLE (?:IF NOT EXISTS )?ai_tasks/);
  assert.match(v4, /CREATE TABLE (?:IF NOT EXISTS )?ai_detections/);

  const v5 = readFileSync(`${migrationsDir}/V5__notifications.sql`, 'utf8');
  assert.match(v5, /CREATE TABLE (?:IF NOT EXISTS )?notifications/);

  const v6 = readFileSync(`${migrationsDir}/V6__billing_and_quotas.sql`, 'utf8');
  assert.match(v6, /CREATE TABLE (?:IF NOT EXISTS )?service_plans/);
  assert.match(v6, /CREATE TABLE (?:IF NOT EXISTS )?user_quotas/);
  assert.match(v6, /CREATE TABLE (?:IF NOT EXISTS )?invoices/);

  const v7 = readFileSync(`${migrationsDir}/V7__system_configurations.sql`, 'utf8');
  assert.match(v7, /CREATE TABLE (?:IF NOT EXISTS )?system_configurations/);
  assert.match(v7, /uav\.safety\.min_battery_threshold/);
  assert.match(v7, /ai\.detection\.confidence_threshold/);

  const v8 = readFileSync(`${migrationsDir}/V8__webhooks_and_telemetry_events.sql`, 'utf8');
  assert.match(v8, /CREATE TABLE (?:IF NOT EXISTS )?webhook_subscriptions/);
  assert.match(v8, /CREATE TABLE (?:IF NOT EXISTS )?webhook_delivery_logs/);
  assert.match(v8, /CREATE TABLE (?:IF NOT EXISTS )?payment_transactions/);
});

test('Operations App has NotificationBell and Notifications page', () => {
  const bellPath = `${operations}/src/components/notifications/NotificationBell.tsx`;
  const pagePath = `${operations}/app/(portal)/notifications/page.tsx`;
  const shellPath = `${operations}/src/components/layout/AppShell.tsx`;

  assert.equal(existsSync(bellPath), true, 'NotificationBell must exist');
  assert.equal(existsSync(pagePath), true, 'Notifications page must exist in operations');

  const bellContent = readFileSync(bellPath, 'utf8');
  assert.match(bellContent, /\/api\/v1\/notifications\/unread-count/);
  assert.match(bellContent, /NotificationItem/);

  const shellContent = readFileSync(shellPath, 'utf8');
  assert.match(shellContent, /NotificationBell/);
  assert.match(shellContent, /\/notifications/);
});

test('Customer Portal has Billing & Quotas and Notifications pages', () => {
  const billingPath = `${customer}/app/(portal)/billing/page.tsx`;
  const notifPath = `${customer}/app/(portal)/notifications/page.tsx`;
  const layoutPath = `${customer}/src/components/layout.tsx`;

  assert.equal(existsSync(billingPath), true, 'Customer billing page must exist');
  assert.equal(existsSync(notifPath), true, 'Customer notifications page must exist');

  const billingContent = readFileSync(billingPath, 'utf8');
  assert.match(billingContent, /VietQR/i);
  assert.match(billingContent, /flightHoursUsed/);
  assert.match(billingContent, /monthlyFlightHoursLimit/);
  assert.match(billingContent, /my-quota/);
  assert.match(billingContent, /my-invoices/);

  const notifContent = readFileSync(notifPath, 'utf8');
  assert.match(notifContent, /Thông báo/);

  const layoutContent = readFileSync(layoutPath, 'utf8');
  assert.match(layoutContent, /\/billing/);
  assert.match(layoutContent, /\/notifications/);
});

test('Admin Portal has Billing Management, Reports & CSV Export, and Settings Configuration', () => {
  const billingPath = `${admin}/app/(portal)/billing/page.tsx`;
  const reportsPath = `${admin}/app/(portal)/reports/page.tsx`;
  const settingsPath = `${admin}/app/(portal)/settings/page.tsx`;
  const shellPath = `${admin}/src/components/layout/AppShell.tsx`;

  assert.equal(existsSync(billingPath), true, 'Admin billing page must exist');
  assert.equal(existsSync(reportsPath), true, 'Admin reports page must exist');
  assert.equal(existsSync(settingsPath), true, 'Admin settings page must exist');

  const billingContent = readFileSync(billingPath, 'utf8');
  assert.match(billingContent, /Gói Cước/i);
  assert.match(billingContent, /User Quotas/i);
  assert.match(billingContent, /\/api\/v1\/billing/);

  const reportsContent = readFileSync(reportsPath, 'utf8');
  assert.match(reportsContent, /Xuất Báo Cáo CSV/i);
  assert.match(reportsContent, /sarOperationsCount/);
  assert.match(reportsContent, /victimsRescued/);

  const settingsContent = readFileSync(settingsPath, 'utf8');
  assert.match(settingsContent, /Geofencing/i);
  assert.match(settingsContent, /KV260/i);
  assert.match(settingsContent, /YOLOv8s/i);

  const shellContent = readFileSync(shellPath, 'utf8');
  assert.match(shellContent, /\/billing/);
  assert.match(shellContent, /\/reports/);
  assert.match(shellContent, /\/settings/);
});
