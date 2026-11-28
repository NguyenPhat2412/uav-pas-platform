import assert from 'node:assert/strict';
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));

function files(dir, extensions) {
    const out = [];
    for (const name of readdirSync(`${root}${dir}`)) {
        const p = `${dir}/${name}`;
        if (statSync(`${root}${p}`).isDirectory()) out.push(...files(p, extensions));
        else if (extensions.some(ext => name.endsWith(ext))) out.push(p);
    }
    return out;
}

const BANNED_EVERYWHERE = [
    ['school branding', /\bVJU\b|Việt Nhật|Viet Nhat|Vietnam[ -]Japan|日越|ĐHQG|ĐHQGHN|\bVNU\b|vju\.(ac|edu)/i],
    ['military wording', /tác chiến|chiến đấu|sĩ quan|chiến thuật|\btactical\b|\bcombat\b|作戦|戦闘/i],
    ['demo banner', /bản demo|demo edition|personal project\s*[·-]?\s*demo|đồ án cá nhân|個人プロジェクト/i],
    ['parenthetical illustrative disclaimer', /\(\s*(minh hoạ|minh họa|mô phỏng|giả lập)\s*\)/i],
    ['no real payments disclaimer', /Không thu phí thật|No real payments|商用サービスではありません/i],
    ['unverified RTK claim', /\bRTK\b|RTKテレメトリ|RTK補正|RTK時|RTK測量|RTK同期|RTK待機|RTK測位/],
];

/** Banned claims & model-contradicting 3P/RFQ wording from WEBSITE-REDESIGN.md §1–4. */
const REDESIGN_CLAIMS = [
    ['AI on board claim', /khoang bay|\bon[- ]board\b|gắn trên UAV,/i],
    ['100% claim', /100\s?%\s*(chuyến|flight)/i],
    ['contract or tax claim', /hóa đơn VAT|hoá đơn VAT|bao gồm VAT/i],
    ['standard compliance claim', /chuẩn quốc tế/i],
    ['school lab claim', /phòng thí nghiệm .* hiện trường/i],
    ['unverified same-day activation', /kích hoạt ngay trong ngày/i],
    ['unverified 5-minute reply', /phản hồi trong ~?5 phút/i],
    ['unverified on-site hours claim', /có mặt hiện trường/i],
    ['unverified VietQR EMVCo claim', /VietQR EMVCo|EMVCo VietQR/i],
    ['unverified GNSS FIXED/FLOAT claim', /GNSS FIXED|GNSS FLOAT|GNSS FIX\b/],
    ['unverified real digital twin claim', /digital twin thật/i],
    [
        'model-contradicting 3P/RFQ phrase',
        /chọn nhà cung cấp|chọn đối tác|so sánh báo giá|báo giá đối tác|\bOpen RFQ\b|đấu thầu|chào giá|sàn 3P|\b3P\b|\bRFQ\b|kết nối ngay đơn vị bay/i,
    ],
];

const PUBLIC_SITE_CLAIMS = [
    ['official pricing', /chính thức/i],
    ['service level promise', /\bSLA\b|cam kết SLA|phi công chuyên trách|24\/7/i],
    ['commercial contract claim', /hợp đồng/i],
];

const USER_FACING_JARGON = [
    ['internal DB engine in user copy', /\(\s*PostgreSQL\s*\)|\bto PostgreSQL\b/i],
    ['developer simulator name in user copy', /\bPX4\s*SITL\b/i],
    ['awkward literal fault injection wording', /Tiêm sự cố|\bfault injection\b|リアルタイム障害注入/i],
    ['casual home/fast-forward slang in simulation', /"Về nhà"|"Tua thời gian"|\bWind \/ Warp\b/],
    ['internal bank webhook jargon', /webhook ngân hàng|\bbank webhook\b|銀行Webhook/i],
];

function checkJsonValues(node, pathPrefix, patterns, offences) {
    if (typeof node === 'string') {
        for (const [label, re] of patterns) {
            if (re.test(node)) {
                offences.push(`${pathPrefix} [${label}]: ${node.slice(0, 120)}`);
            }
        }
        return;
    }
    if (Array.isArray(node)) {
        node.forEach((item, idx) => checkJsonValues(item, `${pathPrefix}[${idx}]`, patterns, offences));
        return;
    }
    if (node && typeof node === 'object') {
        for (const [k, v] of Object.entries(node)) {
            checkJsonValues(v, `${pathPrefix}.${k}`, patterns, offences);
        }
    }
}

test('operations catalogs and components contain zero school branding, military terms, demo banners, or RTK claims', () => {
    const offences = [];

    for (const jsonRel of files('src/messages', ['.json'])) {
        const parsed = JSON.parse(readFileSync(`${root}${jsonRel}`, 'utf8'));
        checkJsonValues(parsed, jsonRel, [...BANNED_EVERYWHERE, ...REDESIGN_CLAIMS], offences);
    }

    for (const codeRel of files('src', ['.ts', '.tsx'])) {
        // Keep API wire routes/client signatures intact per contract; check all UI/hooks/forms/utils/messages
        const skipRfqApiWire =
            codeRel === 'src/lib/api/routes.ts' ||
            codeRel === 'src/api/marketplace.api.ts' ||
            codeRel.startsWith('src/types/');
        const patterns = skipRfqApiWire
            ? BANNED_EVERYWHERE
            : [...BANNED_EVERYWHERE, ...REDESIGN_CLAIMS];

        const lines = readFileSync(`${root}${codeRel}`, 'utf8').split('\n');
        lines.forEach((rawLine, idx) => {
            const line = rawLine.replaceAll('QUADCOPTER_RTK', '');
            for (const [label, re] of patterns) {
                if (re.test(line)) {
                    offences.push(`${codeRel}:${idx + 1} [${label}]: ${rawLine.trim().slice(0, 120)}`);
                }
            }
        });
    }

    assert.deepEqual(offences, []);
});

test('publicSite catalogs make no unverified commercial promises and non-ja catalogs contain zero decorative Japanese', () => {
    const offences = [];

    for (const jsonRel of files('src/messages/sections/publicSite', ['.json'])) {
        const parsed = JSON.parse(readFileSync(`${root}${jsonRel}`, 'utf8'));
        checkJsonValues(parsed, jsonRel, PUBLIC_SITE_CLAIMS, offences);
    }

    for (const jsonRel of files('src/messages', ['.json'])) {
        if (jsonRel.endsWith('ja.json')) continue;
        const parsed = JSON.parse(readFileSync(`${root}${jsonRel}`, 'utf8'));
        checkJsonValues(
            parsed,
            jsonRel,
            [['decorative Japanese in vi/en catalog', /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/]],
            offences,
        );
    }

    const userCatalogs = [
        'src/messages/vi.json',
        'src/messages/en.json',
        'src/messages/ja.json',
        ...files('src/messages/sections/opsMarketplace', ['.json']),
        ...files('src/messages/sections/opsMissions', ['.json']),
        ...files('src/messages/sections/opsShared', ['.json']),
    ];
    for (const jsonRel of userCatalogs) {
        const parsed = JSON.parse(readFileSync(`${root}${jsonRel}`, 'utf8'));
        checkJsonValues(parsed, jsonRel, USER_FACING_JARGON, offences);
    }

    assert.deepEqual(offences, []);
});
