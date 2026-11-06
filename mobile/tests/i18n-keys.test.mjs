import assert from 'node:assert/strict';
import test from 'node:test';
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';

// Every literal t('…') key in the app must exist in vi, en and ja, merged the way src/lib/i18n/catalog.ts does.
const src = new URL('../src/', import.meta.url).pathname;
const read = path => JSON.parse(readFileSync(join(src, path), 'utf8'));
const isObject = value => value && typeof value === 'object' && !Array.isArray(value);
const merge = (a, b) => {
    const out = {...a};
    for (const [key, value] of Object.entries(b)) out[key] = isObject(value) && isObject(out[key]) ? merge(out[key], value) : value;
    return out;
};
const catalog = locale => merge(merge({
    ...read(`shared/messages/${locale}.json`),
    ...read(`shared/messages/sections/admin/${locale}.json`),
    ...read(`shared/messages/sections/customerPro/${locale}.json`),
    ...read(`shared/messages/sections/opsMissions/${locale}.json`),
}, read(`shared/messages/customer/${locale}.json`)), read(`messages/${locale}.json`));
const lookup = (tree, key) => key.split('.').reduce((node, part) => (isObject(node) ? node[part] : undefined), tree);

function sources(dir) {
    return readdirSync(dir).flatMap(name => {
        const abs = join(dir, name);
        if (statSync(abs).isDirectory()) return name === 'shared' ? [] : sources(abs);
        return /\.tsx?$/.test(name) ? [abs] : [];
    });
}

test('i18n: every key used by the app exists in vi, en and ja', () => {
    const keys = new Set();
    for (const file of sources(src)) {
        for (const [, key] of readFileSync(file, 'utf8').matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) keys.add(key);
    }
    // Keys built from a value: mission filters.
    for (const filter of ['all', 'draft', 'waiting', 'scheduled', 'active', 'done', 'stopped']) keys.add(`mobile.missions.filters.${filter}`);
    assert.ok(keys.size > 100, `found ${keys.size} keys`);
    for (const locale of ['vi', 'en', 'ja']) {
        const tree = catalog(locale);
        const missing = [...keys].filter(key => typeof lookup(tree, key) !== 'string');
        assert.deepEqual(missing, [], `${locale} is missing keys`);
    }
});

test('i18n: the app catalogs have the same keys in every language', () => {
    const flat = (tree, prefix = '') => Object.entries(tree).flatMap(([key, value]) => isObject(value) ? flat(value, `${prefix}${key}.`) : [`${prefix}${key}`]);
    const vi = flat(read('messages/vi.json')).sort();
    for (const locale of ['en', 'ja']) assert.deepEqual(flat(read(`messages/${locale}.json`)).sort(), vi, locale);
});
