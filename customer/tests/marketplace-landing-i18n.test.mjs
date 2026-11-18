import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const atRoot = (path) => `${root}${path}`;
const read = (path) => readFileSync(atRoot(path), 'utf8');

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

test('publicSite trilingual catalogs (vi, en, ja) have 100% key parity and non-empty strings', () => {
    const vi = flattenKeys(JSON.parse(read('src/messages/sections/publicSite/vi.json')));
    const en = flattenKeys(JSON.parse(read('src/messages/sections/publicSite/en.json')));
    const ja = flattenKeys(JSON.parse(read('src/messages/sections/publicSite/ja.json')));

    assert.ok(vi.size >= 200, `expected >= 200 publicSite keys, got ${vi.size}`);
    assert.deepEqual([...en.keys()].sort(), [...vi.keys()].sort(), 'en keys must match vi keys');
    assert.deepEqual([...ja.keys()].sort(), [...vi.keys()].sort(), 'ja keys must match vi keys');

    for (const [key, val] of [...vi.entries(), ...en.entries(), ...ja.entries()]) {
        assert.equal(typeof val, 'string', `${key} must be a string`);
        assert.ok(val.trim().length > 0, `${key} must not be empty`);
    }
});

test('original visual landing architecture is preserved with refined wording and formal dossier documents', () => {
    const homeLanding = read('src/components/marketing/HomeLanding.tsx');
    assert.match(homeLanding, /HomeLandingHeroSection/);
    assert.match(homeLanding, /HomeLandingCapabilitiesSection/);
    assert.match(homeLanding, /HomeLandingPortalsSection/);
    assert.match(homeLanding, /HomeLandingContactSection/);
    assert.match(homeLanding, /HomeLandingShowcaseSection/);

    const marketingFiles = readdirSync(atRoot('src/components/marketing')).filter((f) => f.endsWith('.tsx'));
    const catalogFiles = readdirSync(atRoot('src/components/marketplace/catalog')).filter((f) => f.endsWith('.tsx'));

    const combined = [
        ...marketingFiles.map((f) => read(`src/components/marketing/${f}`)),
        ...catalogFiles.map((f) => read(`src/components/marketplace/catalog/${f}`)),
        read('src/messages/sections/publicSite/vi.json'),
    ].join('\n');

    assert.doesNotMatch(combined, /\btransition-all\b/, 'transition-all is forbidden');
    assert.doesNotMatch(combined, /\b(emerald|teal|indigo|violet|purple)-\d{2,3}\b/, 'out-of-palette Tailwind classes are forbidden');
    assert.doesNotMatch(combined, /Đội bay Chính hãng UAV-PAS|Đội bay UAV PAS/, 'legacy 1P fleet badge must not appear');
    assert.doesNotMatch(combined, /phí sàn|hoa hồng sàn|chiết khấu sàn|ăn chênh lệch/i, 'crude fee wording must not appear on marketing/public copy');

    const forms = read('src/forms/marketplace/marketplace-forms.ts');
    assert.match(forms, /PLATFORM_FEE_AGREEMENT/);
    assert.match(forms, /TAX_SETTLEMENT_DOSSIER/);
    assert.match(forms, /FLIGHT_OPERATION_PERMIT/);

    const header = read('src/components/marketing/PublicHeader.tsx');
    assert.match(header, /supportedLocales/);
    assert.match(header, /setLocale/);
});

test('I18nContext fetches and switches locales via backend i18n API and Profile hub wires password + seller dossier', () => {
    const i18nContext = read('src/providers/I18nContext.tsx');
    assert.match(i18nContext, /fetchPublicLocaleBundle/);
    assert.match(i18nContext, /switchPublicLocale/);

    const customerProfile = read('src/components/profile/Profile.tsx');
    assert.match(customerProfile, /PasswordChangeCard/);
    assert.match(customerProfile, /CustomerSellerDossierCard/);
});
