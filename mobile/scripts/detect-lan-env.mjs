#!/usr/bin/env node
// Points a development build at the backend running on this Mac, for an iPhone on the same Wi-Fi:
// writes .env.development.local (git-ignored) with EXPO_PUBLIC_API_URL=http://<this Mac's LAN IP>:8080.
//   npm run lan              detect the Wi-Fi address (en0, then en1)
//   npm run lan -- 10.0.0.5  use a given address
//   npm run lan -- --reset   remove the override (back to https://api.uav.all1.vn)

import {execFileSync} from 'node:child_process';
import {existsSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const target = join(dirname(fileURLToPath(import.meta.url)), '..', '.env.development.local');
const arg = process.argv[2];

if (arg === '--reset') {
    if (existsSync(target)) rmSync(target);
    console.log('Removed .env.development.local; the app uses https://api.uav.all1.vn again.');
    process.exit(0);
}

function lanAddress() {
    for (const device of ['en0', 'en1']) {
        try {
            const ip = execFileSync('ipconfig', ['getifaddr', device], {encoding: 'utf8'}).trim();
            if (ip) return ip;
        } catch { /* interface down */
        }
    }
    return null;
}

const ip = arg ?? lanAddress();
if (!ip || !/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    console.error('No Wi-Fi IPv4 address found. Pass one: npm run lan -- 192.168.1.20');
    process.exit(1);
}
writeFileSync(target, `# Written by scripts/detect-lan-env.mjs; delete it (or npm run lan -- --reset) to use production.\nEXPO_PUBLIC_API_URL=http://${ip}:8080\n`);
console.log(`EXPO_PUBLIC_API_URL=http://${ip}:8080 -> .env.development.local
Restart Metro with --clear. The iPhone must be on the same Wi-Fi and the backend listening on 0.0.0.0:8080.
Media uploads also need storage reachable from the phone (R2 is; a local MinIO needs APP_STORAGE_PUBLIC_ENDPOINT=http://${ip}:9000).`);
