import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';
import {
    formatTrackingLink,
    matchesOrderStatusGroup,
    ORDER_STATUS_GROUPS,
    resolveOrderStatusGroup,
} from '../src/utils/mission/order-groups.ts';

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
