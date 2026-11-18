import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (rel) => readFileSync(`${root}${rel}`, 'utf8');

function compileTsToDataUrl(source) {
    const compiled = ts.transpile(source, {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
    });
    return `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`;
}

const flightPlanUrl = compileTsToDataUrl(read('src/types/mission/flight-plan.types.ts'));
const projectFormUrl = compileTsToDataUrl(
    read('src/forms/project/project-form.ts').replace(
        '@/types/mission/flight-plan.types',
        flightPlanUrl,
    ),
);
const marketplaceFormsUrl = compileTsToDataUrl(read('src/forms/marketplace/marketplace-forms.ts'));

const pf = await import(projectFormUrl);
const mf = await import(marketplaceFormsUrl);

function flattenKeys(obj, prefix = '', out = new Map()) {
    for (const [k, v] of Object.entries(obj ?? {})) {
        const next = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            flattenKeys(v, next, out);
        } else {
            out.set(next, v);
        }
    }
    return out;
}

test('resolveListingBadge extracts verified status and rating without exposing fleet identity', () => {
    const verified = pf.resolveListingBadge({
        providerBadge: {verified: true, ratingAvg: 4.86, reviewCount: 32},
        providerVerificationStatus: 'VERIFIED',
        officialPlatformListing: false,
        ratingAvg: 4.86,
        reviewCount: 32,
        providerDisplayName: 'Hidden Fleet LLC',
    });
    assert.equal(verified.verified, true);
    assert.equal(verified.ratingAvg, 4.86);
    assert.equal(verified.reviewCount, 32);
    assert.equal('providerDisplayName' in verified, false);

    const fallbackVerified = pf.resolveListingBadge({
        providerBadge: null,
        providerVerificationStatus: 'VERIFIED',
        officialPlatformListing: false,
        ratingAvg: 4.7,
        reviewCount: 14,
    });
    assert.equal(fallbackVerified.verified, true);
    assert.equal(fallbackVerified.ratingAvg, 4.7);
    assert.equal(fallbackVerified.reviewCount, 14);

    const unrated = pf.resolveListingBadge({
        providerBadge: null,
        providerVerificationStatus: 'PENDING_REVIEW',
        officialPlatformListing: false,
        ratingAvg: null,
        reviewCount: 0,
    });
    assert.equal(unrated.verified, false);
    assert.equal(unrated.ratingAvg, 0);
    assert.equal(unrated.reviewCount, 0);
});

test('5 Shopee order status groups, summary counts, and pre-flight cancellation guard work accurately', () => {
    assert.deepEqual(pf.ORDER_STATUS_GROUPS, [
        'PENDING',
        'SCHEDULED',
        'IN_FLIGHT',
        'DELIVERED',
        'TO_REVIEW',
    ]);

    assert.equal(pf.mapMissionToOrderStatusGroup({status: 'PENDING_CONFIRMATION'}), 'PENDING');
    assert.equal(pf.mapMissionToOrderStatusGroup({status: 'PENDING_PROVIDER'}), 'PENDING');
    assert.equal(pf.mapMissionToOrderStatusGroup({status: 'CONFIRMED'}), 'SCHEDULED');
    assert.equal(pf.mapMissionToOrderStatusGroup({status: 'SCHEDULED'}), 'SCHEDULED');
    assert.equal(pf.mapMissionToOrderStatusGroup({status: 'IN_PROGRESS'}), 'IN_FLIGHT');
    assert.equal(pf.mapMissionToOrderStatusGroup({status: 'IN_FLIGHT'}), 'IN_FLIGHT');
    assert.equal(pf.mapMissionToOrderStatusGroup({status: 'DELIVERED', reviewed: false}), 'TO_REVIEW');
    assert.equal(pf.mapMissionToOrderStatusGroup({status: 'COMPLETED', reviewed: true}), 'DELIVERED');
    assert.equal(pf.mapMissionToOrderStatusGroup({status: 'REVIEWED'}), 'DELIVERED');
    assert.equal(pf.mapMissionToOrderStatusGroup({status: 'CANCELLED'}), null);

    assert.equal(pf.canCancelCustomerOrder('PENDING_CONFIRMATION'), true);
    assert.equal(pf.canCancelCustomerOrder('SCHEDULED'), true);
    assert.equal(pf.canCancelCustomerOrder('READY'), true);
    assert.equal(pf.canCancelCustomerOrder('IN_FLIGHT'), false);
    assert.equal(pf.canCancelCustomerOrder('IN_PROGRESS'), false);
    assert.equal(pf.canCancelCustomerOrder('DELIVERED'), false);
    assert.equal(pf.canCancelCustomerOrder('CANCELLED'), false);

    const summary = pf.summarizeOrdersFromMissions([
        {status: 'PENDING_CONFIRMATION'},
        {status: 'SCHEDULED'},
        {status: 'READY'},
        {status: 'IN_PROGRESS'},
        {status: 'DELIVERED', reviewed: false},
        {status: 'REVIEWED'},
    ]);
    assert.deepEqual(summary, {
        pending: 1,
        scheduled: 2,
        inFlight: 1,
        delivered: 1,
        toReview: 1,
    });
});

test('GeoJSON polygon conversion round-trips flight plans and validates project/subscription inputs', () => {
    const vertices = [
        [10.728, 106.701],
        [10.728, 106.712],
        [10.736, 106.712],
        [10.736, 106.701],
    ];
    const geoJson = pf.verticesToGeoJsonPolygon(vertices);
    assert.ok(geoJson);
    const parsed = JSON.parse(geoJson);
    assert.equal(parsed.type, 'Polygon');
    assert.equal(parsed.coordinates[0].length, 5);

    const roundTrip = pf.geoJsonPolygonToVertices(geoJson);
    assert.equal(roundTrip.length, 4);
    assert.ok(Math.abs(roundTrip[0][0] - 10.728) < 1e-5);
    assert.ok(Math.abs(roundTrip[0][1] - 106.701) < 1e-5);

    const circleGeo = pf.circleToGeoJsonPolygon(21.0285, 105.8542, 250);
    assert.ok(circleGeo);
    const planFromGeo = pf.geoJsonToFlightPlan(circleGeo);
    assert.equal(planFromGeo.areaType, 'POLYGON');
    assert.ok(planFromGeo.vertices.length >= 3);

    assert.equal(pf.validateProjectInput({name: 'A', province: 'Hà Nội'}), 'project_name_required');
    assert.equal(pf.validateProjectInput({name: 'Dự án khu công nghiệp', province: ''}), 'project_province_required');
    assert.equal(pf.validateProjectInput({name: 'Dự án khu công nghiệp', province: 'Bắc Ninh'}), null);

    assert.equal(
        pf.validateSubscriptionBooking({
            listingId: 1,
            areaGeoJson: '',
            scheduleType: 'ONCE',
            startDate: '2026-12-01',
            units: 2,
        }),
        'area_required',
    );
    assert.equal(
        pf.validateSubscriptionBooking({
            listingId: 1,
            areaGeoJson: geoJson,
            scheduleType: 'WEEKLY',
            startDate: '2026-12-01',
            units: 2,
        }),
        null,
    );

    assert.equal(mf.estimateBookingSubtotal(1_500_000, 1, 3), 4_500_000);
});

test('customerPro marketplaceShop and customer nav catalogs maintain 100% vi/en/ja parity', () => {
    for (const dir of ['src/messages/sections/customerPro', 'src/messages/customer']) {
        const vi = flattenKeys(JSON.parse(read(`${dir}/vi.json`)));
        const en = flattenKeys(JSON.parse(read(`${dir}/en.json`)));
        const ja = flattenKeys(JSON.parse(read(`${dir}/ja.json`)));

        assert.deepEqual([...en.keys()].sort(), [...vi.keys()].sort(), `${dir}: en keys must match vi`);
        assert.deepEqual([...ja.keys()].sort(), [...vi.keys()].sort(), `${dir}: ja keys must match vi`);
        for (const [key, val] of [...vi.entries(), ...en.entries(), ...ja.entries()]) {
            assert.equal(typeof val, 'string', `${dir}:${key} must be string`);
            assert.ok(val.trim().length > 0, `${dir}:${key} must be non-empty`);
        }
    }
});

test('customer-facing marketplace and portal screens hide fleet names, stay <= 300 lines, and wire PageSkeleton', () => {
    const customerFacingFiles = [
        'src/components/marketplace/catalog/MarketplaceListingCard.tsx',
        'src/components/marketplace/catalog/PublicListingDetail.tsx',
        'src/components/marketplace/catalog/ListingBookingCalculator.tsx',
        'src/components/marketplace/booking/CustomerServiceDetailView.tsx',
        'src/components/marketplace/booking/ProjectSubscriptionWizardDialog.tsx',
        'src/components/marketplace/booking/ProjectSubscriptionStepPanels.tsx',
        'src/components/marketplace/shop/CustomerShopCatalogView.tsx',
        'src/components/marketplace/escrow/CustomerMissionMarketplaceCard.tsx',
        'src/components/marketplace/escrow/CustomerMissionRfqBids.tsx',
        'src/components/mission/customer/MissionMarketplaceBanner.tsx',
    ];
    for (const file of customerFacingFiles) {
        const content = read(file);
        assert.doesNotMatch(content, /providerDisplayName/, `${file} must not render providerDisplayName`);
        assert.doesNotMatch(content, /providerSlug/, `${file} must not expose providerSlug`);
        assert.doesNotMatch(content, /href=.*\/providers\//, `${file} must not link to /providers/ storefront`);
    }

    const s2NewOrUpdatedComponents = [
        'src/components/marketplace/shop/CustomerShopHeroBanner.tsx',
        'src/components/marketplace/shop/CustomerShopCategoryStrip.tsx',
        'src/components/marketplace/shop/CustomerShopCatalogView.tsx',
        'src/components/marketplace/booking/CustomerServiceDetailView.tsx',
        'src/components/marketplace/booking/ProjectSubscriptionWizardDialog.tsx',
        'src/components/marketplace/booking/ProjectSubscriptionStepPanels.tsx',
        'src/components/project/CustomerProjectsView.tsx',
        'src/components/project/ProjectSubscriptionsSection.tsx',
        'src/components/project/ProjectUpsertDialog.tsx',
        'src/components/mission/customer/OrderStatusBar.tsx',
        'src/components/mission/customer/OrderDeliveryTrackingCard.tsx',
        'src/components/mission/customer/CustomerMissionsList.tsx',
        'src/components/mission/customer/CustomerMissionDetail.tsx',
        'src/components/dashboard/CustomerShopeeHome.tsx',
        'src/components/profile/ProfileQuickGrid.tsx',
    ];
    for (const file of s2NewOrUpdatedComponents) {
        const lineCount = read(file).split('\n').length;
        assert.ok(lineCount <= 300, `${file} has ${lineCount} lines (must be <= 300)`);
    }

    const sidebar = read('src/config/sidebar-routes.ts');
    assert.match(sidebar, /href:\s*'\/customer\/projects'/);
    assert.match(sidebar, /aliases:\s*\['\/customer\/orders'\]/);
    assert.doesNotMatch(sidebar, /\/customer\/provider\/onboarding/);

    const publicHeader = read('src/components/marketing/PublicHeader.tsx');
    assert.match(publicHeader, /whitespace-nowrap/);
    assert.match(publicHeader, /moreMenu/);
    assert.match(publicHeader, /hidden whitespace-nowrap.*2xl:block/);

    for (const skeletonScreen of [
        'src/components/customer/CustomerLayout.tsx',
        'src/components/mission/customer/CustomerMissionDetail.tsx',
        'src/components/billing/CustomerBillingPanel.tsx',
        'src/components/notification/inbox/CustomerNotificationsPanel.tsx',
        'src/components/profile/Profile.tsx',
    ]) {
        assert.match(read(skeletonScreen), /PageSkeleton/, `${skeletonScreen} must use PageSkeleton`);
    }
});
