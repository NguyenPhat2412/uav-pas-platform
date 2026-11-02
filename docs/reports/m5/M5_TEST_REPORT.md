# M5 Test Report

## Commands

| Command | Result |
|---|---|
| `npm run lint --workspace @uav/web` | PASS |
| `npm run typecheck --workspace @uav/web` | PASS |
| `npm run test --workspace @uav/web` | PASS, 5 tests |
| `npm run build --workspace @uav/web` | PASS, 25 routes generated |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS |
| `npm run build` | PASS |
| `npm run build --prefix frontend` | PASS |
| `cd backend && ./mvnw test -q` | PASS, 204 tests / 0 failures / 0 errors / 6 skipped |
| `node work/m5/browser-check.mjs` | PASS |

## Browser coverage

The script checks public pages, unique titles, canonical/description/OG/Twitter tags, 4 responsive sizes, no public `/api` requests, mobile menu open/close/Escape, skip link, reduced motion, 404 routes, Customer Portal hrefs, safe auth redirect headers, screenshots and 200% CSS zoom visual evidence. Authenticated booking and contact submission E2E are **NOT_VERIFIED**.

Logs and machine-readable output are in `evidence/logs/` and `evidence/tests/`.
