import {existsSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

const resolvePortalUrl = p => {
    for (const prefix of ['../', '../../customer/', '../../operations/']) {
        const u = new URL(`${prefix}${p}`, import.meta.url);
        if (existsSync(u)) return u;
    }
    return new URL(`../${p}`, import.meta.url);
};
const readSource = path => readFile(resolvePortalUrl(path), 'utf8');

const compileModule = source =>
    `data:text/javascript;base64,${Buffer.from(
        ts.transpileModule(source, {
            compilerOptions: {
                module: ts.ModuleKind.ESNext,
                target: ts.ScriptTarget.ES2022,
            },
        }).outputText,
    ).toString('base64')}`;

const formatUrl = compileModule(await readSource('src/lib/format.ts'));

async function loadTsModule(relativePath) {
    const raw = await readSource(relativePath);
    const rewritten = raw.replaceAll('@/lib/format', formatUrl);
    return import(compileModule(rewritten));
}

function collectLeafKeys(obj, prefix = '') {
    const keys = [];
    for (const [k, v] of Object.entries(obj)) {
        const next = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            keys.push(...collectLeafKeys(v, next));
        } else {
            keys.push(next);
        }
    }
    return keys.sort();
}

test('API_ROUTES defines all 6 multi-tier UAV PAS capability endpoints', async () => {
    const {API_ROUTES} = await loadTsModule('src/lib/api/routes.ts');

    assert.equal(API_ROUTES.flightSites.list, '/api/v1/flight-sites');
    assert.equal(API_ROUTES.flightSites.detail(12), '/api/v1/flight-sites/12');
    assert.equal(API_ROUTES.missions.clone(88), '/api/v1/missions/88/clone');
    assert.equal(API_ROUTES.missions.review(88), '/api/v1/missions/88/review');
    assert.equal(API_ROUTES.missions.preflight(88), '/api/v1/missions/88/preflight');
    assert.equal(API_ROUTES.missions.dispatchCandidates(88), '/api/v1/missions/88/dispatch-candidates');
    assert.equal(API_ROUTES.missions.autoAssign(88), '/api/v1/missions/88/auto-assign');
    assert.equal(API_ROUTES.missions.operatorLogbook, '/api/v1/missions/operator-logbook');
    assert.equal(API_ROUTES.admin.slaIntelligence, '/api/v1/admin/sla-intelligence');
});

test('airspace-zone-form handles temporary NOTAM windows and planned flight windows', async () => {
    const zoneForm = await loadTsModule('src/forms/airspace/airspace-zone-form.ts');

    assert.equal(zoneForm.normalizeOptionalLocalDateTime('2026-11-12T08:30'), '2026-11-12T08:30:00');
    assert.equal(zoneForm.normalizeOptionalLocalDateTime('  '), null);
    assert.equal(zoneForm.toDatetimeLocalValue('2026-11-12T08:30:00'), '2026-11-12T08:30');

    const notamDraft = {
        ...zoneForm.emptyAirspaceZoneDraft(),
        code: 'vn-hn-notam-99',
        name: 'Hành lang diễn tập cứu hộ tạm thời',
        authority: 'Cục Tác nghiệp Hàng không Dân dụng',
        effectiveFrom: '2026-11-15T08:00',
        effectiveUntil: '2026-11-15T12:00',
    };
    assert.equal(zoneForm.canSubmitAirspaceZoneDraft(notamDraft), true);

    const invertedDraft = {
        ...notamDraft,
        effectiveFrom: '2026-11-15T14:00',
        effectiveUntil: '2026-11-15T12:00',
    };
    assert.equal(zoneForm.canSubmitAirspaceZoneDraft(invertedDraft), false);

    const payload = zoneForm.toAirspaceZoneUpsertPayload(notamDraft);
    assert.equal(payload.effectiveFrom, '2026-11-15T08:00:00');
    assert.equal(payload.effectiveUntil, '2026-11-15T12:00:00');

    const toggled = zoneForm.toAirspaceZoneTogglePayload(
        {
            id: 7,
            code: 'VN-HN-NOTAM-99',
            name: 'NOTAM 99',
            zoneType: 'RESTRICTED',
            geometryType: 'CIRCLE',
            centerLat: 21.0285,
            centerLng: 105.8542,
            radiusMeters: 900,
            vertices: null,
            maxAltitudeAglM: 100,
            authority: 'CAAV',
            active: true,
            description: 'Test',
            effectiveFrom: '2026-11-15T08:00:00',
            effectiveUntil: '2026-11-15T12:00:00',
        },
        false,
    );
    assert.equal(toggled.active, false);
    assert.equal(toggled.effectiveFrom, '2026-11-15T08:00:00');
    assert.equal(toggled.effectiveUntil, '2026-11-15T12:00:00');

    const checkWithWindow = zoneForm.toAirspaceCheckInput(
        null,
        21.0285,
        105.8542,
        '2026-11-15T09:00',
        '2026-11-15T10:30',
    );
    assert.deepEqual(checkWithWindow, {
        areaType: 'POINT',
        takeoffLatitude: 21.0285,
        takeoffLongitude: 105.8542,
        altitudeAglMeters: 80,
        plannedStartTime: '2026-11-15T09:00:00',
        plannedEndTime: '2026-11-15T10:30:00',
    });

    const checkWithInvertedWindow = zoneForm.toAirspaceCheckInput(
        null,
        21.0285,
        105.8542,
        '2026-11-15T11:00',
        '2026-11-15T10:30',
    );
    assert.equal('plannedStartTime' in checkWithInvertedWindow, false);
    assert.equal('plannedEndTime' in checkWithInvertedWindow, false);
});

test('capabilities trilingual catalogs maintain 100% key parity and zero banned terms', async () => {
    const [vi, en, ja] = await Promise.all([
        readSource('src/messages/vi.json').then(JSON.parse),
        readSource('src/messages/en.json').then(JSON.parse),
        readSource('src/messages/ja.json').then(JSON.parse),
    ]);

    assert.ok(vi.capabilities && en.capabilities && ja.capabilities);
    assert.deepEqual(collectLeafKeys(vi.capabilities), collectLeafKeys(en.capabilities));
    assert.deepEqual(collectLeafKeys(vi.capabilities), collectLeafKeys(ja.capabilities));

    const banned = /\b(VJU|VNU|tactical|combat)\b|tác chiến|chiến đấu|sĩ quan|chiến thuật|Bản Demo/i;
    for (const [locale, catalog] of [
        ['vi', vi.capabilities],
        ['en', en.capabilities],
        ['ja', ja.capabilities],
    ]) {
        assert.doesNotMatch(JSON.stringify(catalog), banned, `No banned terminology in ${locale}.capabilities`);
    }
});

test('new capability UI components uphold palette, dialog, and hook-boundary guardrails', async () => {
    const uiFiles = [
        'src/components/mission/customer/SavedFlightSitesBar.tsx',
        'src/components/mission/customer/MissionHandoverReviewCard.tsx',
        'src/components/mission/operations/SmartDispatchCard.tsx',
        'src/components/mission/operations/MissionPreflightCard.tsx',
        'src/components/mission/operations/OperatorLogbookSummary.tsx',
        'src/components/reporting/AdminSlaIntelligenceSection.tsx',
        'src/components/airspace/AdminAirspacePanel.tsx',
    ];

    for (const file of uiFiles) {
        const content = await readSource(file);
        assert.doesNotMatch(
            content,
            /\b(?:green|emerald|teal|indigo|purple|violet)-\d+\b/,
            `${file} must not use forbidden Tailwind palette classes`,
        );
        assert.doesNotMatch(
            content,
            /\bwindow\.(?:confirm|prompt|alert)\b/,
            `${file} must not use blocking browser dialogs`,
        );
        assert.doesNotMatch(
            content,
            /from\s+['"]@tanstack\/react-query['"]|from\s+['"]@\/api\//,
            `${file} must access data exclusively via @/hooks/*`,
        );
    }

    const [customerCreate, customerDetail, opsDetail, assignedPanel, adminReports] = await Promise.all([
        readSource('src/components/mission/customer/CustomerMissionCreate.tsx'),
        readSource('src/components/mission/customer/CustomerMissionDetail.tsx'),
        readSource('src/components/mission/operations/OperationsMissionDetail.tsx'),
        readSource('src/components/mission/operations/AssignedMissionsPanel.tsx'),
        readSource('src/components/reporting/AdminReportsPanel.tsx'),
    ]);

    assert.match(customerCreate, /SavedFlightSitesBar/);
    assert.match(customerDetail, /MissionHandoverReviewCard/);
    assert.match(opsDetail, /SmartDispatchCard/);
    assert.match(opsDetail, /MissionPreflightCard/);
    assert.match(assignedPanel, /OperatorLogbookSummary/);
    assert.match(adminReports, /AdminSlaIntelligenceSection/);
});
