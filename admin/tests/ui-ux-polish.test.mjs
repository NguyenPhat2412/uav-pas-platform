import {existsSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function walkFiles(dir) {
    const entries = await readdir(dir, {withFileTypes: true});
    const files = await Promise.all(
        entries.map(entry => {
            const fullPath = path.join(dir, entry.name);
            return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
        }),
    );
    return files.flat();
}

function collectLeafKeys(obj, prefix = '') {
    const keys = [];
    for (const [k, v] of Object.entries(obj ?? {})) {
        const next = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            keys.push(...collectLeafKeys(v, next));
        } else {
            keys.push(next);
        }
    }
    return keys.sort();
}

const PORTAL_ROOTS = [ROOT, path.resolve(ROOT, '../customer'), path.resolve(ROOT, '../operations')];
const resolvePortalFile = relPath => {
    for (const r of PORTAL_ROOTS) {
        const candidate = path.join(r, relPath);
        if (existsSync(candidate)) return candidate;
    }
    return path.join(ROOT, relPath);
};
const readSource = relPath => readFile(resolvePortalFile(relPath), 'utf8');

test('zero native blocking browser dialogs (window.confirm, window.prompt, window.alert) remain in src/', async () => {
    const allFiles = (await Promise.all(PORTAL_ROOTS.map(r => walkFiles(path.join(r, 'src'))))).flat();
    const codeFiles = allFiles.filter(file => /\.(ts|tsx)$/.test(file));
    const offenders = [];

    for (const file of codeFiles) {
        const content = await readFile(file, 'utf8');
        if (/\bwindow\.(?:confirm|prompt|alert)\s*\(/.test(content)) {
            offenders.push(path.relative(ROOT, file));
        }
    }

    assert.deepEqual(offenders, [], `Found native browser dialogs in: ${offenders.join(', ')}`);
});

test('ConfirmProvider is mounted in PortalProviders and ConfirmDialog enforces focus trapping', async () => {
    const [portalProviders, confirmDialog, focusTrap] = await Promise.all([
        readSource('src/providers/PortalProviders.tsx'),
        readSource('src/components/ui/ConfirmDialog.tsx'),
        readSource('src/hooks/useDialogFocusTrap.ts'),
    ]);

    assert.match(portalProviders, /ConfirmProvider/);
    assert.match(confirmDialog, /useDialogFocusTrap/);
    assert.match(confirmDialog, /aria-modal="true"/);
    assert.match(focusTrap, /event\.key === 'Escape'/);
    assert.match(focusTrap, /event\.key !== 'Tab'/);
});

test('AdminAirspacePanel integrates interactive Leaflet overview and geometry builder maps within palette guardrails', async () => {
    const [adminPanel, mapCanvas] = await Promise.all([
        readSource('src/components/airspace/AdminAirspacePanel.tsx'),
        readSource('src/components/airspace/AirspaceMapCanvas.tsx'),
    ]);

    assert.match(adminPanel, /AirspaceOverviewMap/);
    assert.match(adminPanel, /AirspaceDraftMap/);
    assert.match(mapCanvas, /airspace\.admin\.map\.overviewTitle/);
    assert.match(mapCanvas, /airspace\.admin\.map\.builderTitle/);
    assert.match(mapCanvas, /airspace\.admin\.map\.undoVertex/);
    assert.match(mapCanvas, /airspace\.admin\.map\.clearVertices/);
    assert.doesNotMatch(
        mapCanvas,
        /\b(?:green|emerald|teal|indigo|purple|violet)-\d+\b/,
        'AirspaceMapCanvas must respect the monochrome + red + amber palette guardrail',
    );
});

test('VietQR BankTransferDialog, Mission coordinate inputs, custom altitude, and Staff login UX contracts hold', async () => {
    const [bankDialog, locationPicker, missionFields, flightSpec, authModal] = await Promise.all([
        readSource('src/components/billing/BankTransferDialog.tsx'),
        readSource('src/components/mission/customer/LocationPicker.tsx'),
        readSource('src/components/mission/customer/MissionFields.tsx'),
        readSource('src/components/mission/customer/FlightSpecFields.tsx'),
        readSource('src/components/auth/AuthModalPopup.tsx'),
    ]);

    assert.match(bankDialog, /payment\.pollingLive/);
    assert.match(bankDialog, /payment\.checkNow/);
    assert.match(bankDialog, /payment\.popupBlocked/);
    assert.match(bankDialog, /useDialogFocusTrap/);

    const coordSource = `${locationPicker}\n${missionFields}`;
    assert.match(coordSource, /mission-latitude/);
    assert.match(coordSource, /mission-longitude/);
    assert.match(flightSpec, /flightSpec\.customAltitude/);

    assert.match(authModal, /\/admin/);
    assert.match(authModal, /\/operations/);
    assert.match(authModal, /useDialogFocusTrap/);
});

test('Responsive tablet breakpoint, dropdown unclipping, viewport clamping, and trilingual leaf-key parity hold', async () => {
    const [
        sidebarController,
        dataTable,
        drawer,
        workspaceTabs,
        adminInvoices,
        viRoot,
        enRoot,
        jaRoot,
        viCust,
        enCust,
        jaCust,
        viOps,
        enOps,
        jaOps,
        viAdmin,
        enAdmin,
        jaAdmin,
    ] = await Promise.all([
        readSource('src/hooks/useSidebarController.ts'),
        readSource('src/components/data/DataTable.tsx'),
        readSource('src/components/data/Drawer.tsx'),
        readSource('src/components/layout/WorkspaceTabs.tsx'),
        readSource('src/components/billing/AdminInvoicesPanel.tsx'),
        readSource('src/messages/vi.json').then(JSON.parse),
        readSource('src/messages/en.json').then(JSON.parse),
        readSource('src/messages/ja.json').then(JSON.parse),
        readSource('src/messages/sections/customerPro/vi.json').then(JSON.parse),
        readSource('src/messages/sections/customerPro/en.json').then(JSON.parse),
        readSource('src/messages/sections/customerPro/ja.json').then(JSON.parse),
        readSource('src/messages/sections/opsShared/vi.json').then(JSON.parse),
        readSource('src/messages/sections/opsShared/en.json').then(JSON.parse),
        readSource('src/messages/sections/opsShared/ja.json').then(JSON.parse),
        readSource('src/messages/sections/admin/vi.json').then(JSON.parse),
        readSource('src/messages/sections/admin/en.json').then(JSON.parse),
        readSource('src/messages/sections/admin/ja.json').then(JSON.parse),
    ]);

    assert.match(sidebarController, /1024px/);
    assert.doesNotMatch(sidebarController, /901px/);
    assert.match(dataTable, /overflow-visible/);
    assert.match(drawer, /100dvh/);
    assert.match(workspaceTabs, /confirmDialog/);
    assert.match(adminInvoices, /sticky right-0/);

    assert.deepEqual(collectLeafKeys(viRoot.common), collectLeafKeys(enRoot.common));
    assert.deepEqual(collectLeafKeys(viRoot.common), collectLeafKeys(jaRoot.common));
    assert.deepEqual(collectLeafKeys(viRoot.airspace), collectLeafKeys(enRoot.airspace));
    assert.deepEqual(collectLeafKeys(viRoot.airspace), collectLeafKeys(jaRoot.airspace));
    assert.deepEqual(collectLeafKeys(viCust), collectLeafKeys(enCust));
    assert.deepEqual(collectLeafKeys(viCust), collectLeafKeys(jaCust));
    assert.deepEqual(collectLeafKeys(viOps), collectLeafKeys(enOps));
    assert.deepEqual(collectLeafKeys(viOps), collectLeafKeys(jaOps));
    assert.deepEqual(collectLeafKeys(viAdmin.admin.invoices), collectLeafKeys(enAdmin.admin.invoices));
    assert.deepEqual(collectLeafKeys(viAdmin.admin.invoices), collectLeafKeys(jaAdmin.admin.invoices));
});
