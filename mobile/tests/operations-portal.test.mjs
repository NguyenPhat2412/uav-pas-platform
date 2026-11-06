import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
import test from 'node:test';
import {
    buildCompletionPayload,
    buildFailurePayload,
    buildMaintenanceCompletionPayload,
    buildReasonQueryValue,
    buildRescueDispatchPayload,
    canSubmitCompletion,
    canSubmitFailure,
    canSubmitMaintenanceCompletion,
    canSubmitReasonNote,
} from '../src/forms/operations/field-report-form.ts';
import {
    canTakeoffMission,
    INITIAL_PREFLIGHT_CHECKLIST,
    isPreflightChecklistComplete,
    PREFLIGHT_CHECKLIST_KEYS,
    preflightProgressCount,
    togglePreflightItem,
} from '../src/forms/operations/preflight-checklist.ts';
import {isFinitePoint, parseGeoJsonPolygonCoordinates, verticesToMapCoordinates} from '../src/utils/operations/map-shapes.ts';
import {
    canAccessOperationsPortal,
    resolveMobilePortal,
    resolveNotificationTarget,
    resolvePortalEntryHref,
} from '../src/utils/operations/portal-routing.ts';

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
});

const {missionControls} = await import('../src/shared/utils/mission/presentation.ts');

const ALL_CHECKED = PREFLIGHT_CHECKLIST_KEYS.reduce(
    (acc, key) => ({...acc, [key]: true}),
    {...INITIAL_PREFLIGHT_CHECKLIST},
);

test('portal routing: smart role entry and workspace preference resolution', () => {
    assert.equal(canAccessOperationsPortal('ROLE_PILOT'), false);
    assert.equal(canAccessOperationsPortal(null), false);
    assert.equal(canAccessOperationsPortal('ROLE_OPERATOR'), true);
    assert.equal(canAccessOperationsPortal('ROLE_COMMANDER'), true);
    assert.equal(canAccessOperationsPortal('ROLE_ADMIN'), true);

    assert.equal(resolveMobilePortal('ROLE_PILOT', null), 'customer');
    assert.equal(resolveMobilePortal('ROLE_PILOT', 'operations'), 'customer', 'customers never land in operations');

    assert.equal(resolveMobilePortal('ROLE_OPERATOR', null), 'operations', 'staff default to operations');
    assert.equal(resolveMobilePortal('ROLE_COMMANDER', undefined), 'operations');
    assert.equal(resolveMobilePortal('ROLE_ADMIN', 'customer'), 'customer', 'staff honour saved customer workspace');
    assert.equal(resolveMobilePortal('ROLE_OPERATOR', 'operations'), 'operations');

    assert.equal(resolvePortalEntryHref('operations'), '/operations/missions');
    assert.equal(resolvePortalEntryHref('customer'), '/customer/home');
});

test('notification deep-linking: routes INVOICE, SAR, MISSION and PERMIT to the right mobile screen', () => {
    assert.equal(resolveNotificationTarget({type: 'SYSTEM', referenceType: 'MISSION', referenceId: null}, 'customer'), null);

    assert.deepEqual(
        resolveNotificationTarget({type: 'BILLING', referenceType: 'INVOICE', referenceId: 88}, 'operations', 'ROLE_ADMIN'),
        {pathname: '/customer/invoices/[id]', params: {id: '88'}},
    );

    assert.deepEqual(
        resolveNotificationTarget({type: 'SAR_TARGET_FOUND', referenceType: 'SAR', referenceId: 42}, 'operations', 'ROLE_OPERATOR'),
        {pathname: '/operations/sar/[missionId]', params: {missionId: '42'}},
    );
    assert.deepEqual(
        resolveNotificationTarget({type: 'SAR_TARGET_FOUND', referenceType: 'MISSION', referenceId: 42}, 'customer', 'ROLE_COMMANDER'),
        {pathname: '/operations/sar/[missionId]', params: {missionId: '42'}},
    );
    assert.deepEqual(
        resolveNotificationTarget({type: 'SAR_TARGET_FOUND', referenceType: 'SAR', referenceId: 42}, 'customer', 'ROLE_PILOT'),
        null,
    );

    assert.deepEqual(
        resolveNotificationTarget({type: 'PERMIT', referenceType: 'PERMIT', referenceId: 19}, 'operations', 'ROLE_OPERATOR'),
        {pathname: '/operations/mission/[id]', params: {id: '19'}},
    );
    assert.deepEqual(
        resolveNotificationTarget({type: 'PERMIT', referenceType: 'PERMIT', referenceId: 19}, 'customer', 'ROLE_PILOT'),
        {pathname: '/customer/mission/[id]', params: {id: '19'}},
    );
});

test('pre-flight checklist: gates takeoff on READY status, operatorAccepted, airspace, permit verification and all 4 checks', () => {
    assert.deepEqual(preflightProgressCount(INITIAL_PREFLIGHT_CHECKLIST), {checked: 0, total: 4});
    assert.equal(isPreflightChecklistComplete(INITIAL_PREFLIGHT_CHECKLIST), false);

    const toggled = togglePreflightItem(INITIAL_PREFLIGHT_CHECKLIST, 'gnssRtkLocked');
    assert.equal(toggled.gnssRtkLocked, true);
    assert.equal(preflightProgressCount(toggled).checked, 1);
    assert.equal(isPreflightChecklistComplete(ALL_CHECKED), true);

    const baseMission = {
        id: 10,
        status: 'READY',
        operatorAccepted: true,
        permit: {status: 'NOT_REQUIRED'},
        flightPlan: null,
    };

    assert.deepEqual(
        canTakeoffMission({...baseMission, status: 'CONFIRMED'}, ALL_CHECKED, 'CLEAR'),
        {allowed: false, blockerKey: 'mobile.ops.preflight.blockers.notReady'},
    );
    assert.deepEqual(
        canTakeoffMission({...baseMission, operatorAccepted: false}, ALL_CHECKED, 'CLEAR'),
        {allowed: false, blockerKey: 'mobile.ops.preflight.blockers.acceptanceRequired'},
    );
    assert.deepEqual(
        canTakeoffMission(baseMission, ALL_CHECKED, 'BLOCKED'),
        {allowed: false, blockerKey: 'mobile.ops.preflight.blockers.airspaceBlocked'},
    );
    assert.deepEqual(
        canTakeoffMission({...baseMission, permit: {status: 'SUBMITTED'}}, ALL_CHECKED, 'PERMIT_REQUIRED'),
        {allowed: false, blockerKey: 'mobile.ops.preflight.blockers.permitUnverified'},
    );
    assert.deepEqual(
        canTakeoffMission(baseMission, toggled, 'CLEAR'),
        {allowed: false, blockerKey: 'mobile.ops.preflight.blockers.checklistIncomplete'},
    );
    assert.deepEqual(
        canTakeoffMission({...baseMission, permit: {status: 'VERIFIED'}}, ALL_CHECKED, 'PERMIT_REQUIRED'),
        {allowed: true, blockerKey: null},
    );
});

test('missionControls: aligns ownership, status and RBAC for accept, ready, start, complete, fail, forceFail and reject', () => {
    const operatorPerms = new Set(['MISSION_STATUS_UPDATE', 'MISSION_START', 'MISSION_COMPLETE']);
    const commanderPerms = new Set(['MISSION_CONFIRM', 'MISSION_REJECT', 'MISSION_STATUS_UPDATE', 'MISSION_START', 'MISSION_COMPLETE']);
    const asOperator = code => operatorPerms.has(code);
    const asCommander = code => commanderPerms.has(code);

    // Assigned operator (#7) vs unassigned operator (#8) vs commander (#99)
    const confirmedUnaccepted = {status: 'CONFIRMED', operatorId: 7, operatorAccepted: false};
    const cAssignedConfirmed = missionControls(confirmedUnaccepted, 7, asOperator);
    assert.equal(cAssignedConfirmed.accept, true);
    assert.equal(cAssignedConfirmed.conflict, true);
    assert.equal(cAssignedConfirmed.ready, false, 'ready requires RESOURCE_RESERVED + operatorAccepted');
    assert.equal(cAssignedConfirmed.fail, false, 'fail starts at RESOURCE_RESERVED');

    const cUnassignedConfirmed = missionControls(confirmedUnaccepted, 8, asOperator);
    assert.equal(cUnassignedConfirmed.accept, false, 'unassigned operator cannot accept');
    assert.equal(cUnassignedConfirmed.conflict, false, 'unassigned operator cannot report conflict');

    const cCommanderConfirmed = missionControls(confirmedUnaccepted, 99, asCommander);
    assert.equal(cCommanderConfirmed.reject, true, 'commander can reject CONFIRMED as well as PENDING_CONFIRMATION');
    assert.equal(cCommanderConfirmed.accept, false, 'unassigned commander cannot accept on behalf of operator');

    // RESOURCE_RESERVED: ready requires operatorAccepted; assigned gets fail while commander gets forceFail
    const reservedUnaccepted = {status: 'RESOURCE_RESERVED', operatorId: 7, operatorAccepted: false};
    assert.equal(missionControls(reservedUnaccepted, 7, asOperator).ready, false);

    const reservedAccepted = {status: 'RESOURCE_RESERVED', operatorId: 7, operatorAccepted: true};
    const cOperatorReserved = missionControls(reservedAccepted, 7, asOperator);
    assert.equal(cOperatorReserved.ready, true);
    assert.equal(cOperatorReserved.fail, true);
    assert.equal(cOperatorReserved.forceFail, false);

    const cCommanderReserved = missionControls(reservedAccepted, 99, asCommander);
    assert.equal(cCommanderReserved.fail, false, 'unassigned commander does not call operator-only fail');
    assert.equal(cCommanderReserved.forceFail, true, 'commander gets forceFail instead');

    // READY: start requires assigned + operatorAccepted + MISSION_START
    const readyUnaccepted = {status: 'READY', operatorId: 7, operatorAccepted: false};
    assert.equal(missionControls(readyUnaccepted, 7, asOperator).start, false);

    const readyAccepted = {status: 'READY', operatorId: 7, operatorAccepted: true};
    assert.equal(missionControls(readyAccepted, 7, asOperator).start, true);
    assert.equal(missionControls(readyAccepted, 99, asCommander).start, false, 'unassigned commander cannot start flight');
    assert.equal(missionControls(readyAccepted, 99, asCommander).forceFail, true);

    // IN_PROGRESS: complete & fail for assigned operator; forceFail for unassigned commander
    const inProgress = {status: 'IN_PROGRESS', operatorId: 7, operatorAccepted: true};
    assert.equal(missionControls(inProgress, 7, asOperator).complete, true);
    assert.equal(missionControls(inProgress, 7, asOperator).fail, true);
    assert.equal(missionControls(inProgress, 8, asOperator).complete, false);
    assert.equal(missionControls(inProgress, 99, asCommander).complete, false);
    assert.equal(missionControls(inProgress, 99, asCommander).forceFail, true);
});

test('field report, maintenance completion and SAR dispatch forms validate backend constraints', () => {
    assert.equal(canSubmitCompletion('All ortho tiles captured', ''), false, 'equipmentCondition is @NotBlank on backend');
    assert.equal(canSubmitCompletion('', 'Nominal'), false);
    assert.equal(canSubmitCompletion('   Ortho tiles captured ', ' Battery 62%, props clean '), true);
    assert.deepEqual(buildCompletionPayload('  Ortho tiles captured ', ' Nominal '), {
        completionNote: 'Ortho tiles captured',
        equipmentCondition: 'Nominal',
    });

    assert.equal(canSubmitFailure('   ', 'wind gust'), false);
    assert.equal(canSubmitFailure('High wind gust > 14 m/s', ''), true);
    assert.deepEqual(buildFailurePayload(' High wind ', '   '), {failureReason: 'High wind'});
    assert.deepEqual(buildFailurePayload(' High wind ', ' RTH triggered '), {
        failureReason: 'High wind',
        notes: 'RTH triggered',
    });

    assert.equal(canSubmitReasonNote('   '), false);
    assert.equal(buildReasonQueryValue('  Airspace NOTAM active '), 'Airspace NOTAM active');

    assert.equal(canSubmitMaintenanceCompletion('Motors balanced and hover tested', false), false);
    assert.equal(canSubmitMaintenanceCompletion('   ', true), false);
    assert.equal(canSubmitMaintenanceCompletion('Motors balanced and hover tested', true), true);
    assert.deepEqual(buildMaintenanceCompletionPayload(3, '  Hover test 10 min OK ', true), {
        expectedVersion: 3,
        inspectionNotes: 'Hover test 10 min OK',
        inspectionPassed: true,
    });

    assert.deepEqual(
        buildRescueDispatchPayload({coordinatorNote: '  Bring stretcher ', detectionId: 7, latitude: 21.02, longitude: 105.85}),
        {coordinatorNote: 'Bring stretcher', detectionId: 7, latitude: 21.02, longitude: 105.85},
    );
});

test('map shapes: finite coordinate guards, GeoJSON Polygon/Feature, 2D SAR rings and null/malformed safety', () => {
    assert.equal(isFinitePoint(21.0285, 105.8542), true);
    assert.equal(isFinitePoint(0, 0), true);
    assert.equal(isFinitePoint(null, 105.85), false);
    assert.equal(isFinitePoint(21.02, undefined), false);
    assert.equal(isFinitePoint(Number.NaN, 105.85), false);
    assert.equal(isFinitePoint(21.02, Number.POSITIVE_INFINITY), false);
    assert.equal(isFinitePoint(95, 105.85), false);
    assert.equal(isFinitePoint(21.02, -190), false);
    assert.equal(isFinitePoint('21.02', 105.85), false);

    const geojsonPolygon = JSON.stringify({
        type: 'Polygon',
        coordinates: [[[105.85, 21.02], [105.86, 21.02], [105.86, 21.03], [105.85, 21.02]]],
    });
    assert.deepEqual(parseGeoJsonPolygonCoordinates(geojsonPolygon), [
        {latitude: 21.02, longitude: 105.85},
        {latitude: 21.02, longitude: 105.86},
        {latitude: 21.03, longitude: 105.86},
    ]);

    const sarArrayPolygon = JSON.stringify([[21.01, 105.81], [21.02, 105.82], [21.03, 105.81]]);
    assert.equal(parseGeoJsonPolygonCoordinates(sarArrayPolygon).length, 3);

    assert.deepEqual(parseGeoJsonPolygonCoordinates('{not-valid-json'), []);
    assert.deepEqual(parseGeoJsonPolygonCoordinates(null), []);
    assert.deepEqual(verticesToMapCoordinates(null), []);
    assert.deepEqual(verticesToMapCoordinates(undefined), []);
    assert.deepEqual(verticesToMapCoordinates([[Number.NaN, 105.81], [21.02, Number.POSITIVE_INFINITY], [null, undefined]]), []);
    assert.equal(verticesToMapCoordinates([[21.01, 105.81], [21.02, 105.82]]).length, 0);
    assert.equal(verticesToMapCoordinates([[21.01, 105.81], [21.02, 105.82], [21.03, 105.81]]).length, 3);
});

test('push registration, forceFail & operations portal routes are wired end to end', () => {
    const notificationsApi = readFileSync(new URL('../src/api/notification/notifications.api.ts', import.meta.url), 'utf8');
    assert.match(notificationsApi, /registerPushEndpoint:/);
    assert.match(notificationsApi, /unregisterPushEndpoint:/);
    assert.match(notificationsApi, /API_ROUTES\.notifications\.pushTokens/);

    const opsMissionsApi = readFileSync(new URL('../src/api/operations/operations-missions.api.ts', import.meta.url), 'utf8');
    assert.match(opsMissionsApi, /API_ROUTES\.missions\.accept\(id\)/);
    assert.match(opsMissionsApi, /API_ROUTES\.missions\.reportConflict\(id\)/);
    assert.match(opsMissionsApi, /API_ROUTES\.missions\.forceFail\(id\)/);

    const opsDetailScreen = readFileSync(new URL('../src/components/operations/OperationsMissionDetailScreen.tsx', import.meta.url), 'utf8');
    assert.match(opsDetailScreen, /missionControls\(mission,\s*user\?\.id,\s*can\)/);
    assert.match(opsDetailScreen, /controls\.forceFail/);
    assert.match(opsDetailScreen, /hasQuickActions/);

    const sarCockpitScreen = readFileSync(new URL('../src/components/operations/SarCockpitScreen.tsx', import.meta.url), 'utf8');
    assert.match(sarCockpitScreen, /disabled=\{mission\.uavId == null\}/);

    const notificationsScreen = readFileSync(new URL('../src/components/notification/NotificationsScreen.tsx', import.meta.url), 'utf8');
    assert.match(notificationsScreen, /switchPortal\('customer'\)/);
    assert.match(notificationsScreen, /switchPortal\('operations'\)/);

    const preferencesSource = readFileSync(new URL('../src/lib/storage/preferences.ts', import.meta.url), 'utf8');
    assert.match(preferencesSource, /uav_portal/);
    assert.match(preferencesSource, /uav_push_endpoint/);
    assert.doesNotMatch(preferencesSource, /AsyncStorage[\s\S]{0,80}(token|Token)/);

    const requiredRoutes = [
        '../src/app/operations/_layout.tsx',
        '../src/app/operations/(tabs)/_layout.tsx',
        '../src/app/operations/(tabs)/missions/index.tsx',
        '../src/app/operations/(tabs)/sar/index.tsx',
        '../src/app/operations/(tabs)/fleet/index.tsx',
        '../src/app/operations/(tabs)/weather/index.tsx',
        '../src/app/operations/(tabs)/account/index.tsx',
        '../src/app/operations/mission/[id].tsx',
        '../src/app/operations/sar/[missionId].tsx',
        '../src/app/operations/notifications.tsx',
        '../src/app/operations/profile.tsx',
        '../src/app/operations/security.tsx',
        '../src/app/operations/training/index.tsx',
        '../src/app/operations/training/[slug].tsx',
        '../src/app/operations/training/lesson/[id].tsx',
        '../src/app/operations/assistant.tsx',
    ];
    for (const rel of requiredRoutes) {
        assert.equal(existsSync(new URL(rel, import.meta.url)), true, `missing route ${rel}`);
    }

    const bannedPattern = /\b(VJU|VNU|tactical|combat)\b|Việt Nhật|ĐHQG|tác chiến|chiến đấu|sĩ quan|chiến thuật|Bản Demo/i;
    for (const locale of ['vi', 'en', 'ja']) {
        const raw = readFileSync(new URL(`../src/messages/${locale}.json`, import.meta.url), 'utf8');
        assert.doesNotMatch(raw, bannedPattern, `messages/${locale}.json contains a banned term`);
    }
});
