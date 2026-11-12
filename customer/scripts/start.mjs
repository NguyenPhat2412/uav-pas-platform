import {access, cp} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const standalone = path.join(root, '.next/standalone');
await access(path.join(standalone, 'server.js'));
// Next's standalone output deliberately omits static assets; serve the same build locally.
await cp(path.join(root, 'public'), path.join(standalone, 'public'), {recursive: true, force: true});
await cp(path.join(root, '.next/static'), path.join(standalone, '.next/static'), {recursive: true, force: true});
process.env.PORT ||= '3100';
process.env.HOSTNAME = process.env.UAV_FRONTEND_HOST || '0.0.0.0';
await import(pathToFileURL(path.join(standalone, 'server.js')).href);
