import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const atRoot = path => `${root}${path}`;
const sarHooksPath = `${root}src/hooks/sar/useSar.ts`;

test('SAR AI Cockpit route exists and is configured with OperationsPage', () => {
    const pagePath = `${root}src/app/(operations)/operations/(portal)/sar-cockpit/page.tsx`;
    assert.equal(existsSync(pagePath), true, 'sar-cockpit route should exist');

    const content = readFileSync(pagePath, 'utf8');
    assert.match(content, /OperationsPage/, 'sar-cockpit page should use OperationsPage wrapper');
    assert.match(content, /SarCockpitPanel/, 'sar-cockpit page should render SarCockpitPanel');
    assert.match(content, /MISSION_VIEW/, 'sar-cockpit should be guarded by MISSION_VIEW permission');
});

test('AppShell includes SAR AI Cockpit in navigation', () => {
    const shellPath = `${root}src/components/layout/AppShell.tsx`;
    const content = readFileSync(shellPath, 'utf8');
    assert.match(content, /\/sar-cockpit/, 'AppShell navigation should have /sar-cockpit link');
    assert.match(content, /key: 'sar'/, 'AppShell navigation should label the SAR entry via operationsNav.sar');
    const vi = JSON.parse(readFileSync(atRoot('src/messages/vi.json'), 'utf8'));
    assert.match(vi.operationsNav.sar, /Tác chiến AI & SAR/, 'vi catalog should label Tác chiến AI & SAR');
});

test('AiViewfinder draws real AI detections and verifies them through the API', () => {
    const viewfinderPath = `${root}src/components/sar/AiViewfinder.tsx`;
    assert.equal(existsSync(viewfinderPath), true);

    const content = readFileSync(viewfinderPath, 'utf8');
    assert.doesNotMatch(content, /mockDetections|TRK-10\d/, 'detections must come from the API, not a fixture');
    assert.match(content, /detections: AiDetection\[\]/, 'should render detections passed from the mission query');
    assert.match(content, /useSarVerifyDetection/, 'should verify through the SAR hook');
    assert.match(readFileSync(sarHooksPath, 'utf8'), /sarService\.verify/, 'the hook verifies through the AI detections API');
    assert.match(content, /threshold/, 'should have a confidence threshold slider');
    assert.match(content, /toast\.(success|error)/, 'should report verify outcome with a toast');
});

test('SarTacticalMap plots the mission datum, search area, detections and live UAV on a real map', () => {
    const mapPath = `${root}src/components/sar/SarTacticalMap.tsx`;
    assert.equal(existsSync(mapPath), true);

    const content = readFileSync(mapPath, 'utf8');
    assert.match(content, /import\('leaflet'\)/, 'should render a Leaflet map');
    assert.match(content, /parseSearchArea\(mission\.searchAreaPolygon\)/, 'should draw the stored search polygon');
    assert.match(content, /mission\.lkpLatitude/, 'should place the Last Known Position from the mission');
    assert.match(content, /useSarFlightPlan/, 'should request the IAMSAR route through the SAR hook');
    assert.match(readFileSync(sarHooksPath, 'utf8'), /sarService\.flightPlan/, 'the hook requests the IAMSAR route from the backend');
    assert.match(content, /telemetry\.latitude/, 'should place the UAV from telemetry');
    assert.doesNotMatch(content, /20\.7284|107\.0512/, 'no hardcoded coordinates');
});

test('UavTelemetryHud and Kv260EdgeStatusCard show reported values only', () => {
    const hudPath = `${root}src/components/sar/UavTelemetryHud.tsx`;
    const kv260Path = `${root}src/components/sar/Kv260EdgeStatusCard.tsx`;
    assert.equal(existsSync(hudPath), true);
    assert.equal(existsSync(kv260Path), true);

    const hudContent = readFileSync(hudPath, 'utf8');
    assert.match(hudContent, /altitudeAglMeters/, 'should display Altitude AGL');
    assert.match(hudContent, /batteryPct/, 'should display Battery %');
    assert.match(hudContent, /opsShared\.sar\.hud\.rtk\./, 'should display RTK fix status');
    assert.match(hudContent, /telemetry\.stale/, 'should flag stale telemetry');
    const opsSharedVi = JSON.parse(readFileSync(atRoot('src/messages/sections/opsShared/vi.json'), 'utf8'));
    assert.match(opsSharedVi.opsShared.sar.hud.rtk.FIXED, /RTK FIX/, 'vi catalog should label RTK fix status');

    const kv260Content = readFileSync(kv260Path, 'utf8');
    assert.match(kv260Content, /task\.dpuUtilization/, 'should monitor DPU utilization');
    assert.match(kv260Content, /task\.fps/, 'should monitor inference FPS');
    assert.match(kv260Content, /task\.socTemperature/, 'should monitor SoC temperature');

    for (const file of [hudPath, kv260Path]) {
        assert.doesNotMatch(readFileSync(file, 'utf8'), /const \w+ = \d+(\.\d+)?; \/\/ (m|%|FPS|ms|°C|dBm)/, `${file} must not hardcode readings`);
    }
    assert.equal(existsSync(`${root}src/stores/sar/sarStore.ts`), false, 'the simulated telemetry store is gone');
    for (const text of Object.values(opsSharedVi.opsShared.sar.cockpit)) {
        assert.doesNotMatch(text, /mô phỏng/i, 'cockpit copy must not describe a simulation');
    }
});
