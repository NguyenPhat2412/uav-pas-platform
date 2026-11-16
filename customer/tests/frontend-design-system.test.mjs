import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {readdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const PORTAL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BANNED_PALETTE =
    /\b(?:emerald|green|teal|indigo|purple|violet)-(?:50|100|200|300|400|500|600|700|800|900|950)\b/;
const TRANSITION_ALL = /\btransition-all\b/;

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

test('customer portal enforces monochrome-plus-brand palette, explicit GPU transitions, and focus traps on aria-modal dialogs', async () => {
    const srcDir = path.join(PORTAL_ROOT, 'src');
    const tsFiles = await walkFiles(srcDir, ['.ts', '.tsx']);
    const cssFiles = await walkFiles(srcDir, ['.css']);

    for (const file of tsFiles) {
        const rel = path.relative(PORTAL_ROOT, file);
        const content = await readFile(file, 'utf8');
        assert.doesNotMatch(content, BANNED_PALETTE, `Banned AI-slop palette in ${rel}`);
        assert.doesNotMatch(content, TRANSITION_ALL, `Banned transition-all in ${rel}`);
        if (content.includes('aria-modal="true"')) {
            assert.match(content, /useDialogFocusTrap/, `Modal ${rel} must wire useDialogFocusTrap`);
        }
    }

    for (const file of cssFiles) {
        const rel = path.relative(PORTAL_ROOT, file);
        const content = await readFile(file, 'utf8');
        assert.doesNotMatch(content, TRANSITION_ALL, `Banned transition-all in ${rel}`);
        assert.match(content, /\.uav-bezel\b/, `${rel} must define .uav-bezel double-bezel shell`);
        assert.match(content, /prefers-reduced-motion:\s*reduce/, `${rel} must honor reduced motion`);
    }

    for (const rel of [
        'src/components/mission/customer/CustomerMissionCreate.tsx',
        'src/components/mission/customer/MissionReviewSummaryList.tsx',
    ]) {
        const lines = (await readFile(path.join(PORTAL_ROOT, rel), 'utf8')).split('\n').length;
        assert.equal(lines <= 301, true, `${rel} exceeded 300 lines (${lines - 1} lines)`);
    }
});
