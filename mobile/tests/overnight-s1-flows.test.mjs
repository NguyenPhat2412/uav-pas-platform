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

    const ordersHook = read('hooks/order/useOrders.ts');
    assert.match(ordersHook, /realtimeWs\.syncAccessToken/);
    assert.match(ordersHook, /frame\.type !== 'ORDER_UPDATED'/);
    assert.match(ordersHook, /projectKeys\.all\(userId\)/);
    assert.match(ordersHook, /projectKeys\.orderTracking\(userId,\s*resolvedId\)/);
    assert.match(ordersHook, /describeOrderRealtimeToast/);

    const projectsHook = read('hooks/project/useProjects.ts');
    assert.match(projectsHook, /useOrderRealtimeSync\(\)/);

    const missionsHook = read('hooks/mission/useCustomerMissions.ts');
    assert.match(missionsHook, /useOrderRealtimeSync/);
});
