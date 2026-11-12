# UAV PAS — iPhone app (`mobile/`)

The customer portal as a native app (Expo SDK 58, React Native, Expo Router), next to `frontend/` and `backend/`.
It talks to the same Spring Boot API with a Bearer token kept in the iOS Keychain.

## Layout (same layers as `frontend/src`)

| Folder | Holds |
|---|---|
| `src/app/` | Routes only (Expo Router): `(auth)/` sign-in screens, `customer/(tabs)/` the five tabs, `customer/…` pushed screens |
| `src/components/` | Screens and UI (`ui/` primitives); read data through hooks only |
| `src/hooks/` | React Query hooks, one folder per feature, same cache keys as the web |
| `src/api/` | Thin services over `lib/api/client` and the shared `API_ROUTES` |
| `src/forms/`, `src/utils/` | Pure logic (type imports only), unit-tested with `node --test` |
| `src/lib/api/` | `core.ts` request pipeline (Bearer, single-flight refresh, error wording), `client.ts` wiring, `session.ts` |
| `src/lib/storage/` | `secure-tokens.ts` (Keychain, the only place tokens live), `preferences.ts` (language) |
| `src/providers/` | Query, I18n, Auth, Toast |
| `src/messages/` | The app's own `mobile.*` texts in vi / en / ja |
| `src/shared/` | **Generated** copy of the web's pure modules (types, forms, routes, catalogs); never edit |

`npm run architecture:check` enforces the layers, that `fetch()` lives only in `lib/api/client.ts`, that tokens never
reach AsyncStorage, and that colours come from `src/styles/tokens.ts`.

### Shared code with the web

`npm run sync:shared` copies the allow-listed, platform-neutral modules from `frontend/src` into `src/shared/` and
rewrites their imports. It refuses anything that touches the DOM, Next.js or a web-only package. After changing one of
those web files, run it again; `npm test` fails while `src/shared/` is stale.

### Sessions

Every request sends `X-Client: ios`, so the backend keeps a separate refresh token for the phone (migration V37):
signing in on the iPhone does not sign the browser out, and signing out on the phone revokes only the phone's token.
Changing the password signs every device out.

## Run

```sh
npm install
npm run ios                      # build and open in the iOS Simulator (first build takes a few minutes)
npm start                        # Metro only, once the app is installed
```

Backend: production (`https://api.uav.all1.vn`) by default. For the backend on this Mac:

- Simulator: put `EXPO_PUBLIC_API_URL=http://localhost:8080` in `.env.development.local`.
- iPhone on the same Wi-Fi: `npm run lan` (writes your Mac's LAN address); `npm run lan -- --reset` to undo.

Restart Metro with `npx expo start --clear` after changing env files.

## Install on your iPhone (free Apple ID)

1. Xcode → Settings → Accounts → add your Apple ID (a "Personal Team" is created).
2. Plug in the iPhone, trust the Mac, and turn on **Settings → Privacy & Security → Developer Mode** (restart).
3. `npm run ios:device` (`expo run:ios --device --configuration Release`): pick the phone; the Release build bundles
   the JavaScript and talks to production.
   If signing fails, open `ios/UAVPAS.xcworkspace`, select the target → Signing & Capabilities → Team = your Personal Team.
4. On the iPhone: **Settings → General → VPN & Device Management** → trust your developer certificate.

A free account's build expires after **7 days**: plug in and run step 3 again. No push notifications or TestFlight
without the paid Apple Developer Program (notifications are polled while the app is open).

## Checks

```sh
npm run typecheck && npm run lint && npm test && npm run architecture:check
npm run doctor                   # expo-doctor: native dependency versions
```
