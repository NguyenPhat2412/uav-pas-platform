import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import {readFile} from 'node:fs/promises';

const source = (await readFile(new URL('../src/components/shared/DevtoolsGuard.tsx', import.meta.url), 'utf8'))
    .replace(/^'use client';\n/, '').replace(/^import .*\n/gm, '').replace(/export function DevtoolsGuard[\s\S]*$/, '');
const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}}).outputText;
const {isDevtoolsShortcut} = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
const key = (code, mods = {}) => ({key: code.startsWith('Key') ? code.slice(3).toLowerCase() : code, code, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...mods});

test('devtools guard: the developer-tool and view-source shortcuts are recognised on Windows and macOS', () => {
    assert.equal(isDevtoolsShortcut(key('F12')), true);
    for (const letter of ['KeyI', 'KeyJ', 'KeyC', 'KeyK']) assert.equal(isDevtoolsShortcut(key(letter, {ctrlKey: true, shiftKey: true})), true, letter);
    assert.equal(isDevtoolsShortcut(key('KeyU', {ctrlKey: true})), true);
    for (const letter of ['KeyI', 'KeyJ', 'KeyC', 'KeyU']) assert.equal(isDevtoolsShortcut(key(letter, {metaKey: true, altKey: true})), true, letter);
    assert.equal(isDevtoolsShortcut(key('KeyC', {metaKey: true, shiftKey: true})), true);
});

test('devtools guard: everyday shortcuts keep working', () => {
    assert.equal(isDevtoolsShortcut(key('KeyC', {ctrlKey: true})), false, 'copy');
    assert.equal(isDevtoolsShortcut(key('KeyC', {metaKey: true})), false, 'copy on macOS');
    assert.equal(isDevtoolsShortcut(key('KeyB', {ctrlKey: true})), false, 'sidebar toggle');
    assert.equal(isDevtoolsShortcut(key('KeyK', {metaKey: true})), false, 'page search');
    assert.equal(isDevtoolsShortcut(key('KeyI', {ctrlKey: true})), false, 'italic');
    assert.equal(isDevtoolsShortcut(key('F5')), false, 'reload');
});
