import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const code = await readFile(new URL('../packages/ui/src/navigation.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { activeDestination } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const items = [{href:'/overview'}, {href:'/dispatch/missions'}, {href:'/users'}, {href:'/users/permissions'}];
test('nested dispatch routes keep their navigation and breadcrumb despite a legacy resource hint', () => {
  for (const path of ['/dispatch/missions','/dispatch/missions/42','/dispatch/missions/42/']) assert.equal(activeDestination(items,path,'dispatch').href,'/dispatch/missions');
});
test('matches complete segments and prefers the most specific visible destination', () => {
  assert.equal(activeDestination(items,'/users/permissions/3').href,'/users/permissions');
  assert.equal(activeDestination(items,'/users-other'),undefined);
  assert.equal(activeDestination(items.filter(i=>i.href!=='/dispatch/missions'),'/dispatch/missions','dispatch'),undefined);
  assert.equal(activeDestination(items,'/users/2','overview').href,'/users');
});
test('resource fallback supports aliased pages and root does not swallow every destination', () => {
  assert.equal(activeDestination(items,'/missions/2','dispatch').href,'/dispatch/missions');
  assert.equal(activeDestination([{href:'/'},...items],'/users/3').href,'/users');
  assert.equal(activeDestination([{href:'/'},...items],'/').href,'/');
  assert.equal(activeDestination([{href:'/'},...items],'/missing'),undefined);
});
