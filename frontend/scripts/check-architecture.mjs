import assert from 'node:assert/strict';
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = file => readFileSync(path.join(root, file), 'utf8');
const walk = directory => readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
    if (entry.name.startsWith('._')) return [];
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
});
for (const retired of ['apps', 'packages', 'legacy', 'tsconfig.base.json']) {
    assert.ok(!existsSync(path.join(root, retired)), `Retired architecture must stay removed: ${retired}`);
}
const manifest = JSON.parse(read('package.json'));
assert.equal(manifest.workspaces, undefined, 'The frontend is one application');
assert.ok(!Object.keys(manifest.dependencies).some(name => name.startsWith('@uav/')));
const lock = JSON.parse(read('package-lock.json'));
assert.ok(!Object.keys(lock.packages).some(name => /^(apps|packages|legacy)\//.test(name)));
const files = walk(path.join(root, 'src'));
let routes = 0;
for (const file of files.filter(name => /\.[cm]?[jt]sx?$/.test(name))) {
    const source = readFileSync(file, 'utf8');
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    const visit = node => {
        if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
            const specifier = node.moduleSpecifier.text;
            assert.ok(!specifier.startsWith('@uav/'), `${file}: retired workspace import`);
            assert.ok(!/(?:^|\/)(?:apps|packages|legacy)\//.test(specifier), `${file}: retired source import`);
        }
        ts.forEachChild(node, visit);
    };
    visit(tree);
    if (file.includes('/src/features/')) assert.doesNotMatch(source, /\bfetch\s*\(/, `${file}: use the central API client`);
    if (file.includes('/src/app/') && file.endsWith('/page.tsx')) {
        routes++;
        assert.match(source, /export \{[^}]*default[^}]*\} from ['"]@\/features\//, file);
        assert.doesNotMatch(source, /useState|useQuery|apiClient/, `${file}: keep route entries thin`);
    }
}
assert.ok(routes >= 56, 'All migrated routes must remain available');
console.log(`Architecture OK: one application, ${routes} feature route entries, ${files.length} source files`);
