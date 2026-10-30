import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync, readdirSync} from 'node:fs';
import ts from 'typescript';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const json = path => JSON.parse(read(path));
const load = async (path, replace = s => s) => {
    const compiled = ts.transpileModule(replace(read(path)), {compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}}).outputText;
    return import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
};
const weatherFiles = dir => readdirSync(new URL(`src/features/weather/${dir}`, root)).map(name => `src/features/weather/${dir}/${name}`);

test('Weather: routes match the backend ApiRoutes.Weather contract', async () => {
    const {API_ROUTES} = await load('src/lib/api/routes.ts');
    assert.equal(API_ROUTES.weather.forecast, '/api/v1/weather/forecast');
    assert.equal(API_ROUTES.weather.byMission(42), '/api/v1/weather/missions/42');
    assert.equal(API_ROUTES.weather.stations, '/api/v1/weather/stations');
    assert.equal(API_ROUTES.weather.adminProvider, '/api/v1/admin/weather/provider');
    const java = read('../backend/src/main/java/com/uav/platform/config/routes/ApiRoutes.java');
    assert.match(java, /BASE = API_V1_PREFIX \+ "\/weather"/);
    assert.match(java, /ADMIN_PROVIDER = API_V1_PREFIX \+ "\/admin\/weather\/provider"/);
});

test('Weather: requests go through the shared API client, never fetch or the retired browser client', () => {
    const api = read('src/features/weather/api/weather.api.ts');
    assert.match(api, /from '@\/lib\/api'/);
    assert.match(api, /API_ROUTES\.weather\.forecast/);
    for (const file of [...weatherFiles('api'), ...weatherFiles('hooks'), ...weatherFiles('components')]) {
        assert.doesNotMatch(read(file), /\bfetch\s*\(/, file);
    }
    assert.match(read('src/features/missions/hooks/useSiteWeather.ts'), /useMissionWeather/);
    assert.doesNotMatch(read('src/features/missions/hooks/useSiteWeather.ts'), /external\/weather/);
});

test('Weather: UI follows the design system (no green, no pill badges)', () => {
    for (const file of [...weatherFiles('components'), ...weatherFiles('utils')]) {
        const source = read(file);
        assert.doesNotMatch(source, /\b(emerald|green|teal)-\d/, file);
        assert.doesNotMatch(source, /rounded-full/, file);
    }
    const tones = read('src/features/weather/utils/clearance.ts');
    assert.match(tones, /GO: 'bg-sky-50 text-uav-blue border-sky-200'/);
    assert.match(tones, /CAUTION: 'bg-amber-50 text-amber-800 border-amber-200'/);
    assert.match(tones, /NO_GO: 'bg-red-50 text-danger border-red-200'/);
});

test('Weather: every locale carries the same weather, error, label and alert keys', () => {
    const flat = (value, prefix = '') => Object.entries(value).flatMap(([key, child]) =>
        child && typeof child === 'object' ? flat(child, `${prefix}${key}.`) : [`${prefix}${key}`]);
    const keys = locale => ({
        weather: flat(json(`src/messages/${locale}.json`).weather).sort(),
        apiError: json(`src/messages/sections/opsMissions/${locale}.json`).opsMissions.apiErrors.MISSION_WEATHER_UNSAFE,
        alert: json(`src/messages/sections/adminPlatform/${locale}.json`).adminPlatform.alerts.messages.MISSION_WEATHER_HAZARD,
        labels: Object.keys(json(`src/messages/sections/adminPlatform/${locale}.json`).adminPlatform.settings.labels).filter(k => k.startsWith('uav_safety_')).sort(),
    });
    const vi = keys('vi');
    for (const locale of ['en', 'ja']) {
        const other = keys(locale);
        assert.deepEqual(other.weather, vi.weather, `${locale} weather keys`);
        assert.deepEqual(other.labels, vi.labels, `${locale} safety labels`);
        assert.ok(other.apiError && other.alert, locale);
    }
    for (const code of ['WIND_LIMIT_EXCEEDED', 'WIND_GUST_EXCEEDED', 'PRECIPITATION_UNSAFE', 'VISIBILITY_TOO_LOW', 'GEOMAGNETIC_STORM',
        'WIND_NEAR_LIMIT', 'WIND_GUST_HIGH', 'RAIN_PROBABILITY_HIGH', 'VISIBILITY_MODERATE', 'KP_ELEVATED',
        'WEATHER_SOURCE_UNAVAILABLE', 'FORECAST_OUT_OF_RANGE', 'MISSION_LOCATION_MISSING']) {
        assert.ok(vi.weather.includes(`preflight.reasons.${code}`), code);
    }
    for (const level of ['GO', 'CAUTION', 'NO_GO', 'UNAVAILABLE']) assert.ok(vi.weather.includes(`preflight.clearance.${level}`), level);
    assert.deepEqual(vi.labels.filter(k => /gust|visibility|precipitation|kp/.test(k)),
        ['uav_safety_max_kp_index', 'uav_safety_max_precipitation_mm', 'uav_safety_max_wind_gust_limit', 'uav_safety_min_visibility_meters']);
    assert.match(read('src/features/missions/components/operations/OperationsMissionDetail.tsx'), /'MISSION_WEATHER_UNSAFE'/);
});

test('Weather: applying a recommended window keeps the flight duration and the requested date', async () => {
    const {applyFlightWindow} = await load('src/features/weather/utils/flight-window.ts', s => s.replace(/^import type .*$/m, ''));
    const form = {startTime: '2026-10-31T13:00', expectedEndTime: '2026-10-31T14:30', requestedDate: '2026-10-31', title: 'x'};
    assert.deepEqual(applyFlightWindow(form, '2026-11-01T07:00'),
        {...form, startTime: '2026-11-01T07:00', expectedEndTime: '2026-11-01T08:30', requestedDate: '2026-11-01'});
    assert.equal(applyFlightWindow({...form, expectedEndTime: ''}, '2026-11-01T09:00').expectedEndTime, '2026-11-01T10:00');
    assert.equal(applyFlightWindow(form, 'not a time'), form);
});

test('Weather: the three portals render the shared preflight card', () => {
    assert.match(read('src/features/missions/components/customer/SiteWeather.tsx'), /PreflightWeatherCard/);
    assert.match(read('src/features/missions/components/customer/CustomerMissionCreate.tsx'), /MissionWeatherAdvisor/);
    assert.match(read('src/features/missions/components/customer/CustomerMissionEdit.tsx'), /MissionWeatherAdvisor/);
    assert.match(read('src/features/missions/components/operations/OperationsMissionDetail.tsx'), /PreflightWeatherCard/);
    assert.match(read('src/features/stations/components/StationPanel.tsx'), /useStationsWeather\(\)/);
    assert.match(read('src/features/settings/components/AdminSettingsPanel.tsx'), /WeatherProviderSettingsSection/);
    assert.doesNotMatch(read('src/features/weather/types/weather.types.ts'), /apiKeyCipher/);
});
