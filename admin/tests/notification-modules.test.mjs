import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ADMIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => readFile(path.join(ADMIN_ROOT, rel), 'utf8');

async function loadTs(rel) {
    const source = await read(rel);
    const compiled = ts.transpileModule(source, {
        compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022},
    }).outputText;
    return import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
}

test('notification-policy-form enforces mandatory safety invariants, clamps cooldowns, and maps portal deep-links', async () => {
    const mod = await loadTs('src/forms/notification-policy-form.ts');

    assert.equal(mod.popupDurationMs('CRITICAL'), 0);
    assert.equal(mod.popupDurationMs('ACTION'), 6500);
    assert.equal(mod.popupDurationMs('INFO'), 4500);

    const updatedMandatory = mod.toUpdateModulePolicyPayload(
        {
            id: 1,
            moduleCode: 'SAR',
            displayNameVi: 'SAR',
            displayNameEn: 'SAR',
            displayNameJa: 'SAR',
            descriptionVi: '',
            descriptionEn: '',
            descriptionJa: '',
            severity: 'CRITICAL',
            enabled: true,
            mandatory: true,
            inAppEnabled: true,
            screenPopupEnabled: true,
            desktopOsEnabled: true,
            mobilePushEnabled: true,
            emailEnabled: true,
            cooldownSeconds: 0,
            sortOrder: 10,
            updatedAt: null,
        },
        {inAppEnabled: false, screenPopupEnabled: false, cooldownSeconds: 999999},
    );
    assert.equal(updatedMandatory.inAppEnabled, true);
    assert.equal(updatedMandatory.screenPopupEnabled, true);
    assert.equal(updatedMandatory.cooldownSeconds, 86400);

    assert.equal(
        mod.resolveNotificationPortalHref('customer', {
            moduleCode: 'MISSION',
            referenceType: 'MISSION',
            referenceId: 55,
        }),
        '/customer/missions/55',
    );
    assert.equal(
        mod.resolveNotificationPortalHref('operations', {
            moduleCode: 'SAR',
            referenceType: 'SAR',
            referenceId: 8,
        }),
        '/operations/sar-cockpit',
    );
    assert.equal(
        mod.resolveNotificationPortalHref('admin', {
            moduleCode: 'STORAGE',
            referenceType: 'STORAGE',
            referenceId: null,
        }),
        '/admin/infrastructure/storage',
    );
});

test('LiveNotificationPopupHost, OS Notification API, and Admin Notification Modules page are wired end-to-end', async () => {
    const [providers, popupHost, adminPanel, routePage, routes] = await Promise.all([
        read('src/providers/PortalProviders.tsx'),
        read('src/components/notification/popup/LiveNotificationPopupHost.tsx'),
        read('src/components/notification/policy/NotificationModulesAdminPanel.tsx'),
        read('src/app/(admin)/admin/(portal)/notifications/modules/page.tsx'),
        read('src/lib/api/routes.ts'),
    ]);

    assert.match(providers, /<LiveNotificationPopupHost area=\{area\}\/>/);
    assert.match(popupHost, /window\.Notification/);
    assert.match(popupHost, /useRealtimeNotificationFeed/);
    assert.match(adminPanel, /NotificationModuleRowCard/);
    assert.match(routePage, /NotificationModulesAdminPanel/);
    assert.match(routes, /modules:\s*'\/api\/v1\/notifications\/modules'/);
    assert.match(routes, /preferences:\s*'\/api\/v1\/notifications\/preferences'/);
});
