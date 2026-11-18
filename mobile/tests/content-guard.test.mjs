import assert from 'node:assert/strict';
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../src/', import.meta.url));

function walk(dir) {
    return readdirSync(dir).flatMap(name => {
        const abs = join(dir, name);
        if (statSync(abs).isDirectory()) return name === 'shared' ? [] : walk(abs);
        return /\.(ts|tsx|json)$/.test(name) ? [abs] : [];
    });
}

const BANNED_EVERYWHERE = [
    ['school branding', /\bVJU\b|Việt Nhật|Viet Nhat|Vietnam[ -]Japan|日越|ĐHQG|ĐHQGHN|\bVNU\b|vju\.(ac|edu)/i],
    ['military wording', /tác chiến|chiến đấu|sĩ quan|chiến thuật|\btactical\b|\bcombat\b|作戦|戦闘/i],
    ['demo banner', /bản demo|demo edition|đồ án cá nhân|個人プロジェクト/i],
    ['parenthetical demo disclaimer', /\(\s*(minh hoạ|minh họa|mô phỏng|giả lập)\s*\)/i],
    ['unverified cm accuracy', /\d\s*[–-]\s*\d\s*cm|sai số chỉ khoảng\s*\d/i],
    ['unverified RTK claim', /\bRTK\b/],
    ['unverified VAT or SLA promise', /hóa đơn VAT|hoá đơn VAT|bao gồm VAT|cam kết SLA|24\/7|chuẩn quốc tế/i],
    ['Math.random fake numbers', /Math\.random\s*\(/],
];

test('mobile content-guard: zero school/military terms, unverified claims, or Math.random in src/', () => {
    const violations = [];
    for (const file of walk(root)) {
        const rel = relative(root, file);
        const lines = readFileSync(file, 'utf8').split('\n');
        lines.forEach((line, idx) => {
            for (const [label, pattern] of BANNED_EVERYWHERE) {
                if (pattern.test(line)) {
                    violations.push(`${rel}:${idx + 1} [${label}] ${line.trim().slice(0, 110)}`);
                }
            }
        });
    }
    assert.deepEqual(violations, []);
});
