import assert from 'node:assert/strict';
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

// UAV PAS content safety guard: no school branding, no military wording, no unverified
// commercial/technical claims, and no demo-only banners or disclaimers may reach a screen.
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

/** Unverified technical or commercial claims; checked on the public site, auth screens and their copy. */
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
    assert.deepEqual(offences(files('src', SOURCES), EVERYWHERE), []);
});

test('public site and sign-in copy makes no unverified technical or commercial claims', () => {
    const paths = [
        ...files('src/app/(public)', SOURCES),
        ...files('src/components/marketing', SOURCES),
        ...files('src/components/auth', SOURCES),
        ...files('src/content/marketing', SOURCES),
    ];
    assert.deepEqual(offences(paths, PUBLIC_CLAIMS), []);
});

const DEMO_BANNERS = [
    ['Vietnamese demo label', /bản demo/i],
    ['English demo edition badge', /demo edition/i],
    ['personal project demo label', /personal project\s*[·-]?\s*demo/i],
    ['personal project label (VI)', /đồ án cá nhân/i],
    ['personal project label (JA)', /個人プロジェクト/],
    ['parenthetical simulation or demo disclaimer', /\(\s*(minh hoạ|minh họa|mô phỏng|giả lập)\s*\)/i],
    ['no real payments disclaimer', /Không thu phí thật|No real payments|商用サービスではありません/i],
];

test('public site and auth screens contain no demo-only banners or disclaimers', () => {
    assert.deepEqual(offences(files('src', SOURCES), DEMO_BANNERS), []);
    for (const locale of ['vi', 'en', 'ja']) {
        const catalog = JSON.parse(readFileSync(`${root}src/messages/${locale}.json`, 'utf8'));
        assert.ok(catalog.publicHeader.tagline, `${locale}: header tagline`);
        assert.ok(catalog.publicFooter.description, `${locale}: footer description`);
        assert.equal(catalog.publicHeader.demoNotice, undefined, `${locale}: header demoNotice removed`);
        assert.equal(catalog.publicFooter.demoNotice, undefined, `${locale}: footer demoNotice removed`);
    }
});

const USER_FACING_JARGON = [
    ['internal DB engine in user copy', /\(\s*PostgreSQL\s*\)|\bto PostgreSQL\b/i],
    ['developer simulator name in user copy', /\bPX4\s*SITL\b/i],
    ['awkward literal fault injection wording', /Tiêm sự cố|\bfault injection\b|リアルタイム障害注入/i],
    ['casual home/fast-forward slang in simulation', /"Về nhà"|"Tua thời gian"|\bWind \/ Warp\b/],
    ['internal bank webhook jargon in customer copy', /webhook ngân hàng|\bbank webhook\b|銀行Webhook/i],
];

test('customer, operations, and root catalogs avoid internal stack jargon and awkward literal phrasing', () => {
    const userCatalogs = [
        'src/messages/vi.json',
        'src/messages/en.json',
        'src/messages/ja.json',
        ...files('src/messages/customer', ['.json']),
        ...files('src/messages/sections/customerPro', ['.json']),
        ...files('src/messages/sections/opsMissions', ['.json']),
        ...files('src/messages/sections/opsShared', ['.json']),
    ];
    assert.deepEqual(offences(userCatalogs, USER_FACING_JARGON), []);
});
