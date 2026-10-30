import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import {readFile} from 'node:fs/promises';

async function loadTs(path) {
    const source = await readFile(new URL(path, import.meta.url), 'utf8');
    const compiled = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022
        }
    }).outputText;
    return import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
}

const {percentChange, stackMonths, earningCodes, axisTicks, clampPercent, MISSION_KEY} =
    await loadTs('../src/features/billing/utils/plan-stats.ts');

const readJson = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8')).admin;

test('Plan stats: percent change against last month', () => {
    assert.equal(percentChange(150, 100), 50);
    assert.equal(percentChange(50, 100), -50);
    assert.equal(percentChange(100, 100), 0);
    assert.equal(percentChange(1, 3), -66.7);
    // No baseline: the UI says so instead of showing +Infinity%.
    assert.equal(percentChange(100, 0), null);
    assert.equal(percentChange(0, 0), null);
    assert.equal(percentChange(Number.NaN, 10), null);
});

test('Plan stats: months stack plans bottom-up with mission revenue on top', () => {
    const months = [
        {month: '2026-01', byPlan: {BASIC: 0, PRO: 300000, ENTERPRISE: 0}, missionRevenue: 0},
        {month: '2026-02', byPlan: {BASIC: 0, PRO: 0, ENTERPRISE: 0}, missionRevenue: 0},
        {month: '2026-03', byPlan: {BASIC: 0, PRO: 600000, ENTERPRISE: 100000}, missionRevenue: 150000},
    ];
    const codes = ['BASIC', 'PRO', 'ENTERPRISE'];
    const columns = stackMonths(months, codes);
    assert.deepEqual(columns.map(c => c.total), [300000, 0, 850000]);
    // An empty month keeps its slot with no segments.
    assert.deepEqual(columns[1], {month: '2026-02', total: 0, segments: []});
    assert.deepEqual(columns[2].segments, [
        {key: 'PRO', value: 600000, offset: 0},
        {key: 'ENTERPRISE', value: 100000, offset: 600000},
        {key: MISSION_KEY, value: 150000, offset: 700000},
    ]);
    // A code missing from byPlan counts as zero.
    assert.equal(stackMonths([{month: '2026-04', byPlan: {}, missionRevenue: 5}], ['PRO'])[0].total, 5);
});

test('Plan stats: legend keeps only plans that earned in the window, in catalog order', () => {
    const months = [
        {month: '2026-01', byPlan: {BASIC: 0, PRO: 1, LEGACY: 0, ENTERPRISE: 2}, missionRevenue: 0},
        {month: '2026-02', byPlan: {BASIC: 0, PRO: 0, LEGACY: 0, ENTERPRISE: 0}, missionRevenue: 9},
    ];
    assert.deepEqual(earningCodes(months, ['BASIC', 'PRO', 'LEGACY', 'ENTERPRISE']), ['PRO', 'ENTERPRISE']);
});

test('Plan stats: axis ticks round up past the peak', () => {
    assert.deepEqual(axisTicks(0), [0, 1]);
    assert.deepEqual(axisTicks(850000), [0, 250000, 500000, 750000, 1000000]);
    assert.deepEqual(axisTicks(100), [0, 25, 50, 75, 100]);
    const ticks = axisTicks(1234567);
    assert.ok(ticks[ticks.length - 1] >= 1234567);
});

test('Plan stats: bar widths are clamped, labels keep the real value', () => {
    assert.equal(clampPercent(135), 100);
    assert.equal(clampPercent(-4), 0);
    assert.equal(clampPercent(42.5), 42.5);
    assert.equal(clampPercent(Number.NaN), 0);
});

test('Plan stats: every admin locale carries the statistics keys', async () => {
    const [vi, en, ja] = await Promise.all(['vi', 'en', 'ja'].map(l => readJson(`../src/messages/sections/admin/${l}.json`)));
    const keys = catalog => {
        const out = [];
        const walk = (node, prefix) => Object.entries(node).forEach(([k, v]) =>
            typeof v === 'object' ? walk(v, `${prefix}${k}.`) : out.push(`${prefix}${k}`));
        walk(catalog.plans, '');
        return out.sort();
    };
    assert.deepEqual(keys(en), keys(vi));
    assert.deepEqual(keys(ja), keys(vi));
    assert.equal(vi.plans.stats.kpi.customers, 'Khách hàng');
    assert.equal(vi.plans.stats.kpi.revenue, 'Doanh thu tháng này');
    assert.equal(vi.plans.stats.kpi.pending, 'Hóa đơn chờ thanh toán');
    assert.equal(vi.plans.stats.nearLimit.title, 'Khách sắp hết giờ bay');
});

test('Plan stats: endpoint, client and query wiring', async () => {
    const routes = await readFile(new URL('../src/lib/api/routes.ts', import.meta.url), 'utf8');
    assert.match(routes, /adminPlanStats: \(months: number\) => `\/api\/v1\/billing\/admin\/plans\/stats\?months=\$\{months\}`/);
    const manager = await readFile(new URL('../src/features/billing/components/AdminPlansManager.tsx', import.meta.url), 'utf8');
    // The stats key sits under the prefix every plan mutation invalidates.
    assert.match(manager, /usePlanStats\(months\)/);
    const hooks = await readFile(new URL('../src/features/billing/hooks/useBillingAdmin.ts', import.meta.url), 'utf8');
    assert.match(hooks, /queryKey: billingKeys\.planStats\(user\?\.id, months\)/);
    assert.match(hooks, /invalidateQueries\(\{queryKey: billingKeys\.plans\(user\?\.id\)\}\)/);
    const stats = await readFile(new URL('../src/features/billing/components/AdminPlanStats.tsx', import.meta.url), 'utf8');
    assert.doesNotMatch(stats + manager, /\b(?:bg|text|border|ring)-(?:blue|sky|indigo)-/, 'no blue classes');
    assert.match(stats, /FilterSelect/);
});
