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

const {
    closeOtherWorkspaceTabs,
    closeWorkspaceTab,
    openWorkspaceTab,
    readWorkspaceTabs,
    withPinnedTab,
} = await loadTs('../src/lib/workspace-tabs.ts');

const HOME = '/admin/dashboard';
const tab = (href, path = href) => ({href, path});
const hrefs = tabs => tabs.map(item => item.href);

test('workspace tabs: the pinned home tab is always first, once', () => {
    assert.deepEqual(hrefs(withPinnedTab([], HOME)), [HOME]);
    assert.deepEqual(hrefs(withPinnedTab([tab('/admin/users'), tab(HOME)], HOME)), [HOME, '/admin/users']);
    const ordered = [tab(HOME), tab('/admin/users')];
    assert.equal(withPinnedTab(ordered, HOME), ordered, 'unchanged list is returned as is');
});

test('workspace tabs: visiting a page opens its tab last, or moves the existing tab to the new path', () => {
    const tabs = [tab(HOME), tab('/admin/users')];
    assert.deepEqual(hrefs(openWorkspaceTab(tabs, tab('/admin/alerts'), HOME)), [HOME, '/admin/users', '/admin/alerts']);
    assert.equal(openWorkspaceTab(tabs, tab('/admin/users'), HOME), tabs, 'revisiting the same path changes nothing');
    const moved = openWorkspaceTab(tabs, tab('/admin/users', '/admin/users/42'), HOME);
    assert.deepEqual(moved[1], tab('/admin/users', '/admin/users/42'));
    assert.equal(moved.length, 2);
});

test('workspace tabs: past the limit the oldest closable tab makes room, never the home tab', () => {
    const tabs = [tab(HOME), tab('/a'), tab('/b')];
    assert.deepEqual(hrefs(openWorkspaceTab(tabs, tab('/c'), HOME, 3)), [HOME, '/b', '/c']);
});

test('workspace tabs: closing the active tab moves to its right neighbour, else its left one', () => {
    const tabs = [tab(HOME), tab('/a'), tab('/b', '/b/7')];
    assert.deepEqual(closeWorkspaceTab(tabs, '/a', '/a', HOME), {tabs: [tab(HOME), tab('/b', '/b/7')], next: '/b/7'});
    assert.deepEqual(closeWorkspaceTab(tabs, '/b', '/b', HOME).next, '/a');
    const background = closeWorkspaceTab(tabs, '/a', '/b', HOME);
    assert.equal(background.next, undefined, 'closing a background tab stays on the page');
    assert.deepEqual(hrefs(background.tabs), [HOME, '/b']);
});

test('workspace tabs: the home tab cannot be closed', () => {
    const tabs = [tab(HOME), tab('/a')];
    assert.equal(closeWorkspaceTab(tabs, HOME, HOME, HOME).tabs, tabs);
});

test('workspace tabs: close others keeps home and the chosen tab; close all keeps home', () => {
    const tabs = [tab(HOME), tab('/a'), tab('/b'), tab('/c')];
    assert.deepEqual(hrefs(closeOtherWorkspaceTabs(tabs, HOME, '/b')), [HOME, '/b']);
    assert.deepEqual(hrefs(closeOtherWorkspaceTabs(tabs, HOME)), [HOME]);
});

test('workspace tabs: saved tabs survive only in a valid shape', () => {
    const store = new Map();
    globalThis.localStorage = {getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value)};
    store.set('k', JSON.stringify([tab('/a'), {href: 1}, 'x', tab('/b', '/b/2')]));
    assert.deepEqual(readWorkspaceTabs('k'), [tab('/a'), tab('/b', '/b/2')]);
    store.set('k', '{broken');
    assert.deepEqual(readWorkspaceTabs('k'), []);
    delete globalThis.localStorage;
    assert.deepEqual(readWorkspaceTabs('k'), [], 'no storage at all is an empty list');
});
