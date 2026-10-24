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
    assert.match(read('src/features/marketing/content/origins.ts'), /customerUrl = ['"]\/customer['"]/);
    const source = readdirSync(atRoot('src/features/marketing/components')).map((name) => read(`src/features/marketing/components/${name}`)).join('\n');
    assert.match(source, /NEXT_PUBLIC_CUSTOMER_URL|customerUrl/);
    assert.doesNotMatch(source, /token=|access_token|returnTo=/i);
});

test('public content labels planned capabilities and avoids private API calls', () => {
    const content = read('src/features/marketing/content/site-content.ts');
    assert.match(content, /Phát hiện có AI hỗ trợ/);
    assert.match(content, /PLANNED/);
    assert.doesNotMatch(content, /price:\s*['"]?\d|testimonial|partner|fleet/i);
    assert.doesNotMatch(read('src/features/marketing/components/home-landing.tsx'), /fetch\(|api\//);
    assert.match(read('src/app/(public)/layout.tsx'), /application\/ld\+json/);
});
