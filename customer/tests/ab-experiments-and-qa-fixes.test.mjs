import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';

const customerRoot = path.resolve(import.meta.dirname, '..');
const repoRoot = path.resolve(customerRoot, '..');
const read = rel => fs.readFileSync(path.join(customerRoot, rel), 'utf8');

function compilePureTs(source) {
    const cleaned = source
        .replace(/^['"]use client['"];?\s*/m, '')
        .replace(/^import\s+.*from\s+['"]react['"];?\s*/m, '')
        .replace(/export function useAbExperiment[\s\S]*$/m, '');
    const out = ts.transpileModule(cleaned, {
        compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022},
    }).outputText;
    return `data:text/javascript;base64,${Buffer.from(out).toString('base64')}`;
}

const ab = await import(compilePureTs(read('src/lib/experiments/ab-experiments.ts')));

test('A/B engine provides deterministic 50/50 sticky bucketing and QA URL overrides', () => {
    assert.deepEqual(Object.keys(ab.AB_EXPERIMENTS).sort(), [
        'hero_trust_strip',
        'in_place_booking_auth',
        'localized_catalog_cards',
        'mobile_compact_filter_drawer',
    ]);

    // Deterministic for the same visitor + experiment
    const v1 = ab.assignVariant('in_place_booking_auth', 'visitor-abc-123');
    const v2 = ab.assignVariant('in_place_booking_auth', 'visitor-abc-123');
    assert.equal(v1, v2);
    assert.ok(v1 === 'control' || v1 === 'treatment');

    // Balanced 50/50 split across 1,000 synthetic visitors
    let treatmentCount = 0;
    for (let i = 0; i < 1000; i += 1) {
        if (ab.assignVariant('in_place_booking_auth', `user-${i}`) === 'treatment') {
            treatmentCount += 1;
        }
    }
    assert.ok(treatmentCount >= 430 && treatmentCount <= 570, `expected balanced ~50/50 split, got ${treatmentCount}/1000`);

    // Explicit URL overrides
    assert.equal(ab.readVariantOverride('?ab_in_place_booking_auth=treatment', 'in_place_booking_auth'), 'treatment');
    assert.equal(ab.readVariantOverride('?ab_in_place_booking_auth=A', 'in_place_booking_auth'), 'control');
    assert.equal(ab.readVariantOverride('?ab_all=B', 'mobile_compact_filter_drawer'), 'treatment');
    assert.equal(ab.readVariantOverride('?foo=bar', 'hero_trust_strip'), null);
    assert.equal(ab.assignVariant('hero_trust_strip', 'visitor-abc-123', 'treatment'), 'treatment');
    assert.equal(ab.assignVariant('hero_trust_strip', 'visitor-abc-123', 'control'), 'control');
});

test('P0-1: GoogleSignInButton across all 3 portals removes opacity-[0.01] occlusion hack', () => {
    for (const portal of ['customer', 'operations', 'admin']) {
        const src = fs.readFileSync(
            path.join(repoRoot, portal, 'src/components/auth/social/GoogleSignInButton.tsx'),
            'utf8',
        );
        assert.doesNotMatch(src, /opacity-\[0\.01\]/, `${portal}: must not overlay invisible iframe with opacity-[0.01]`);
        assert.match(src, /\{!ready && \(/, `${portal}: placeholder button must unmount when GIS button is ready`);
    }
});

test('P0-2 & P1: review count reconciliation, staff auth gate, logo alt, ESLint & Node 22 engines hold', () => {
    const detail = read('src/components/marketplace/catalog/PublicListingDetail.tsx');
    assert.match(detail, /providerRatingBadge/);
    assert.match(detail, /reviewsEmptyWithProviderRating/);
    assert.match(detail, /localizeOfficialListingTitle/);

    const card = read('src/components/marketplace/catalog/MarketplaceListingCard.tsx');
    assert.match(card, /localizeOfficialListingTitle/);
    assert.match(card, /encodeURIComponent\(item\.slug\)/);
    assert.match(card, /useAbExperiment\('localized_catalog_cards'\)/);

    const modal = read('src/components/auth/modal/AuthModalPopup.tsx');
    assert.match(modal, /bookingContext/);
    assert.match(modal, /staffGate/);
    assert.match(modal, /auth_completed_booking_start/);

    const chrome = read('src/components/auth/modal/AuthModalChrome.tsx');
    assert.match(chrome, /UAV PAS · CỔNG NỘI BỘ/);
    assert.match(chrome, /!staffGate && \(view === 'login'/);

    const header = read('src/components/marketing/PublicHeader.tsx');
    assert.match(header, /src="\/uav-pas-logo\.svg"\s+alt="UAV PAS"/);

    for (const portal of ['customer', 'admin']) {
        const overlay = fs.readFileSync(
            path.join(repoRoot, portal, 'src/components/shared/OfflineConnectionOverlay.tsx'),
            'utf8',
        );
        assert.match(overlay, /useState<SupportedLang>\(\(\) => readLang\(\)\)/, `${portal}: lazy init lang`);
    }

    for (const app of ['customer', 'operations', 'admin', 'mobile']) {
        const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, app, 'package.json'), 'utf8'));
        assert.equal(pkg.engines?.node, '>=22.0.0', `${app}/package.json must declare engines.node >=22.0.0`);
    }
});

test('EXP-1, EXP-2, EXP-3, and EXP-4 are wired cleanly with event tracking', () => {
    const calc = read('src/components/marketplace/catalog/ListingBookingCalculator.tsx');
    assert.match(calc, /useAbExperiment\('in_place_booking_auth'\)/);
    assert.match(calc, /openAuthModal\('login'/);
    assert.match(calc, /click_subscribe_cta/);

    const catalog = read('src/components/marketplace/catalog/PublicMarketplaceCatalog.tsx');
    assert.match(catalog, /useAbExperiment\('mobile_compact_filter_drawer'\)/);
    assert.match(catalog, /compactMobileDrawer=\{compactMobile\}/);

    const filterBar = read('src/components/marketplace/catalog/MarketplaceFilterBar.tsx');
    assert.match(filterBar, /marketplace-filter-drawer-panel/);
    assert.match(filterBar, /mobileFilterToggle/);
    assert.match(filterBar, /mobileFilterApply/);

    const hero = read('src/components/marketing/HomeHeroSection.tsx');
    assert.match(hero, /useAbExperiment\('hero_trust_strip'\)/);
    assert.match(hero, /heroTrustEscrow/);
    assert.match(hero, /hero_cta_click/);
});

test('RBAC & UI E2E regressions: Operations blocks ROLE_PILOT, Basic UAV Rental localized, Admin permission labels exist', () => {
    const opsPortal = fs.readFileSync(path.join(repoRoot, 'operations/src/utils/portal.ts'), 'utf8');
    const opsRolesLine = opsPortal.match(/operations:\s*\[[^\]]+\]/)?.[0] ?? '';
    assert.ok(opsRolesLine.length > 0, 'operations portalRoles line must exist');
    assert.doesNotMatch(opsRolesLine, /ROLE_PILOT/, 'ROLE_PILOT customer accounts must not access Operations portal');

    const card = read('src/components/marketplace/catalog/MarketplaceListingCard.tsx');
    assert.match(card, /'basic uav rental'/);

    const adminPres = fs.readFileSync(path.join(repoRoot, 'admin/src/lib/presentation.ts'), 'utf8');
    assert.match(adminPres, /MARKETPLACE_MODERATE:/);
    assert.match(adminPres, /PAYOUT_MANAGE:/);
});
