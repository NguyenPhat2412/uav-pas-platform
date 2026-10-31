import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import test from 'node:test';

let ts;
try {
    ts = createRequire(import.meta.url)('typescript');
} catch {
    ts = createRequire(new URL('../package.json', import.meta.url))('typescript');
}
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const compile = source => ts.transpileModule(source, {
    compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022
    }
}).outputText;
const load = source => import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const {API_ROUTES} = await load(compile(read('src/lib/api/routes.ts')));

// Compare actual consumer requests to controller mappings, so changing a wrong shared literal
// and its static assertion together cannot conceal a nonexistent business endpoint.
// Controllers map their base path through the backend's central ApiRoutes constants.
const javaRoutes = (() => {
    const source = read('../backend/src/main/java/com/uav/platform/config/routes/ApiRoutes.java');
    const constants = new Map();
    let scope = '';
    for (const line of source.split('\n')) {
        const nested = line.match(/^\s{4}public static final class (\w+)/);
        if (nested) scope = nested[1];
        else if (/^\s{4}\}/.test(line)) scope = '';
        const constant = line.match(/public static final String (\w+)\s*=\s*(.+);/);
        if (constant) constants.set(scope ? `${scope}.${constant[1]}` : constant[1], {scope, expr: constant[2]});
    }
    const value = (name, scope = '') => {
        const entry = constants.get(scope && !name.includes('.') ? `${scope}.${name}` : name) ?? constants.get(name);
        assert.ok(entry, `ApiRoutes.${name} must exist`);
        return entry.expr.split('+').map(part => part.trim()).map(part =>
            part.startsWith('"') ? JSON.parse(part) : value(part, entry.scope)).join('');
    };
    return expression => value(expression.replace(/^ApiRoutes\./, ''));
})();

function controllerGet(controller, method) {
    const source = read(`../backend/src/main/java/com/uav/platform/controller/${controller}`);
    const mapping = source.match(/^@RequestMapping\((.+)\)$/m)?.[1];
    const base = mapping?.startsWith('"') ? JSON.parse(mapping) : mapping && javaRoutes(mapping);
    const declaration = source.indexOf(` ${method}(`);
    assert.ok(declaration >= 0, `${method} controller method must exist`);
    const annotation = source.slice(source.lastIndexOf('@GetMapping(', declaration), declaration);
    const path = annotation.match(/@GetMapping\((?:value\s*=\s*)?"([^"]+)"/)?.[1];
    assert.ok(base && path, `${method} must have a concrete GET mapping`);
    return base + path;
}

async function service(path, exportedName) {
    const calls = [];
    globalThis.__businessRouteContract = {
        API_ROUTES, apiClient: {
            get: async (endpoint, options) => {
                calls.push({endpoint, options});
                return {};
            }
        }
    };
    const compiled = compile(read(path)).replace(/^import .*?;\n/gm, '');
    const loaded = await load('const {API_ROUTES,apiClient}=globalThis.__businessRouteContract;\n' + compiled);
    return {instance: loaded[exportedName], calls};
}

test('customer quota consumer calls the controller quota route and forwards cancellation', async () => {
    const {instance, calls} = await service('src/api/billing/customer-billing.api.ts', 'customerBillingService');
    const signal = new AbortController().signal;
    await instance.quota(signal);
    assert.equal(calls[0].endpoint, controllerGet('billing/BillingController.java', 'getQuota'));
    assert.equal(calls[0].options.signal, signal);
});

test('admin summary and CSV consumers call their actual role-protected report endpoints', async () => {
    const {instance, calls} = await service('src/api/reporting/reports.api.ts', 'reportsService');
    await instance.operationsReport();
    assert.equal(calls[0].endpoint, controllerGet('reporting/ReportController.java', 'getOperationsSummary'));
    assert.equal(API_ROUTES.reports.exportOperationsCsv, controllerGet('reporting/ReportController.java', 'exportCsv'));
    assert.equal(typeof instance.exportOperationsCsv, 'function');
    await instance.exportOperationsCsv();
    assert.equal(calls[1].endpoint, controllerGet('reporting/ReportController.java', 'exportCsv'));
});
