import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const atRoot = path => `${root}${path}`;

test('SAR AI Cockpit route exists and is configured with OperationsPage', () => {
  const pagePath = `${root}src/features/sar/pages/operations/sar-cockpit.tsx`;
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
  assert.match(content, /Tác chiến AI & SAR/, 'AppShell navigation should label Tác chiến AI & SAR');
});

test('AiViewfinder defines YOLOv8s Bounding Boxes, thermal mode and candidate stream', () => {
  const viewfinderPath = `${root}src/features/sar/components/AiViewfinder.tsx`;
  assert.equal(existsSync(viewfinderPath), true);
  
  const content = readFileSync(viewfinderPath, 'utf8');
  assert.match(content, /YOLOv8s/, 'should mention YOLOv8s model');
  assert.match(content, /thermal/, 'should support thermal mode');
  assert.match(content, /Person/, 'should detect Person candidates');
  assert.match(content, /confidenceThreshold/, 'should have confidence threshold slider');
});

test('SarTacticalMap renders search polygon, LKP marker, flight path, and grid sectors', () => {
  const mapPath = `${root}src/features/sar/components/SarTacticalMap.tsx`;
  assert.equal(existsSync(mapPath), true);
  
  const content = readFileSync(mapPath, 'utf8');
  assert.match(content, /searchPolygon/, 'should define search area polygon');
  assert.match(content, /lkpPosition/, 'should define Last Known Position (LKP)');
  assert.match(content, /flightPathPoints/, 'should render UAV flight breadcrumbs');
  assert.match(content, /sectors/, 'should render tactical grid sectors (A1, A2...)');
});

test('UavTelemetryHud and Kv260EdgeStatusCard render core hardware & flight telemetry', () => {
  const hudPath = `${root}src/features/sar/components/UavTelemetryHud.tsx`;
  const kv260Path = `${root}src/features/sar/components/Kv260EdgeStatusCard.tsx`;
  assert.equal(existsSync(hudPath), true);
  assert.equal(existsSync(kv260Path), true);

  const hudContent = readFileSync(hudPath, 'utf8');
  assert.match(hudContent, /altitudeAgl/, 'should display Altitude AGL');
  assert.match(hudContent, /batteryPct/, 'should display Battery %');
  assert.match(hudContent, /RTK FIX/, 'should display RTK fix status');

  const kv260Content = readFileSync(kv260Path, 'utf8');
  assert.match(kv260Content, /dpuUtilization/, 'should monitor DPU utilization');
  assert.match(kv260Content, /inferenceFps/, 'should monitor inference FPS');
  assert.match(kv260Content, /temperature/, 'should monitor SoC temperature');
});
