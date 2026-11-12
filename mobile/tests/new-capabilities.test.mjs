import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
import test from 'node:test';

registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier.startsWith('@/')) {
            const rel = specifier.slice(2);
            const base = new URL(`../src/${rel}`, import.meta.url);
            for (const candidate of [`${base.href}.ts`, `${base.href}/index.ts`, base.href]) {
                if (existsSync(new URL(candidate))) return nextResolve(candidate, context);
            }
        }
        return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
        if (url.endsWith('.json')) {
            return {
                format: 'module',
                shortCircuit: true,
                source: `export default ${readFileSync(new URL(url), 'utf8')};`,
            };
        }
        return nextLoad(url, context);
    },
});

const {API_ROUTES} = await import('../src/shared/lib/api/routes.ts');
const zoneForm = await import('../src/shared/forms/airspace/airspace-zone-form.ts');
const {translate} = await import('../src/lib/i18n/catalog.ts');

const readSrc = rel => readFileSync(new URL(`../src/${rel}`, import.meta.url), 'utf8');

test('mobile shared API_ROUTES exposes all 6 multi-tier UAV PAS endpoints', () => {
    assert.equal(API_ROUTES.flightSites.list, '/api/v1/flight-sites');
    assert.equal(API_ROUTES.flightSites.detail(7), '/api/v1/flight-sites/7');
    assert.equal(API_ROUTES.missions.clone(21), '/api/v1/missions/21/clone');
    assert.equal(API_ROUTES.missions.review(21), '/api/v1/missions/21/review');
    assert.equal(API_ROUTES.missions.preflight(21), '/api/v1/missions/21/preflight');
    assert.equal(API_ROUTES.missions.dispatchCandidates(21), '/api/v1/missions/21/dispatch-candidates');
    assert.equal(API_ROUTES.missions.autoAssign(21), '/api/v1/missions/21/auto-assign');
    assert.equal(API_ROUTES.missions.operatorLogbook, '/api/v1/missions/operator-logbook');
    assert.equal(API_ROUTES.admin.slaIntelligence, '/api/v1/admin/sla-intelligence');
});

test('mobile shared airspace form forwards planned flight windows and preserves NOTAM schedules on toggle', () => {
    const check = zoneForm.toAirspaceCheckInput(
        null,
        21.0285,
        105.8542,
        '2026-11-18T08:00',
        '2026-11-18T09:30',
    );
    assert.equal(check?.plannedStartTime, '2026-11-18T08:00:00');
    assert.equal(check?.plannedEndTime, '2026-11-18T09:30:00');

    const toggled = zoneForm.toAirspaceZoneTogglePayload(
        {
            id: 5,
            code: 'VN-HN-NOTAM-T1',
            name: 'NOTAM T1',
            zoneType: 'RESTRICTED',
            geometryType: 'CIRCLE',
            centerLat: 21.0285,
            centerLng: 105.8542,
            radiusMeters: 800,
            vertices: null,
            maxAltitudeAglM: 100,
            authority: 'CAAV',
            active: true,
            description: null,
            effectiveFrom: '2026-11-18T08:00:00',
            effectiveUntil: '2026-11-18T12:00:00',
        },
        false,
    );
    assert.equal(toggled.effectiveFrom, '2026-11-18T08:00:00');
    assert.equal(toggled.effectiveUntil, '2026-11-18T12:00:00');
});

test('mobile catalog resolves trilingual capabilities strings across vi, en, and ja', () => {
    for (const locale of ['vi', 'en', 'ja']) {
        for (const key of [
            'capabilities.flightSites.title',
            'capabilities.clone.action',
            'capabilities.review.title',
            'capabilities.smartDispatch.autoAssign',
            'capabilities.preflight.signButton',
            'capabilities.logbook.title',
            'capabilities.notam.scheduledBadge',
            'capabilities.sla.title',
        ]) {
            const val = translate(locale, key);
            assert.notEqual(val, key, `${key} should resolve in ${locale}`);
            assert.ok(val.length > 2);
        }
    }
});

test('mobile capability screens wire hooks cleanly with zero raw hex literals', () => {
    const screens = [
        'components/mission/MissionFormScreen.tsx',
        'components/mission/MissionDetailScreen.tsx',
        'components/operations/OperationsMissionsScreen.tsx',
        'components/operations/OperationsMissionDetailScreen.tsx',
        'components/operations/FleetMaintenanceScreen.tsx',
        'components/operations/AdminQuickActionsScreen.tsx',
    ];

    for (const rel of screens) {
        const src = readSrc(rel);
        assert.doesNotMatch(src, /['"]#[0-9a-fA-F]{3,8}['"]/, `${rel} must use styles/tokens.ts colours`);
        assert.doesNotMatch(src, /from\s+['"]@\/api\//, `${rel} must use hooks instead of api services`);
    }

    assert.equal(API_ROUTES.simulation.runs, '/api/v1/simulation/runs');
    assert.equal(API_ROUTES.simulation.rehearseMission(15), '/api/v1/simulation/rehearse-mission/15');
    for (const locale of ['vi', 'en', 'ja']) {
        assert.notEqual(translate(locale, 'simulation.rehearseAction'), 'simulation.rehearseAction');
        assert.notEqual(translate(locale, 'simulation.history.title'), 'simulation.history.title');
    }
    assert.match(readSrc('components/operations/FleetMaintenanceScreen.tsx'), /useSimulationRuns/);
    assert.match(readSrc('components/operations/OperationsMissionDetailScreen.tsx'), /simActions\.rehearseMission\.mutate/);

    assert.match(readSrc('components/mission/MissionFormScreen.tsx'), /useSavedFlightSites/);
    assert.match(readSrc('components/mission/MissionDetailScreen.tsx'), /CustomerHandoverReviewCard/);
    assert.match(readSrc('components/mission/MissionDetailScreen.tsx'), /actions\.clone\.mutate/);
    assert.match(readSrc('components/operations/OperationsMissionsScreen.tsx'), /useOperatorLogbook/);
    assert.match(readSrc('components/operations/OperationsMissionDetailScreen.tsx'), /useOperationsDispatchCandidates/);
    assert.match(readSrc('components/operations/OperationsMissionDetailScreen.tsx'), /useOperationsMissionPreflight/);
    assert.match(readSrc('components/operations/AdminQuickActionsScreen.tsx'), /useAdminSlaIntelligence/);
});
