import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import test from 'node:test';

registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier === '@react-native-async-storage/async-storage') {
            return {
                url: 'data:text/javascript,' + encodeURIComponent(
                    'export const mem = globalThis.__asyncMem = new Map();' +
                    'export default { getItem: async k => mem.get(k) ?? null, setItem: async (k, v) => { mem.set(k, v); }, removeItem: async k => { mem.delete(k); } };',
                ),
                shortCircuit: true,
            };
        }
        if (specifier.startsWith('@/')) return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
        return nextResolve(specifier, context);
    },
});

const {QueryClient} = await import('@tanstack/react-query');
const cache = await import('../src/lib/storage/query-cache.ts');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

test('query cache: only this user\'s non-sensitive session queries are persisted', () => {
    const ok = {status: 'success'};
    assert.equal(cache.shouldPersistQuery({queryKey: ['session', 7, 'missions', 'list', 0], state: ok}, 7), true);
    assert.equal(cache.shouldPersistQuery({queryKey: ['session', 8, 'missions'], state: ok}, 7), false);
    assert.equal(cache.shouldPersistQuery({queryKey: ['session', 7, 'support'], state: ok}, 7), false);
    assert.equal(cache.shouldPersistQuery({queryKey: ['session', 7, 'billing'], state: ok}, 7), false);
    assert.equal(cache.shouldPersistQuery({queryKey: ['session', 7, 'missions'], state: {status: 'error'}}, 7), false);
    assert.equal(cache.shouldPersistQuery({queryKey: ['profile', 7], state: ok}, 7), false);
});

test('query cache: saved per user, restored on launch, removed on sign-out', async () => {
    const first = new QueryClient();
    const stop = cache.persistQueryCache(first, 7);
    first.setQueryData(['session', 7, 'missions', 'list', 0], {items: [1, 2]});
    first.setQueryData(['session', 7, 'support'], {secret: true});
    await wait(2100);
    stop();
    assert.ok(globalThis.__asyncMem.has('uav-pas:query-cache:7'));

    const next = new QueryClient();
    await cache.restoreQueryCache(next, 7);
    assert.deepEqual(next.getQueryData(['session', 7, 'missions', 'list', 0]), {items: [1, 2]});
    assert.equal(next.getQueryData(['session', 7, 'support']), undefined);

    const other = new QueryClient();
    await cache.restoreQueryCache(other, 8);
    assert.equal(other.getQueryData(['session', 7, 'missions', 'list', 0]), undefined);

    await cache.clearQueryCache(7);
    assert.equal(globalThis.__asyncMem.has('uav-pas:query-cache:7'), false);
});
