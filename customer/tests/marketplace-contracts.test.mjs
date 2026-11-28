import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';

const ts = createRequire(new URL('../package.json', import.meta.url))('typescript');

const formsSource = await readFile(new URL('../src/forms/marketplace-forms.ts', import.meta.url), 'utf8');
const formsJs = ts.transpileModule(formsSource, {
    compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022},
}).outputText;
const forms = await import('data:text/javascript;base64,' + Buffer.from(formsJs).toString('base64'));

test('escrowStatusLabel maps all marketplace escrow lifecycle states in Vietnamese', () => {
    assert.match(forms.escrowStatusLabel('UNFUNDED'), /VietQR/i);
    assert.match(forms.escrowStatusLabel('HELD'), /giữ Ký quỹ/i);
    assert.match(forms.escrowStatusLabel('DISPUTED'), /khóa Ký quỹ/i);
    assert.match(forms.escrowStatusLabel('RELEASED'), /giải ngân/i);
    assert.match(forms.escrowStatusLabel('REFUNDED'), /Hoàn Ký quỹ/i);
    assert.match(forms.escrowStatusLabel(null), /Chưa phát hành/i);
});

test('extractActionableError surfaces structured server field errors before generic fallback', () => {
    assert.equal(
        forms.extractActionableError(
            {message: 'Invalid', details: {amountVnd: 'Tối thiểu 100.000 ₫', bankName: 'Thiếu ngân hàng'}},
            'Fallback',
        ),
        'Tối thiểu 100.000 ₫ · Thiếu ngân hàng',
    );
    assert.equal(forms.extractActionableError(new Error('Chưa xác minh KYC'), 'Fallback'), 'Chưa xác minh KYC');
    assert.equal(forms.extractActionableError({}, 'Lỗi mặc định'), 'Lỗi mặc định');
});

test('marketplace form initializers honor dynamic defaultServiceRadiusKm without hardcoding 100', () => {
    const onboarding = forms.initialOnboardingForm(null, 250);
    assert.equal(onboarding.serviceRadiusKm, 250);

    const existing = forms.initialOnboardingForm({displayName: 'Sky', province: 'Đà Nẵng', serviceRadiusKm: 80}, 250);
    assert.equal(existing.serviceRadiusKm, 80);

    const listing = forms.initialListingForm('Hải Phòng', 180);
    assert.equal(listing.province, 'Hải Phòng');
    assert.equal(listing.serviceRadiusKm, 180);
    assert.equal(forms.estimateBookingSubtotal(1_500_000, 0.2, 2), 3_000_000);
});

test('useSiteInfo, CustomerMissionMarketplaceCard, and trilingual adminPlatform catalogs stay wired', async () => {
    const siteInfoSrc = await readFile(new URL('../src/hooks/useSiteInfo.ts', import.meta.url), 'utf8');
    for (const key of [
        'marketplace.platform_fee_rate',
        'marketplace.min_payout_vnd',
        'marketplace.max_payout_vnd',
        'marketplace.default_service_radius_km',
        'marketplace.rfq_enabled',
        'marketplace.require_escrow_before_start',
        'billing.invoice_due_days',
    ]) {
        assert.ok(siteInfoSrc.includes(key), `useSiteInfo must parse dynamic setting ${key}`);
    }

    const cardSrc = await readFile(
        new URL('../src/components/marketplace/escrow/CustomerMissionMarketplaceCard.tsx', import.meta.url),
        'utf8',
    );
    assert.ok(cardSrc.includes('BankTransferDialog'), 'Mission marketplace card must embed 1-click VietQR dialog');

    for (const locale of ['vi', 'en', 'ja']) {
        const catalog = JSON.parse(
            await readFile(new URL(`../src/messages/sections/adminPlatform/${locale}.json`, import.meta.url), 'utf8'),
        );
        assert.ok(catalog.adminPlatform.settings.groups.MARKETPLACE, `${locale}: MARKETPLACE group label`);
        for (const flat of [
            'billing_invoice_due_days',
            'marketplace_platform_fee_rate',
            'marketplace_min_payout_vnd',
            'marketplace_max_payout_vnd',
            'marketplace_default_service_radius_km',
            'marketplace_rfq_enabled',
            'marketplace_require_escrow_before_start',
        ]) {
            assert.ok(catalog.adminPlatform.settings.labels[flat], `${locale}: missing label ${flat}`);
        }
    }
});
