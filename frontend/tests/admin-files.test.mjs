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

const files = await loadTs('../src/features/files/utils/files.ts');
const admin = async locale => JSON.parse(await readFile(new URL(`../src/messages/sections/admin/${locale}.json`, import.meta.url), 'utf8')).admin;

const file = (over = {}) => ({
    id: 'TRAINING:1', module: 'TRAINING', fileName: 'a.pdf', contentType: 'application/pdf', kind: 'DOCUMENT',
    sizeBytes: 100, storageKey: 'training/a.pdf', owner: null, linkedTo: null, status: 'UNUSED', deletable: true,
    createdAt: '2026-10-01T10:00:00', ...over,
});

test('Admin files: list query string skips empty filters and carries sort', () => {
    const base = {page: 0, size: 20, sort: 'createdAt', direction: 'desc'};
    assert.equal(files.fileListSearch(base), 'page=0&size=20&sort=createdAt%2Cdesc');
    const full = new URLSearchParams(files.fileListSearch({
        ...base, module: 'TRAINING', type: 'VIDEO', status: 'UNUSED', q: '  bay an toàn ', page: 2, sort: 'sizeBytes', direction: 'asc',
    }));
    assert.equal(full.get('module'), 'TRAINING');
    assert.equal(full.get('type'), 'VIDEO');
    assert.equal(full.get('status'), 'UNUSED');
    assert.equal(full.get('q'), 'bay an toàn');
    assert.equal(full.get('page'), '2');
    assert.equal(full.get('sort'), 'sizeBytes,asc');
    assert.equal(new URLSearchParams(files.fileListSearch({...base, q: '   ', page: -3})).has('q'), false);
    assert.equal(new URLSearchParams(files.fileListSearch({...base, page: -3})).get('page'), '0');
});

test('Admin files: sorting flips the active column and starts others descending', () => {
    assert.deepEqual(files.nextSort({sort: 'createdAt', direction: 'desc'}, 'createdAt'), {sort: 'createdAt', direction: 'asc'});
    assert.deepEqual(files.nextSort({sort: 'createdAt', direction: 'asc'}, 'createdAt'), {sort: 'createdAt', direction: 'desc'});
    assert.deepEqual(files.nextSort({sort: 'createdAt', direction: 'asc'}, 'sizeBytes'), {sort: 'sizeBytes', direction: 'desc'});
});

test('Admin files: only unused or pending non-mission files can be deleted', () => {
    assert.equal(files.canDeleteFile(file()), true);
    assert.equal(files.canDeleteFile(file({status: 'PENDING'})), true);
    assert.equal(files.canDeleteFile(file({status: 'IN_USE', deletable: true})), false);
    assert.equal(files.canDeleteFile(file({module: 'MISSION_MEDIA', id: 'MISSION_MEDIA:4'})), false);
    // The server withholds deletion of a training upload that may still be in flight.
    assert.equal(files.canDeleteFile(file({status: 'PENDING', deletable: false})), false);
});

test('Admin files: cleanup picks deletable files, largest first, and totals their size', () => {
    const list = [
        file({id: 'TRAINING:1', sizeBytes: 10}),
        file({id: 'UNLINKED:2', module: 'UNLINKED', sizeBytes: 500}),
        file({id: 'MISSION_MEDIA:3', module: 'MISSION_MEDIA', sizeBytes: 9_000}),
        file({id: 'TRAINING:4', status: 'IN_USE', sizeBytes: 8_000}),
        file({id: 'AVATAR:5', module: 'AVATAR', status: 'PENDING', sizeBytes: 500}),
    ];
    const picked = files.cleanupCandidates(list);
    assert.deepEqual(picked.map(f => f.id), ['AVATAR:5', 'UNLINKED:2', 'TRAINING:1']);
    assert.equal(files.totalBytes(picked), 1010);
    assert.equal(files.totalBytes([{sizeBytes: Number.NaN}, {sizeBytes: 5}]), 5);
    assert.equal(list[0].id, 'TRAINING:1', 'the input order is untouched');
});

test('Admin files: linked items open the page that shows them', () => {
    assert.equal(files.linkHref({type: 'MISSION', id: 7, label: 'MSN-1', slug: null}), '/operations/missions/7');
    assert.equal(files.linkHref({type: 'COURSE', id: 3, label: 'Bay', slug: 'bay an toan'}), '/admin/training/learn/bay%20an%20toan');
    assert.equal(files.linkHref({type: 'COURSE', id: 3, label: 'Bay', slug: null}), null);
    assert.equal(files.linkHref({type: 'USER', id: 9, label: 'An', slug: null}), '/admin/users/9');
    assert.equal(files.linkHref({type: 'MISSION', id: null, label: 'x', slug: null}), null);
    assert.equal(files.linkHref({type: 'SOMETHING', id: 1, label: 'x', slug: null}), null);
    assert.equal(files.linkHref(null), null);
});

test('Admin files: sizes and shares are readable and safe', () => {
    assert.equal(files.formatFileSize(0), '0 B');
    assert.equal(files.formatFileSize(1023), '1023 B');
    assert.equal(files.formatFileSize(1536), '1.5 KB');
    assert.equal(files.formatFileSize(5 * 1024 * 1024 * 1024), '5 GB');
    assert.equal(files.formatFileSize(null), '—');
    assert.equal(files.formatFileSize(-1), '—');
    assert.equal(files.sharePercent(50, 200), 25);
    assert.equal(files.sharePercent(1, 3), 33.3);
    assert.equal(files.sharePercent(5, 0), 0);
    assert.equal(files.sharePercent(500, 100), 100);
});

test('Admin files: every module, kind and status has a label in vi, en and ja', async () => {
    const [vi, en, ja] = await Promise.all(['vi', 'en', 'ja'].map(admin));
    const keys = (node, prefix = '') => Object.entries(node).flatMap(([k, v]) =>
        v && typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]).sort();
    assert.deepEqual(keys(en.files), keys(vi.files));
    assert.deepEqual(keys(ja.files), keys(vi.files));
    for (const m of files.FILE_MODULES) assert.ok(vi.files.module[m], m);
    for (const k of files.FILE_KINDS) assert.ok(vi.files.kind[k], k);
    for (const s of files.FILE_STATUSES) assert.ok(vi.files.status[s], s);
    assert.equal(vi.files.title, 'Quản lý tệp');
});

test('Admin files: the page sits in the infrastructure group behind PERMISSION_MANAGE', async () => {
    const routes = await readFile(new URL('../src/components/layout/sidebar-routes.ts', import.meta.url), 'utf8');
    assert.match(routes, /href: '\/admin\/files',\s*key: 'files',\s*group: 'infrastructure',\s*icon: FolderOpen,\s*permission: 'PERMISSION_MANAGE'/);
    const page = await readFile(new URL('../src/app/(admin)/admin/(portal)/files/page.tsx', import.meta.url), 'utf8');
    assert.match(page, /permission="PERMISSION_MANAGE"/);
    for (const locale of ['vi', 'en', 'ja']) {
        const root = JSON.parse(await readFile(new URL(`../src/messages/${locale}.json`, import.meta.url), 'utf8'));
        assert.ok(root.adminNav.files, `adminNav.files in ${locale}`);
    }
});
