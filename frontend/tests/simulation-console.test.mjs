import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (path) => readFileSync(`${root}${path}`, 'utf8');

test('simulation console calls the backend simulation routes through the shared API client', () => {
    const routes = read('src/lib/api/routes.ts');
    assert.match(routes, /sessions: '\/api\/v1\/simulation\/sessions'/);
    assert.match(routes, /\/api\/v1\/simulation\/sessions\/\$\{uavId\}\/commands/);
    assert.match(routes, /surveyPlan: '\/api\/v1\/simulation\/survey-plan'/);
    const api = read('src/api/simulation/simulation.api.ts');
    assert.match(api, /apiClient\.post<SimulationState>\(API_ROUTES\.simulation\.sessions/);
    assert.doesNotMatch(api, /fetch\(/);
});

test('simulation page is an operations page gated by UAV_VIEW, flying needs UAV_UPDATE', () => {
    const page = read('src/app/(operations)/operations/(portal)/simulation/page.tsx');
    assert.match(page, /permission="UAV_VIEW"/);
    assert.match(read('src/config/sidebar-routes.ts'), /href: '\/operations\/simulation',[\s\S]{0,120}permission: 'UAV_VIEW'/);
    assert.match(read('src/components/simulation/SimulationConsole.tsx'), /can\('UAV_UPDATE'\)/);
});

test('simulation strings exist with the same keys in every locale', () => {
    const keys = (o, prefix = '') => Object.entries(o).flatMap(([k, v]) =>
        v && typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]).sort();
    const [vi, en, ja] = ['vi', 'en', 'ja'].map(l => JSON.parse(read(`src/messages/${l}.json`)));
    assert.deepEqual(keys(en.simulation), keys(vi.simulation));
    assert.deepEqual(keys(ja.simulation), keys(vi.simulation));
    for (const c of [vi, en, ja]) assert.ok(c.operationsNav.simulation);
    for (const mode of ['TAKEOFF', 'MISSION', 'HOLD', 'RETURN_TO_HOME', 'LANDING', 'LANDED'])
        assert.ok(vi.simulation.modes[mode], mode);
});
