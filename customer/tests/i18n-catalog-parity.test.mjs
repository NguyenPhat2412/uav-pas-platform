import assert from 'node:assert/strict';
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));

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

function deepMerge(target, source) {
    for (const [k, v] of Object.entries(source ?? {})) {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            target[k] = deepMerge(target[k] ? {...target[k]} : {}, v);
        } else {
            target[k] = v;
        }
    }
    return target;
}

function walkSourceFiles(dir, out = []) {
    for (const ent of readdirSync(dir, {withFileTypes: true})) {
        const p = join(dir, ent.name);
        if (ent.isDirectory()) walkSourceFiles(p, out);
        else if (p.endsWith('.tsx') || p.endsWith('.ts')) out.push(p);
    }
    return out;
}

test('every message catalog folder in src/messages maintains 100% vi/en/ja key parity and non-empty strings', () => {
    const sectionsDir = join(root, 'src/messages/sections');
    const catalogDirs = [
        join(root, 'src/messages'),
        join(root, 'src/messages/customer'),
        ...readdirSync(sectionsDir, {withFileTypes: true})
            .filter(d => d.isDirectory())
            .map(d => join(sectionsDir, d.name)),
    ];

    assert.ok(catalogDirs.length >= 12, `expected >= 12 catalog directories, got ${catalogDirs.length}`);

    for (const dir of catalogDirs) {
        for (const loc of ['vi', 'en', 'ja']) {
            assert.ok(existsSync(join(dir, `${loc}.json`)), `missing ${loc}.json in ${dir}`);
        }
        const vi = flattenKeys(JSON.parse(readFileSync(join(dir, 'vi.json'), 'utf8')));
        const en = flattenKeys(JSON.parse(readFileSync(join(dir, 'en.json'), 'utf8')));
        const ja = flattenKeys(JSON.parse(readFileSync(join(dir, 'ja.json'), 'utf8')));

        const viKeys = [...vi.keys()].sort();
        const enKeys = [...en.keys()].sort();
        const jaKeys = [...ja.keys()].sort();

        assert.deepEqual(enKeys, viKeys, `en.json keys mismatch vi.json in ${dir}`);
        assert.deepEqual(jaKeys, viKeys, `ja.json keys mismatch vi.json in ${dir}`);

        for (const [loc, map] of [['vi', vi], ['en', en], ['ja', ja]]) {
            for (const [key, val] of map.entries()) {
                assert.equal(typeof val, 'string', `${dir}/${loc}.json:${key} must be string`);
                assert.ok(val.trim().length > 0, `${dir}/${loc}.json:${key} must not be empty`);
            }
        }
    }
});

test('every static t("key.path") lookup across customer UI and hooks resolves in vi, en, and ja', () => {
    function loadMergedCatalog(locale) {
        let merged = JSON.parse(readFileSync(join(root, `src/messages/${locale}.json`), 'utf8'));
        merged = deepMerge(merged, JSON.parse(readFileSync(join(root, `src/messages/customer/${locale}.json`), 'utf8')));
        const secRoot = join(root, 'src/messages/sections');
        for (const ent of readdirSync(secRoot, {withFileTypes: true})) {
            if (!ent.isDirectory()) continue;
            const data = JSON.parse(readFileSync(join(secRoot, ent.name, `${locale}.json`), 'utf8'));
            merged = deepMerge(merged, data);
            merged[ent.name] = deepMerge(merged[ent.name] ?? {}, data);
        }
        return merged;
    }

    const catalogs = {
        vi: loadMergedCatalog('vi'),
        en: loadMergedCatalog('en'),
        ja: loadMergedCatalog('ja'),
    };

    const getVal = (obj, dotted) =>
        dotted.split('.').reduce((acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined), obj);

    const files = [
        ...walkSourceFiles(join(root, 'src/components')),
        ...walkSourceFiles(join(root, 'src/app')),
        ...walkSourceFiles(join(root, 'src/hooks')),
    ];

    const keyPattern = /\bt\(\s*['"]([^'"${}]+)['"]/g;
    const missing = [];
    for (const f of files) {
        const src = readFileSync(f, 'utf8');
        let match;
        while ((match = keyPattern.exec(src)) !== null) {
            const key = match[1];
            if (!key.includes('.')) continue;
            for (const loc of ['vi', 'en', 'ja']) {
                if (typeof getVal(catalogs[loc], key) !== 'string') {
                    missing.push(`${loc}:${key} in ${f}`);
                }
            }
        }
    }

    assert.deepEqual(missing, []);
});
