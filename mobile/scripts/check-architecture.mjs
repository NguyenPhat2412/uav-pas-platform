#!/usr/bin/env node
// Layer rules of the iPhone app, mirroring frontend/scripts/check-architecture.mjs:
//   app/ (routes) -> components/ -> hooks/ -> api/ -> lib/api/client
// plus where tokens, storage, HTTP and colours may live. Exits 1 with every violation listed.

import {readdirSync, readFileSync, statSync} from 'node:fs';
import {dirname, join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');

function files(dir) {
    return readdirSync(dir).flatMap(name => {
        const abs = join(dir, name);
        return statSync(abs).isDirectory() ? files(abs) : /\.(ts|tsx)$/.test(name) ? [abs] : [];
    });
}

const IMPORT = /^\s*import\s+(type\s+)?[^'";]*?['"]([^'"]+)['"]/gm;
const problems = [];
const fail = (file, message) => problems.push(`${relative(root, file)}: ${message}`);

for (const file of files(src)) {
    const rel = relative(src, file).split('\\').join('/');
    if (rel.startsWith('shared/')) continue; // generated; checked by `npm run sync:shared -- --check`
    const text = readFileSync(file, 'utf8');
    const code = text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    const imports = [...text.matchAll(IMPORT)].map(([, typeOnly, spec]) => ({spec, typeOnly: !!typeOnly}));
    const layer = rel.split('/')[0];
    const has = prefix => imports.some(({spec, typeOnly}) => !typeOnly && (spec === prefix || spec.startsWith(prefix)));

    // UI (routes and components) reads data through hooks only.
    if ((layer === 'app' || layer === 'components') && (has('@/api/') || has('@/lib/api') || has('@tanstack/react-query'))) {
        fail(file, 'screens must use hooks/, not api/, lib/api or React Query directly');
    }
    if (layer === 'app' && !rel.endsWith('_layout.tsx') && rel !== 'app/index.tsx' && imports.some(({spec}) => spec.startsWith('@/hooks/'))) {
        fail(file, 'route files stay thin: render a screen from components/');
    }
    if (layer === 'hooks' && has('@/components/')) fail(file, 'hooks must not import components');
    if (layer === 'api' && imports.some(({spec, typeOnly}) => !typeOnly && !spec.startsWith('@/lib/api/client') && !spec.startsWith('@/shared/'))) {
        fail(file, 'api/ services only use lib/api/client and shared contracts');
    }
    // Pure layers: value imports only from shared contracts, so the tests run them without a bundler.
    if ((layer === 'forms' || layer === 'utils') && imports.some(({spec, typeOnly}) => !typeOnly && !spec.startsWith('@/shared/'))) {
        fail(file, `${layer}/ must stay pure (type imports only)`);
    }
    // HTTP, tokens and storage each have exactly one home.
    if (/(?<![.\w])fetch\(/.test(code) && rel !== 'lib/api/client.ts') fail(file, 'fetch() only in src/lib/api/client.ts');
    if (has('expo-secure-store') && rel !== 'lib/storage/secure-tokens.ts') fail(file, 'expo-secure-store only in lib/storage/secure-tokens.ts');
    if (has('@react-native-async-storage/async-storage') && rel !== 'lib/storage/preferences.ts') fail(file, 'AsyncStorage only in lib/storage/preferences.ts');
    if (/AsyncStorage[\s\S]{0,80}(token|Token)/.test(code)) fail(file, 'tokens never go to AsyncStorage');
    // Colours come from styles/tokens.ts; the weather sky and the assistant mascot keep their own artwork palette, as on the web.
    if (/['"]#[0-9a-fA-F]{3,8}['"]/.test(code) && rel !== 'styles/tokens.ts' && !rel.startsWith('components/weather/') && !rel.startsWith('utils/weather/')
        && rel !== 'components/assistant/AssistantMascot.tsx') {
        fail(file, 'use colours from styles/tokens.ts');
    }
    const lineCount = text.trim().split('\n').length;
    if (lineCount < 15) {
        fail(file, `too short (${lineCount} lines < 15 min): avoid bare stubs; include full module contract`);
    }
    if (lineCount > 360) {
        fail(file, `too long (${lineCount} lines > 360 max): split into focused feature subcomponents`);
    }
}

if (problems.length) {
    console.error(`Architecture check failed (${problems.length}):\n  ${problems.join('\n  ')}`);
    process.exit(1);
}
console.log(`Architecture OK: ${files(src).filter(file => !relative(src, file).startsWith('shared')).length} source files checked`);
