import assert from 'node:assert/strict';
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

// UAV PAS is a personal project demo: no school branding, no military wording and no
// commercial or technical claims the project cannot back up may reach a screen.
const root = fileURLToPath(new URL('../', import.meta.url));

function files(dir, extensions) {
    const out = [];
    for (const name of readdirSync(`${root}${dir}`)) {
        const path = `${dir}/${name}`;
        if (statSync(`${root}${path}`).isDirectory()) out.push(...files(path, extensions));
        else if (extensions.some(ext => name.endsWith(ext))) out.push(path);
    }
    return out;
}

function offences(paths, banned) {
    const found = [];
    for (const path of paths) {
        readFileSync(`${root}${path}`, 'utf8').split('\n').forEach((line, index) => {
            for (const [label, pattern] of banned)
                if (pattern.test(line)) found.push(`${path}:${index + 1} ${label}: ${line.trim().slice(0, 120)}`);
        });
    }
    return found;
}

/** Banned everywhere a user can read text: every catalog, page and component. */
const EVERYWHERE = [
    ['school branding', /\bVJU\b|Việt Nhật|Viet Nhat|Vietnam[ -]Japan|日越|ĐHQG|ĐHQGHN|\bVNU\b|vju\.(ac|edu)/i],
    ['military wording', /tác chiến|chiến đấu|sĩ quan|chiến thuật|\btactical\b|\bcombat\b|作戦|戦闘/i],
];

/** Claims the demo cannot back up; checked on the public site, auth screens and their copy. */
const PUBLIC_CLAIMS = [
    ['unverified RTK accuracy', /\d\s*[–-]\s*\d\s*cm\s*RTK|RTK\s*\d\s*[–-]\s*\d\s*cm|<\s*1[.,]5\s*cm/i],
    ['AI on board claim', /khoang bay|on[- ]board|gắn trên UAV,/i],
    ['100% claim', /100\s?%\s*(chuyến|flight)/i],
    ['official pricing', /chính thức/i],
    ['service level promise', /\bSLA\b|cam kết SLA|phi công chuyên trách|24\/7/i],
    ['contract or tax claim', /hợp đồng|hóa đơn VAT|hoá đơn VAT|bao gồm VAT/i],
    ['standard compliance claim', /chuẩn quốc tế/i],
    ['school lab claim', /phòng thí nghiệm .* hiện trường/i],
];

const SOURCES = ['.ts', '.tsx', '.json'];

test('no school branding or military wording in any catalog, page or component', () => {
    const paths = [
        ...files('src/messages', ['.json']),
        ...files('src/app', SOURCES),
        ...files('src/components', SOURCES),
        ...files('src/content', SOURCES),
        ...files('src/utils', SOURCES),
    ];
    assert.deepEqual(offences(paths, EVERYWHERE), []);
});

test('public site and sign-in copy makes no claims the demo cannot back up', () => {
    const paths = [
        ...files('src/app/(public)', SOURCES),
        ...files('src/components/marketing', SOURCES),
        ...files('src/components/auth', SOURCES),
        ...files('src/content/marketing', SOURCES),
    ];
    assert.deepEqual(offences(paths, PUBLIC_CLAIMS), []);
});

test('public footer states the project is a personal, non-commercial demo', () => {
    for (const locale of ['vi', 'en', 'ja']) {
        const catalog = JSON.parse(readFileSync(`${root}src/messages/${locale}.json`, 'utf8'));
        assert.ok(catalog.publicFooter.disclaimer, `${locale}: footer disclaimer`);
        assert.ok(catalog.publicFooter.demoNotice, `${locale}: footer demo notice`);
        assert.ok(catalog.publicHeader.demoNotice, `${locale}: header demo notice`);
    }
});
