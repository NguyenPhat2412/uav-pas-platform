import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

const vi = JSON.parse(await readFile(new URL('../src/messages/vi.json', import.meta.url), 'utf8'));
const en = JSON.parse(await readFile(new URL('../src/messages/en.json', import.meta.url), 'utf8'));
const ja = JSON.parse(await readFile(new URL('../src/messages/ja.json', import.meta.url), 'utf8'));

const customerVi = JSON.parse(await readFile(new URL('../src/messages/customer/vi.json', import.meta.url), 'utf8'));
const customerEn = JSON.parse(await readFile(new URL('../src/messages/customer/en.json', import.meta.url), 'utf8'));
const customerJa = JSON.parse(await readFile(new URL('../src/messages/customer/ja.json', import.meta.url), 'utf8'));

test('i18n: all root catalogs have matching top-level sections', () => {
    const viKeys = Object.keys(vi).sort();
    const enKeys = Object.keys(en).sort();
    const jaKeys = Object.keys(ja).sort();

    assert.deepEqual(viKeys, enKeys, 'vi and en should have matching top-level keys');
    assert.deepEqual(viKeys, jaKeys, 'vi and ja should have matching top-level keys');
});

test('i18n: common section contains language switch labels including japanese in all locales', () => {
    for (const catalog of [vi, en, ja]) {
        assert.ok(catalog.common.vietnamese, 'vietnamese label exists');
        assert.ok(catalog.common.english, 'english label exists');
        assert.ok(catalog.common.japanese, 'japanese label exists');
        assert.ok(catalog.common.logout, 'logout label exists');
    }
    assert.equal(vi.common.japanese, 'Tiếng Nhật');
    assert.equal(en.common.japanese, 'Japanese');
    assert.equal(ja.common.japanese, '日本語');
});

test('i18n: shell and navigation keys exist for operations, admin and customer', () => {
    const requiredShellKeys = [
        'skipToContent', 'expandSidebar', 'collapseSidebar', 'openNavigation',
        'closeNavigation', 'operationsTitle', 'adminTitle', 'customerTitle',
        'operationsSection', 'adminSection', 'customerSection', 'vjuUniversity'
    ];

    for (const catalog of [vi, en, ja]) {
        for (const k of requiredShellKeys) {
            assert.ok(catalog.shell[k], `shell.${k} missing in catalog`);
        }
    }

    const requiredOpsNav = [
        'overview', 'sar', 'dispatchMissions', 'assignedMissions', 'stations',
        'uavs', 'maintenance', 'inventory', 'media', 'notifications', 'audit'
    ];
    for (const catalog of [vi, en, ja]) {
        for (const k of requiredOpsNav) {
            assert.ok(catalog.operationsNav[k], `operationsNav.${k} missing`);
        }
    }

    const requiredAdminNav = [
        'dashboard', 'users', 'accessControl', 'roleTemplates', 'permissions',
        'billing', 'reports', 'webhooks', 'settings', 'auditLogs'
    ];
    for (const catalog of [vi, en, ja]) {
        for (const k of requiredAdminNav) {
            assert.ok(catalog.adminNav[k], `adminNav.${k} missing`);
        }
    }
});

test('i18n: preview section is synchronized across all locales', () => {
    const previewKeys = Object.keys(ja.preview).sort();
    assert.deepEqual(Object.keys(vi.preview).sort(), previewKeys, 'vi.preview matches ja.preview');
    assert.deepEqual(Object.keys(en.preview).sort(), previewKeys, 'en.preview matches ja.preview');
});

test('i18n: customer catalogs have matching navigation and common keys', () => {
    for (const catalog of [customerVi, customerEn, customerJa]) {
        assert.ok(catalog.nav.dashboard);
        assert.ok(catalog.nav.services);
        assert.ok(catalog.nav.missions);
        assert.ok(catalog.nav.billing);
        assert.ok(catalog.nav.notifications);
        assert.ok(catalog.nav.profile);
        assert.ok(catalog.common.authenticating);
        assert.ok(catalog.common.permissionError);
        assert.ok(catalog.common.retry);
    }
});

test('i18n: normalizeLocale handles standard and regional locale tags', async () => {
    const tsCode = await readFile(new URL('../src/i18n/config.ts', import.meta.url), 'utf8');
    const js = ts.transpileModule(tsCode, {compilerOptions: {module: ts.ModuleKind.ESNext}}).outputText;
    const {normalizeLocale} = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

    assert.equal(normalizeLocale('vi'), 'vi');
    assert.equal(normalizeLocale('vn'), 'vi');
    assert.equal(normalizeLocale('nv'), 'vi');
    assert.equal(normalizeLocale('vi-VN'), 'vi');
    assert.equal(normalizeLocale('en'), 'en');
    assert.equal(normalizeLocale('en-US'), 'en');
    assert.equal(normalizeLocale('ja'), 'ja');
    assert.equal(normalizeLocale('jp'), 'ja');
    assert.equal(normalizeLocale('ja-JP'), 'ja');
    assert.equal(normalizeLocale('fr'), 'vi');
    assert.equal(normalizeLocale(null), 'vi');
    assert.equal(normalizeLocale(undefined), 'vi');
});
