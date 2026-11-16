import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {readdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ADMIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(ADMIN_ROOT, '..');
const PORTALS = ['admin', 'customer', 'operations'].filter(p =>
    existsSync(path.join(REPO_ROOT, p, 'package.json')),
);

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

test('DESIGN.md documents 3-layer Primitive -> Semantic -> Component tokens and Haptic Double-Bezel architecture', async () => {
    const designMdPath = path.join(REPO_ROOT, 'docs/architecture/FRONTEND_DESIGN_SYSTEM.md');
    if (!existsSync(designMdPath)) return;
    const designMd = await readFile(designMdPath, 'utf8');
    assert.match(designMd, /Primitive/i);
    assert.match(designMd, /Semantic/i);
    assert.match(designMd, /Component/i);
    assert.match(designMd, /uav-bezel/);
    assert.match(designMd, /useDialogFocusTrap/);
});

test('all web portals enforce monochrome-plus-brand palette, explicit GPU transitions, and focus traps on aria-modal dialogs', async () => {
    for (const portal of PORTALS) {
        const srcDir = path.join(REPO_ROOT, portal, 'src');
        const tsFiles = await walkFiles(srcDir, ['.ts', '.tsx']);
        const cssFiles = await walkFiles(srcDir, ['.css']);

        for (const file of tsFiles) {
            const rel = path.relative(REPO_ROOT, file);
            const content = await readFile(file, 'utf8');
            assert.doesNotMatch(content, BANNED_PALETTE, `Banned AI-slop palette in ${rel}`);
            assert.doesNotMatch(content, TRANSITION_ALL, `Banned transition-all in ${rel}`);
            if (content.includes('aria-modal="true"')) {
                assert.match(content, /useDialogFocusTrap/, `Modal ${rel} must wire useDialogFocusTrap`);
            }
        }

        for (const file of cssFiles) {
            const rel = path.relative(REPO_ROOT, file);
            const content = await readFile(file, 'utf8');
            assert.doesNotMatch(content, TRANSITION_ALL, `Banned transition-all in ${rel}`);
            assert.match(content, /\.uav-bezel\b/, `${rel} must define .uav-bezel double-bezel shell`);
            assert.match(content, /prefers-reduced-motion:\s*reduce/, `${rel} must honor reduced motion`);
        }

        const [requiredMark, card] = await Promise.all([
            readFile(path.join(srcDir, 'components/shared/RequiredMark.tsx'), 'utf8'),
            readFile(path.join(srcDir, 'components/ui/Card.tsx'), 'utf8'),
        ]);
        assert.match(requiredMark, /text-muted/, `${portal} OptionalMark must meet WCAG AA via text-muted`);
        assert.match(card, /machined/, `${portal} Card must support machined Double-Bezel variant`);
    }
});

test('decomposed storage, shell, weather, marketplace, and mission components stay <= 300 lines', async () => {
    const guarded = [
        'admin/src/components/layout/AdminAppShell.tsx',
        'admin/src/components/storage/pool/GoogleDrivePoolSection.tsx',
        'admin/src/components/storage/pool/GoogleDriveNodeModal.tsx',
        'admin/src/components/storage/pool/StoragePolicyFormSection.tsx',
        'admin/src/components/storage/pool/StorageDriveNodeCard.tsx',
        'admin/src/components/storage/pool/StorageR2MigrationCard.tsx',
        'admin/src/components/weather/FlightWeatherWorkspace.tsx',
        'admin/src/components/marketplace/AdminMarketplaceProviders.tsx',
        'admin/src/components/marketplace/AdminMarketplaceListings.tsx',
        'admin/src/components/marketplace/AdminMarketplacePayouts.tsx',
        'customer/src/components/mission/customer/CustomerMissionCreate.tsx',
        'customer/src/components/mission/customer/MissionReviewSummaryList.tsx',
    ];

    for (const rel of guarded) {
        const full = path.join(REPO_ROOT, rel);
        if (!existsSync(full)) continue;
        const lines = (await readFile(full, 'utf8')).split('\n').length;
        // Trailing newline adds 1 empty element in split('\n'), allow <= 301 split length (300 lines)
        assert.equal(lines <= 301, true, `${rel} exceeded 300 lines (${lines - 1} lines)`);
    }
});
