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
    ['unverified RTK claim', /\bRTK\b/],
];

function checkJsonValues(node, pathPrefix, offences) {
    if (typeof node === 'string') {
        for (const [label, re] of BANNED_EVERYWHERE) {
            if (re.test(node)) {
                offences.push(`${pathPrefix} [${label}]: ${node.slice(0, 120)}`);
            }
        }
        return;
    }
    if (Array.isArray(node)) {
        node.forEach((item, idx) => checkJsonValues(item, `${pathPrefix}[${idx}]`, offences));
        return;
    }
    if (node && typeof node === 'object') {
        for (const [k, v] of Object.entries(node)) {
            checkJsonValues(v, `${pathPrefix}.${k}`, offences);
        }
    }
}

test('admin catalogs and components contain zero school branding, military terms, demo banners, or RTK claims', () => {
    const offences = [];

    for (const jsonRel of files('src/messages', ['.json'])) {
        const parsed = JSON.parse(readFileSync(`${root}${jsonRel}`, 'utf8'));
        checkJsonValues(parsed, jsonRel, offences);
    }

    for (const codeRel of files('src', ['.ts', '.tsx'])) {
        const lines = readFileSync(`${root}${codeRel}`, 'utf8').split('\n');
        lines.forEach((rawLine, idx) => {
            // Strip backend wire enum identifier QUADCOPTER_RTK before checking user-facing RTK
            const line = rawLine.replaceAll('QUADCOPTER_RTK', '');
            for (const [label, re] of BANNED_EVERYWHERE) {
                if (re.test(line)) {
                    offences.push(`${codeRel}:${idx + 1} [${label}]: ${rawLine.trim().slice(0, 120)}`);
                }
            }
        });
    }

    assert.deepEqual(offences, []);
});
