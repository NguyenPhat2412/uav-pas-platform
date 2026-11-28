import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';
import {
    formatTrackingLink,
    matchesOrderStatusGroup,
    ORDER_STATUS_GROUPS,
    resolveOrderStatusGroup,
} from '../src/utils/order-groups.ts';

const srcDir = new URL('../src/', import.meta.url).pathname;
const read = rel => readFileSync(`${srcDir}${rel}`, 'utf8');

test('S1 order-groups: maps backend Mission statuses and statusGroup to 5 Shopee customer tabs', () => {
    assert.deepEqual(ORDER_STATUS_GROUPS, [
        'PENDING',
        'SCHEDULED',
        'IN_FLIGHT',
        'DELIVERED',
        'TO_REVIEW',
    ]);

    assert.equal(resolveOrderStatusGroup({status: 'PENDING_DISPATCH'}), 'PENDING');
    assert.equal(resolveOrderStatusGroup({status: 'PENDING_PROVIDER'}), 'PENDING');
    assert.equal(resolveOrderStatusGroup({status: 'ACCEPTED'}), 'SCHEDULED');
    assert.equal(resolveOrderStatusGroup({status: 'READY'}), 'SCHEDULED');
    assert.equal(resolveOrderStatusGroup({status: 'IN_PROGRESS'}), 'IN_FLIGHT');
    assert.equal(resolveOrderStatusGroup({status: 'IN_FLIGHT'}), 'IN_FLIGHT');
    assert.equal(resolveOrderStatusGroup({status: 'DELIVERED', reviewed: false}), 'TO_REVIEW');
    assert.equal(resolveOrderStatusGroup({status: 'DELIVERED', reviewed: true}), 'DELIVERED');
    assert.equal(resolveOrderStatusGroup({status: 'REVIEWED', reviewed: true}), 'DELIVERED');

    assert.equal(matchesOrderStatusGroup({status: 'DELIVERED', reviewed: false}, 'TO_REVIEW'), true);
    assert.equal(matchesOrderStatusGroup({status: 'DELIVERED', reviewed: false}, 'DELIVERED'), true);
    assert.equal(matchesOrderStatusGroup({status: 'DELIVERED', reviewed: true}, 'TO_REVIEW'), false);
});

test('S1 formatTrackingLink: safely formats S0 OrderTrackingResponse.Link record, numbers, and strings', () => {
    assert.equal(
        formatTrackingLink({sent: 100, delivered: 98, lost: 2, lossPct: 2.2, averageLatencyMs: 18}),
        '98%',
    );
    assert.equal(formatTrackingLink(95.6), '96%');
    assert.equal(formatTrackingLink('4G LTE'), '4G LTE');
    assert.equal(formatTrackingLink(null), '—');
    assert.equal(formatTrackingLink(undefined), '—');
});

test('S1 overnight routes & Shopee marketplace screens are wired end-to-end', () => {
    const requiredRoutes = [
        'app/customer/projects/create.tsx',
        'app/customer/projects/[id]/index.tsx',
        'app/customer/projects/[id]/edit.tsx',
        'app/customer/marketplace/subscribe.tsx',
        'app/customer/orders/index.tsx',
        'app/customer/orders/[id]/tracking.tsx',
        'app/customer/provider/pilots.tsx',
    ];
    for (const rel of requiredRoutes) {
        assert.ok(existsSync(`${srcDir}${rel}`), `missing S1 route: ${rel}`);
    }

    const tabsLayout = read('app/customer/(tabs)/_layout.tsx');
    assert.match(tabsLayout, /mobile\.overnight\.navProjects/);

    const wizard = read('components/marketplace/catalog/ProjectSubscriptionWizardScreen.tsx');
    assert.match(wizard, /SubscriptionWizardStepper/);
    assert.match(wizard, /ProjectZoneMapField/);
    assert.match(wizard, /SubscriptionScheduleConfirmCard/);

    const tracking = read('components/order/OrderTrackingScreen.tsx');
    assert.match(tracking, /useOrderTracking/);
    assert.match(tracking, /formatTrackingLink/);

    const login = read('components/auth/LoginScreen.tsx');
    assert.match(login, /SocialSignInRow/);
    assert.match(login, /googlePrimaryHint/);
});

test('S1 offline cache, 320pt/xlarge responsive layout, and customer fleet anonymization guards', () => {
    const queryCache = read('lib/storage/query-cache.ts');
    assert.match(queryCache, /owner === 'public-listings'/);
    assert.match(queryCache, /owner === 'public-listing'/);

    const customerOrders = read('components/order/CustomerOrdersScreen.tsx');
    assert.match(customerOrders, /<OfflineBanner\s*\/>/);
    assert.match(customerOrders, /list\.isError && orders\.length === 0/);

    const homeHero = read('components/home/MarketplaceSearchHero.tsx');
    assert.match(homeHero, /onLayout=/);

    const providerHub = read('components/marketplace/provider/ProviderHubScreen.tsx');
    assert.doesNotMatch(providerHub, /\/customer\/providers\/\[slug\]/);

    const inspectionReport = read('components/mission/MobileMissionInspectionReportCard.tsx');
    assert.match(inspectionReport, /const isCustomer = portal === 'customer'/);
});

test('S1 VoiceOver a11y & ORDER_UPDATED realtime sync across Home, Projects, and Tracking', () => {
    // 1. Every <Pressable ...> in S1 screens & shared controls must carry an explicit accessibilityLabel
    const s1A11yFiles = [
        'components/home/HomeScreen.tsx',
        'components/home/MarketplaceSearchHero.tsx',
        'components/home/ServiceCategoryShowcase.tsx',
        'components/home/OrderStatusBarCard.tsx',
        'components/home/ProjectPackagePromoCard.tsx',
        'components/project/ProjectListScreen.tsx',
        'components/project/ProjectFormScreen.tsx',
        'components/project/ProjectDetailScreen.tsx',
        'components/project/ProjectZoneMapField.tsx',
        'components/marketplace/catalog/ListingStickyActionBar.tsx',
        'components/marketplace/catalog/MarketplaceListingDetailScreen.tsx',
        'components/marketplace/catalog/ProjectSubscriptionWizardScreen.tsx',
        'components/marketplace/catalog/SubscriptionScheduleConfirmCard.tsx',
        'components/order/CustomerOrdersScreen.tsx',
        'components/order/OrderTrackingScreen.tsx',
        'components/marketplace/provider/ProviderHubScreen.tsx',
        'components/marketplace/provider/ProviderPilotsScreen.tsx',
        'components/marketplace/provider/ProviderTemplateQuickCard.tsx',
        'components/marketplace/provider/ProviderOrderAssignBox.tsx',
        'components/marketplace/provider/ProviderWalletScreen.tsx',
        'components/mission/CustomerHandoverReviewCard.tsx',
        'components/mission/MobileMissionInspectionReportCard.tsx',
        'components/auth/LoginScreen.tsx',
        'components/layout/AppHeader.tsx',
        'components/ui/GlassSelect.tsx',
        'components/ui/index.tsx',
    ];

    function findOpeningPressableTags(source) {
        const tags = [];
        const needle = '<Pressable';
        let idx = source.indexOf(needle);
        while (idx !== -1) {
            const after = source[idx + needle.length];
            if (after && /[A-Za-z0-9_]/.test(after)) {
                idx = source.indexOf(needle, idx + needle.length);
                continue;
            }
            let pos = idx + needle.length;
            let braceDepth = 0;
            let inStr = null;
            while (pos < source.length) {
                const ch = source[pos];
                if (inStr) {
                    if (ch === '\\') pos += 1;
                    else if (ch === inStr) inStr = null;
                } else if (ch === '\'' || ch === '"' || ch === '`') {
                    inStr = ch;
                } else if (ch === '{') {
                    braceDepth += 1;
                } else if (ch === '}') {
                    braceDepth = Math.max(0, braceDepth - 1);
                } else if (ch === '>' && braceDepth === 0) {
                    tags.push(source.slice(idx, pos + 1));
                    break;
                }
                pos += 1;
            }
            idx = source.indexOf(needle, pos + 1);
        }
        return tags;
    }

    for (const rel of s1A11yFiles) {
        const content = read(rel);
        for (const tag of findOpeningPressableTags(content)) {
            assert.match(tag, /\baccessibilityLabel=/, `${rel} has <Pressable> without accessibilityLabel: ${tag}`);
            assert.match(tag, /\baccessibilityRole=/, `${rel} has <Pressable> without accessibilityRole: ${tag}`);
        }
    }

    // 2. ORDER_UPDATED realtime sync is wired across CustomerLayout, Home, Projects, Missions, and Flight Tracking
    const customerLayout = read('app/customer/_layout.tsx');
    assert.match(customerLayout, /useOrderRealtimeSync\(\{notifyToast:\s*true\}\)/);

    const ordersHook = read('hooks/useOrders.ts');
    assert.match(ordersHook, /realtimeWs\.syncAccessToken/);
    assert.match(ordersHook, /frame\.type !== 'ORDER_UPDATED'/);
    assert.match(ordersHook, /projectKeys\.all\(userId\)/);
    assert.match(ordersHook, /projectKeys\.orderTracking\(userId,\s*resolvedId\)/);
    assert.match(ordersHook, /describeOrderRealtimeToast/);

    const projectsHook = read('hooks/useProjects.ts');
    assert.match(projectsHook, /useOrderRealtimeSync\(\)/);

    const missionsHook = read('hooks/useCustomerMissions.ts');
    assert.match(missionsHook, /useOrderRealtimeSync/);
});

test('UI-REVIEW-9-FIXES S1: clean entity names, USGS-free cover fallback, NativeTabs automatic inset, flight path tracking, RFQ hidden, shared categories & 409 conflicts', async () => {
    const {cleanEntityName, cleanDescriptionText, formatProviderConflictError} = await import('../src/utils/clean-text.ts');
    const {computeFitRegion, toLatLngList} = await import('../src/utils/tracking-geometry.ts');
    const {SERVICE_CATEGORIES, WEB_SERVICE_CATEGORIES} = await import('../src/shared/lib/marketplace/service-categories.ts');

    // #1: Never attach "— minh hoạ" / "(minh hoạ)" to service, UAV, pilot, fleet, or project names
    assert.equal(cleanEntityName('Khảo sát bản đồ 2D/3D định kỳ — minh hoạ'), 'Khảo sát bản đồ 2D/3D định kỳ');
    assert.equal(cleanEntityName('Đội bay Miền Bắc (minh hoạ)'), 'Đội bay Miền Bắc');
    assert.equal(cleanEntityName('DJI Mavic 3 RTK — giá minh hoạ'), 'DJI Mavic 3 GNSS');
    assert.equal(cleanDescriptionText('Gói chụp ảnh nhiệt pin mặt trời — giá minh hoạ.'), 'Gói chụp ảnh nhiệt pin mặt trời.');

    // #2: Cover resolver never falls back to shared photos when null and blocks USGS logo assets
    const coverSrc = read('components/marketplace/catalog/listing-cover.ts');
    assert.match(coverSrc, /if \(!raw \|\| BLOCKED_LOGO_COVER_RE\.test\(raw\)\)/);
    assert.match(coverSrc, /usgs\|plum-island\|yosemite\|data-collection-corridor/);
    assert.equal(existsSync(new URL('../assets/services/data-collection-corridor.webp', import.meta.url).pathname), false);

    // #3: NativeTabs / ScrollView automatic bottom clearance (no magic 120/128 numbers)
    const uiSrc = read('components/ui/index.tsx');
    assert.match(uiSrc, /contentInsetAdjustmentBehavior=\{isTabRoot \? 'automatic' : 'never'\}/);
    assert.doesNotMatch(uiSrc, /isTabRoot \? 128/);
    const tabStackSrc = read('components/layout/TabStack.tsx');
    assert.match(tabStackSrc, /bottom:\s*'automatic'/);

    // #4: OrderTrackingScreen draws waypoints (dashed) + track (solid), rotates UAV marker, fits bounds, and handles flight complete
    const trackingPts = toLatLngList([[21.0285, 105.8542], [21.0301, 105.8562]]);
    assert.equal(trackingPts.length, 2);
    const region = computeFitRegion(trackingPts, 21.0285, 105.8542);
    assert.ok(region.latitudeDelta >= 0.0022 && region.latitudeDelta < 0.01);
    const trackingScreen = read('components/order/OrderTrackingScreen.tsx');
    assert.match(trackingScreen, /lineDashPattern=\{\[6,\s*5\]\}/);
    assert.match(trackingScreen, /headingDeg/);
    assert.match(trackingScreen, /fitToCoordinates/);
    assert.match(trackingScreen, /flightDoneAwaitingHandover/);

    // #5: RFQ UI entry points hidden while API client functions stay intact
    const providerOrders = read('components/marketplace/provider/ProviderOrdersScreen.tsx');
    assert.doesNotMatch(providerOrders, /tabOpenRfq/);
    assert.doesNotMatch(providerOrders, /ProviderRfqBidForm/);
    const detailScreen = read('components/marketplace/catalog/MarketplaceListingDetailScreen.tsx');
    assert.doesNotMatch(detailScreen, /needCustomQuote/);
    const apiSrc = read('api/marketplace.api.ts');
    assert.match(apiSrc, /listOpenRfqs:/);

    // #8: Shared service categories synced from customer/src/lib/marketplace/service-categories.ts
    assert.equal(SERVICE_CATEGORIES.length, 6);
    assert.equal(WEB_SERVICE_CATEGORIES.length, 7);
    const showcaseSrc = read('components/home/ServiceCategoryShowcase.tsx');
    assert.match(showcaseSrc, /@\/shared\/lib\/marketplace\/service-categories/);
    const servicesSrc = read('components/catalog/ServicesScreen.tsx');
    assert.match(servicesSrc, /WEB_SERVICE_CATEGORIES/);

    // S0 409 conflict codes mapped cleanly
    const mockT = key => key;
    assert.equal(formatProviderConflictError({status: 409, code: 'UAV_TIME_CONFLICT'}, mockT), 'mobile.overnight.conflictUavTime');
    assert.equal(formatProviderConflictError({status: 409, code: 'OPERATOR_TIME_CONFLICT'}, mockT), 'mobile.overnight.conflictOperatorTime');
    assert.equal(formatProviderConflictError({status: 409, code: 'UAV_IN_USE'}, mockT), 'mobile.overnight.conflictUavInUse');
    assert.equal(formatProviderConflictError({status: 409, code: 'NO_UAV_AVAILABLE'}, mockT), 'mobile.overnight.conflictNoUavAvailable');
});
