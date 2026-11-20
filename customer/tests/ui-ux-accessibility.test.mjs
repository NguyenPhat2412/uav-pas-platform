import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {readdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const PORTAL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(PORTAL_ROOT, 'src');

async function walkFiles(dir, extensions) {
    if (!existsSync(dir)) return [];
    const entries = await readdir(dir, {withFileTypes: true});
    const files = [];
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await walkFiles(full, extensions)));
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
            files.push(full);
        }
    }
    return files;
}

test('UI/UX: zero native blocking browser dialogs (alert/confirm/prompt) in customer src/', async () => {
    const files = await walkFiles(SRC_DIR, ['.ts', '.tsx']);
    const offenders = [];

    for (const file of files) {
        const content = await readFile(file, 'utf8');
        if (/\bwindow\.(?:alert|confirm|prompt)\s*\(/.test(content)) {
            offenders.push(path.relative(PORTAL_ROOT, file));
        }
    }

    assert.deepEqual(offenders, [], `Found native blocking dialogs in: ${offenders.join(', ')}`);
});

test('Accessibility: all <img> tags declare an alt attribute', async () => {
    const files = await walkFiles(SRC_DIR, ['.tsx']);
    const offenders = [];

    for (const file of files) {
        const content = await readFile(file, 'utf8');
        const imgTags = content.match(/<img\b[^>]*>/g) ?? [];
        for (const tag of imgTags) {
            if (!/\balt\s*=/.test(tag)) {
                offenders.push(`${path.relative(PORTAL_ROOT, file)}: ${tag.slice(0, 80)}`);
            }
        }
    }

    assert.deepEqual(offenders, [], `Found <img> tags missing alt attribute:\n${offenders.join('\n')}`);
});

test('UX & Security: external target="_blank" links include rel="noopener"', async () => {
    const files = await walkFiles(SRC_DIR, ['.tsx']);
    const offenders = [];

    for (const file of files) {
        const content = await readFile(file, 'utf8');
        const blankAnchors = content.match(/<a\b[^>]*target\s*=\s*["']_blank["'][^>]*>/g) ?? [];
        for (const tag of blankAnchors) {
            if (!/\brel\s*=\s*["'][^"']*noopener[^"']*["']/.test(tag)) {
                offenders.push(`${path.relative(PORTAL_ROOT, file)}: ${tag.slice(0, 100)}`);
            }
        }
    }

    assert.deepEqual(offenders, [], `Found target="_blank" links missing rel="noopener":\n${offenders.join('\n')}`);
});

test('Accessibility: no positive tabIndex values that disrupt natural keyboard focus order', async () => {
    const files = await walkFiles(SRC_DIR, ['.tsx']);
    const offenders = [];

    for (const file of files) {
        const content = await readFile(file, 'utf8');
        if (/\btabIndex\s*=\s*(?:\{\s*[1-9]\d*\s*\}|["'][1-9]\d*["'])/.test(content)) {
            offenders.push(path.relative(PORTAL_ROOT, file));
        }
    }

    assert.deepEqual(offenders, [], `Found positive tabIndex values in: ${offenders.join(', ')}`);
});

test('Accessibility: root layout declares html lang attribute and global stylesheet honors reduced motion', async () => {
    const layoutPath = path.join(SRC_DIR, 'app', 'layout.tsx');
    assert.equal(existsSync(layoutPath), true, 'Expected src/app/layout.tsx to exist');
    const layout = await readFile(layoutPath, 'utf8');
    assert.match(layout, /<html\b[^>]*\blang=/, 'Root layout must declare lang attribute on <html>');

    const cssFiles = await walkFiles(SRC_DIR, ['.css']);
    const hasReducedMotion = (
        await Promise.all(cssFiles.map(file => readFile(file, 'utf8')))
    ).some(css => /prefers-reduced-motion:\s*reduce/.test(css));
    assert.equal(hasReducedMotion, true, 'Stylesheets must honor prefers-reduced-motion: reduce');
});
