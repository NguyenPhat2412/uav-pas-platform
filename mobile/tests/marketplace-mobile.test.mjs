import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync, existsSync} from 'node:fs';
import {parseSiteInfo} from '../src/utils/site-info-parser.ts';

const src = new URL('../src/', import.meta.url).pathname;
const read = rel => readFileSync(`${src}${rel}`, 'utf8');

test('mobile marketplace: shared routes and forms include marketplace + admin moderation endpoints', () => {
    const routes = read('shared/lib/api/routes.ts');
    assert.match(routes, /marketplace:\s*\{/);
    assert.match(routes, /adminMarketplace:\s*\{/);
    assert.match(routes, /moderateProvider:/);
    assert.match(routes, /processPayout:/);
});

test('mobile marketplace: Liquid Glass select option primitive powers booking, catalog, studio, and admin quick flows', () => {
    const glassSelect = read('components/ui/GlassSelect.tsx');
    assert.match(glassSelect, /export function GlassSelectCards/);
    assert.match(glassSelect, /export function GlassSelectField/);
    assert.match(glassSelect, /GlassSurface/);

    const bookingOptions = read('components/mission/MissionBookingOptionsCard.tsx');
    assert.match(bookingOptions, /GlassSelectCards<BookingMode>/);
    assert.match(bookingOptions, /GlassSelectCards<MissionType>/);
    assert.match(bookingOptions, /GlassSelectField/);

    const missionForm = read('components/mission/MissionFormScreen.tsx');
    assert.match(missionForm, /MissionBookingOptionsCard/);
    assert.match(missionForm, /GlassSelectField<MissionPriority>/);

    const servicesScreen = read('components/catalog/ServicesScreen.tsx');
    assert.match(servicesScreen, /GlassSelectField<LeaseFilter>/);
    assert.match(servicesScreen, /GlassSelectField<ListingSortOption>/);
});

test('mobile marketplace: dynamic site-info parser and all Seller Studio + Escrow routes exist', () => {
    const parser = read('utils/site-info-parser.ts');
    assert.match(parser, /marketplace\.platform_fee_rate/);
    assert.match(parser, /marketplace\.min_payout_vnd/);
    assert.match(parser, /marketplace\.rfq_enabled/);
    assert.match(parser, /billing\.invoice_due_days/);

    const expectedRoutes = [
        'app/customer/marketplace/[slug].tsx',
        'app/customer/providers/[slug].tsx',
        'app/customer/provider/index.tsx',
        'app/customer/provider/onboarding.tsx',
        'app/customer/provider/listings.tsx',
        'app/customer/provider/fleet.tsx',
        'app/customer/provider/orders.tsx',
        'app/customer/provider/wallet.tsx',
    ];
    for (const route of expectedRoutes) {
        assert.ok(existsSync(`${src}${route}`), `expected route ${route} to exist`);
    }

    const defaults = parseSiteInfo(null);
    assert.equal(defaults.platformFeeRate, 0.1);
    assert.equal(defaults.minPayoutVnd, 100_000);
    assert.equal(defaults.defaultServiceRadiusKm, 100);
    assert.equal(defaults.rfqEnabled, false);
    assert.equal(defaults.invoiceDueDays, 7);
    const parsed = parseSiteInfo({
        settings: {
            'marketplace.platform_fee_rate': '0.12',
            'marketplace.min_payout_vnd': '1000000',
            'marketplace.max_payout_vnd': '250000000',
            'marketplace.default_service_radius_km': '120',
            'marketplace.rfq_enabled': 'false',
            'marketplace.require_escrow_before_start': 'true',
            'billing.invoice_due_days': '5',
        },
    });
    assert.equal(parsed.platformFeeRate, 0.12);
    assert.equal(parsed.minPayoutVnd, 1_000_000);
    assert.equal(parsed.maxPayoutVnd, 250_000_000);
    assert.equal(parsed.defaultServiceRadiusKm, 120);
    assert.equal(parsed.rfqEnabled, false);
    assert.equal(parsed.requireEscrowBeforeStart, true);
    assert.equal(parsed.invoiceDueDays, 5);
});

test('mobile ios-design-review: HIG touch targets, NativeTabs clearance, Vietnamese glyph safety, and Bento glass layout', () => {
    const uiIndex = read('components/ui/index.tsx');
    assert.match(uiIndex, /const isTabRoot =/);
    assert.match(uiIndex, /contentInsetAdjustmentBehavior=\{isTabRoot \? 'automatic' : 'never'\}/);
    assert.doesNotMatch(uiIndex, /isTabRoot \? 128/);
    assert.doesNotMatch(uiIndex, /badgeText:\s*\{[^}]*flexShrink:\s*1/);

    const launcher = read('components/assistant/AssistantLauncher.tsx');
    assert.match(launcher, /TAB_ROOTS/);
    assert.doesNotMatch(launcher, /'\/customer\/services'/);

    const services = read('components/catalog/ServicesScreen.tsx');
    assert.match(services, /AssistantMascot/);

    const glassSelect = read('components/ui/GlassSelect.tsx');
    assert.match(glassSelect, /isBento = columns === 2/);
    assert.match(glassSelect, /triggerMetaRow/);
    assert.match(glassSelect, /hitSlop=\{8\}/);

    const missionList = read('components/mission/MissionListScreen.tsx');
    assert.match(missionList, /HeaderIconButton/);
    assert.match(missionList, /insets\.bottom \+ spacing\.xl/);

    const providerListings = read('components/marketplace/provider/ProviderListingsScreen.tsx');
    assert.match(providerListings, /showCreate \? X : Plus/);
    assert.match(providerListings, /provider\.noListings/);

    const providerWallet = read('components/marketplace/provider/ProviderWalletScreen.tsx');
    assert.match(providerWallet, /disabled=\{available < minPayoutVnd\}/);
});

test('cross-platform Web ↔ Mobile sync: WebSocket invalidates live state and 409 conflicts self-heal via onSettled', () => {
    const notifications = read('hooks/useNotifications.ts');
    assert.match(notifications, /NOTIFICATION_CREATED/);
    assert.match(notifications, /q\.queryKey\[0\] === 'marketplace'/);
    assert.match(notifications, /q\.queryKey\[0\] === 'public'/);

    const billing = read('hooks/useCustomerBilling.ts');
    assert.match(billing, /escrowStatus[\s\S]*?'HELD'/);
    assert.match(billing, /queryKeys\.feature\(userId, 'marketplace'\)/);
    assert.match(billing, /queryKeys\.feature\(userId, 'customer'\)/);

    const providerStudio = read('hooks/useProviderStudio.ts');
    assert.match(providerStudio, /onSettled:\s*refresh/);
    assert.doesNotMatch(providerStudio, /onSuccess:\s*refresh/);

    const catalogHooks = read('hooks/useMarketplaceCatalog.ts');
    assert.match(catalogHooks, /onSettled:/);

    const missionHooks = read('hooks/useCustomerMissions.ts');
    assert.match(missionHooks, /cancel:\s*useMutation\(\{[^}]*onSettled:/);
    assert.match(missionHooks, /upsertReview:\s*useMutation\(\{[\s\S]*?onSettled:/);
});

test('mobile 60-30-10 Shopee-style two-sided marketplace: Guest browse, zero floating bubbles, sticky checkout & 3-step wizard', () => {
    const tokens = read('styles/tokens.ts');
    assert.match(tokens, /customerCanvas:\s*'#f8fafc'/);
    assert.match(tokens, /slate900:\s*'#0f172a'/);
    assert.match(tokens, /primary:\s*'#ab2523'/);

    const rootEntry = read('app/index.tsx');
    assert.match(rootEntry, /'\/customer\/home'/);

    const customerLayout = read('app/customer/_layout.tsx');
    assert.doesNotMatch(customerLayout, /<AssistantLauncher\/>/);
    assert.doesNotMatch(customerLayout, /<PulsingSupportLauncher/);
    assert.match(customerLayout, /PRIVATE_CUSTOMER_ROUTE/);

    const homeScreen = read('components/home/HomeScreen.tsx');
    assert.match(homeScreen, /MarketplaceSearchHero/);
    assert.match(homeScreen, /ServiceCategoryShowcase/);
    assert.match(homeScreen, /OrderStatusBarCard/);
    assert.match(homeScreen, /ProjectPackagePromoCard/);
    assert.match(homeScreen, /MarketplaceListingGrid/);

    const detailScreen = read('components/marketplace/catalog/MarketplaceListingDetailScreen.tsx');
    assert.match(detailScreen, /ListingStickyActionBar/);

    const missionForm = read('components/mission/MissionFormScreen.tsx');
    assert.match(missionForm, /MissionCheckoutStepper/);
    assert.match(missionForm, /MissionCheckoutSummaryCard/);

    const accountScreen = read('components/profile/AccountScreen.tsx');
    assert.match(accountScreen, /sellerCenterCard/);
    assert.match(accountScreen, /GuestPromptCard/);
});
