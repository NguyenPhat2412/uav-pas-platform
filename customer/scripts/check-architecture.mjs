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
for (const retired of ['apps', 'packages', 'legacy', 'tsconfig.base.json', 'src/features']) {
    assert.ok(!existsSync(path.join(root, retired)), `Retired architecture must stay removed: ${retired}`);
}
const manifest = JSON.parse(read('package.json'));
assert.equal(manifest.workspaces, undefined, 'The frontend is one application');
assert.ok(!Object.keys(manifest.dependencies).some(name => name.startsWith('@uav/')));
for (const banned of ['react-hook-form', '@hookform/resolvers']) {
    assert.ok(!(banned in (manifest.dependencies ?? {})) && !(banned in (manifest.devDependencies ?? {})), `Unused form library must stay removed: ${banned}`);
}
const lock = JSON.parse(read('package-lock.json'));
assert.ok(!Object.keys(lock.packages).some(name => /^(apps|packages|legacy)\//.test(name)));
const files = walk(path.join(root, 'src'));
const cssFiles = files.filter(name => name.endsWith('.css')).map(name => path.relative(root, name).replaceAll('\\', '/'));
assert.deepEqual(cssFiles, ['src/styles/globals.css'], `Only src/styles/globals.css is allowed in 100% Tailwind architecture, found: ${cssFiles.join(', ')}`);
let routes = 0;
// Layers sit side by side under src/, each split per feature: api/<feature>, hooks/<feature>, components/<feature>,
// types/<feature>, utils/<feature> (plus forms/ and content/). UI (app/, components/) reaches the server only through
// hooks: api/*/*.api.ts holds the requests, hooks/*/ the React Query queries and mutations.
const dataLayer = [];
const formLayer = [];
const isUi = file => /\/src\/(app|components)\//.test(file);
const isForm = file => /\/src\/forms\//.test(file);
const clientOnly = new Set(['apiClient', 'apiRequest', 'request']);
for (const file of files.filter(name => /\.[cm]?[jt]sx?$/.test(name))) {
    const source = readFileSync(file, 'utf8');
    if (isForm(file)) {
        assert.ok(file.endsWith('.ts'), `${file}: src/forms modules must be pure .ts files (no JSX)`);
    }
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    const visit = node => {
        if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
            const specifier = node.moduleSpecifier.text;
            assert.ok(!specifier.startsWith('@uav/'), `${file}: retired workspace import`);
            assert.ok(!/(?:^|\/)(?:apps|packages|legacy)\//.test(specifier), `${file}: retired source import`);
            if (ts.isImportDeclaration(node) && node.importClause && !node.importClause.isTypeOnly) {
                const clause = node.importClause;
                const named = clause.namedBindings && ts.isNamedImports(clause.namedBindings) ? clause.namedBindings.elements : [];
                const values = [...(clause.name ? [clause.name.text] : []), ...named.filter(e => !e.isTypeOnly).map(e => (e.propertyName ?? e.name).text)];
                const rel = path.relative(root, file);
                if (isUi(file)) {
                    if (specifier === '@tanstack/react-query' && values.length) dataLayer.push(`${rel}: React Query belongs in a feature hook (${values.join(', ')})`);
                    if (/^@\/api\//.test(specifier) && values.length) dataLayer.push(`${rel}: call ${values.join(', ')} through a feature hook`);
                    if (specifier === '@/lib/api' && values.some(v => clientOnly.has(v))) dataLayer.push(`${rel}: the API client is used only by api/*`);
                }
                if (isForm(file) && values.length) {
                    if (/^(react|react-dom|next\/|@tanstack\/react-query|react-hook-form|@hookform\/)/.test(specifier) || /^@\/(api|hooks|components|providers)\//.test(specifier) || specifier === '@/lib/api') {
                        formLayer.push(`${rel}: src/forms must stay pure TypeScript without runtime ${specifier} (${values.join(', ')})`);
                    }
                }
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(tree);
    // Request modules hold requests only; their data shapes live in types/<feature>/*.types.ts.
    // A `typeof someService` alias is the one exception, since it can only be derived beside the service.
    if (/\/src\/api\//.test(file)) {
        const declared = [...source.matchAll(/^export (?:interface|type) (\w+)(?![^\n]*=\s*typeof\b)/gm)].map(m => m[1]);
        assert.deepEqual(declared, [], `${file}: move ${declared.join(', ')} to src/types/<feature>/`);
    }
    if (/\/src\/(api|components|content|forms|hooks|types|utils)\//.test(file)) {
        assert.doesNotMatch(source, /\bfetch\s*\(/, `${file}: use the central API client`);
        assert.ok(!file.includes('/pages/'), `${file}: feature pages belong in components/ or app/`);
    }
    assert.ok(source.trim().split('\n').length > 1, `${file}: 1-line proxy files are not allowed`);
    if (file.includes('/src/app/') && file.endsWith('/page.tsx')) {
        routes++;
        assert.match(source, /from ['"]@\/(api|components|content|forms|hooks|types|utils)\/[a-z-]+\//, file);
        assert.doesNotMatch(source, /^\s*export\s+\{\s*default\b/, `${file}: route pages must be real components, not 1-line re-exports`);
        assert.doesNotMatch(source, /useState|useQuery|apiClient/, `${file}: keep route entries thin`);
    }
}
for (const forbiddenGroup of ["(operations)","(admin)"]) {
    assert.ok(!existsSync(path.join(root, 'src/app', forbiddenGroup)), `Portal isolation violated: ${forbiddenGroup} belongs to another top-level portal`);
}
assert.ok(routes >= 20, 'All customer portal routes must remain available');
assert.deepEqual(dataLayer, [], `UI must use feature hooks for server data:\n${dataLayer.join('\n')}`);
assert.deepEqual(formLayer, [], `Form modules must stay pure TypeScript:\n${formLayer.join('\n')}`);
console.log(`Architecture OK: one application, ${routes} feature route entries, ${files.length} source files`);
