import assert from 'node:assert/strict';
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const atRoot = (path) => `${root}${path}`;
const read = (path) => readFileSync(atRoot(path), 'utf8');

test('M5 public route map exists and excludes private portal pages from sitemap', () => {
    const routes = ['page.tsx', 'about/page.tsx', 'services/page.tsx', 'services/[slug]/page.tsx', 'solutions/page.tsx', 'solutions/[slug]/page.tsx', 'how-it-works/page.tsx', 'pricing/page.tsx', 'contact/page.tsx', 'faq/page.tsx', 'privacy/page.tsx', 'terms/page.tsx', 'sitemap.ts', 'robots.ts'];
    for (const route of routes) assert.equal(existsSync(atRoot(route.endsWith('page.tsx') ? `src/app/(public)/${route}` : `src/app/${route}`)), true, `missing ${route}`);
    const sitemap = read('src/app/sitemap.ts');
    assert.doesNotMatch(sitemap, /customer|operations|admin|\/login|\/register/);
});

test('public app uses the customer path without token forwarding', () => {
    assert.match(read('src/content/marketing/origins.ts'), /customerUrl = ['"]\/customer['"]/);
    const source = readdirSync(atRoot('src/components/marketing')).map((name) => read(`src/components/marketing/${name}`)).join('\n');
    assert.match(source, /NEXT_PUBLIC_CUSTOMER_URL|customerUrl/);
    assert.doesNotMatch(source, /token=|access_token|returnTo=/i);
});

test('redesigned homepage composes 6 compact blocks with search, shared categories, live API listings, and JSON-LD', () => {
    const content = read('src/content/marketing/site-content.ts');
    assert.match(content, /Phát hiện có AI hỗ trợ/);
    assert.match(content, /PLANNED/);
    assert.doesNotMatch(content, /price:\s*['"]?\d|testimonial|partner|fleet/i);

    const home = read('src/components/marketing/HomeLanding.tsx');
    assert.match(home, /HomeHeroSection/);
    assert.match(home, /HomeCategoryGridSection/);
    assert.match(home, /HomeFeaturedServicesSection/);
    assert.match(home, /HomeHowItWorksSection/);
    assert.match(home, /HomeSimulationHighlightSection/);
    assert.match(home, /HomePartnerCtaSection/);
    assert.doesNotMatch(home, /HomeLandingCapabilitiesSection|HomeDroneAnatomy|HomeHistoryTimeline/);

    const hero = read('src/components/marketing/HomeHeroSection.tsx');
    assert.match(hero, /\/services\?q=/, 'hero search bar submits to /services?q=');
    assert.match(hero, /provider\/onboarding/, 'hero includes partner registration CTA');

    const categories = read('src/components/marketing/HomeCategoryGridSection.tsx');
    assert.match(categories, /SERVICE_CATEGORIES/, 'homepage category grid reads shared service categories');

    const featured = read('src/components/marketing/HomeFeaturedServicesSection.tsx');
    assert.match(featured, /usePublicListings/, 'homepage featured services fetch live data from public listings API');
    assert.match(featured, /MarketplaceListingCard/, 'homepage reuses MarketplaceListingCard');

    const layout = read('src/app/(public)/layout.tsx');
    assert.match(layout, /application\/ld\+json/);
    assert.doesNotMatch(layout, /ScrollEngagementPopup/, 'ScrollEngagementPopup removed from public layout');
});
