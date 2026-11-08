import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import {readFile} from 'node:fs/promises';

async function loadTs(path) {
    const source = await readFile(new URL(path, import.meta.url), 'utf8');
    const compiled = ts.transpileModule(source, {
        compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}
    }).outputText;
    return import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
}

const {conditionOf, isDaytime, windLevel, rainLevel, visibilityLevel} = await loadTs('../src/utils/weather/conditions.ts');

test('weather conditions: WMO codes map to the icon families', () => {
    const cases = {0: 'clear', 1: 'partly', 2: 'partly', 3: 'cloudy', 45: 'fog', 48: 'fog', 51: 'drizzle', 57: 'drizzle',
        61: 'rain', 65: 'rain', 67: 'rain', 71: 'snow', 77: 'snow', 80: 'showers', 82: 'showers', 85: 'snow', 95: 'thunder', 99: 'thunder'};
    for (const [code, condition] of Object.entries(cases)) assert.equal(conditionOf(Number(code)), condition, `code ${code}`);
    assert.equal(conditionOf(null), 'unknown');
    assert.equal(conditionOf(4), 'unknown');
});

test('weather conditions: day runs from 06:00 to 17:59 local time', () => {
    assert.equal(isDaytime('2026-11-01T06:00'), true);
    assert.equal(isDaytime('2026-11-01T17:59'), true);
    assert.equal(isDaytime('2026-11-01T18:00'), false);
    assert.equal(isDaytime('2026-11-01T05:30'), false);
    assert.equal(isDaytime(undefined), true, 'unknown time shows the day icon');
});

test('weather conditions: wind, rain and visibility read as levels', () => {
    assert.equal(windLevel(4, 12), 'good');
    assert.equal(windLevel(7, 12), 'fair');
    assert.equal(windLevel(11, 12), 'poor');
    assert.equal(windLevel(null, 12), null);
    assert.equal(rainLevel(5, 0), 'good');
    assert.equal(rainLevel(30, 0), 'fair');
    assert.equal(rainLevel(10, 2), 'poor');
    assert.equal(rainLevel(70), 'poor');
    assert.equal(rainLevel(null, null), null);
    assert.equal(visibilityLevel(10000), 'good');
    assert.equal(visibilityLevel(3000), 'fair');
    assert.equal(visibilityLevel(800), 'poor');
});

const {skyTheme} = await loadTs('../src/utils/weather/sky-theme.ts');

test('sky theme: each sky gets its effect, and night or storms switch to a dark card', () => {
    assert.deepEqual([skyTheme('clear', false).effect, skyTheme('clear', false).dark], ['sun', false]);
    assert.deepEqual([skyTheme('clear', true).effect, skyTheme('clear', true).dark], ['stars', true]);
    assert.equal(skyTheme('rain', false).effect, 'rain');
    assert.equal(skyTheme('showers', true).effect, 'showers');
    assert.equal(skyTheme('rain', true).dark, true);
    assert.deepEqual([skyTheme('thunder', false).effect, skyTheme('thunder', false).dark], ['storm', true]);
    assert.equal(skyTheme('fog', false).effect, 'fog');
    assert.equal(skyTheme('snow', false).effect, 'snow');
    assert.equal(skyTheme('unknown', false).effect, 'none');
    for (const condition of ['clear', 'partly', 'cloudy', 'fog', 'drizzle', 'rain', 'showers', 'thunder', 'snow', 'unknown'])
        for (const night of [false, true]) assert.match(skyTheme(condition, night).background, /^bg-gradient-to-br /);
});
