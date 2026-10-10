# Shared Packages Design

## Package contracts

| Package | Public responsibility | Dependencies | Explicit boundary |
|---|---|---|---|
| `@uav/ui` | Button, input, badge, table, drawer, page header, loading/empty/error/denied states and accessible form primitives | `react`, design tokens | No endpoint, role decision or app route imports |
| `@uav/design-tokens` | CSS variables, Tailwind preset, typography, spacing, status colors and density tokens | none | No React or business data |
| `@uav/types` | DTOs, enums, pagination, error and media/mission/resource contracts | none | Mirrors current backend JSON; additive changes only |
| `@uav/auth-contracts` | `AuthResponse`, `UserResponse`, role/permission unions, session events and `Can` contract | `@uav/types` | Does not decide whether a server request is authorized |
| `@uav/api-client` | base URL, headers, credentials, auth renewal, abort/error normalization and typed request methods | `@uav/types`, `@uav/auth-contracts` | Only package allowed to call `fetch`; no UI or route logic |
| `@uav/query` | QueryClient factory, account-scoped key factories and invalidation helpers | TanStack Query, types | No feature-specific endpoint implementation |
| `@uav/config` | runtime-validated public environment variables and app identity | `zod` | Never exposes secrets through `NEXT_PUBLIC_*` |

Feature code can remain app-local in the first migration. Once a feature is used by two apps, move its API functions and types into a package; move UI only when the API and permission behavior are identical. This avoids an early shared mega-package.

## API client contract

```ts
request<T>(path, { method, body, signal }): Promise<T>
```

It normalizes the current `{ status, error, message, path }` error shape, handles `204`, preserves `AbortError`, attaches the active session and emits one session-expired event. It must support both the legacy `Authorization: Bearer` path and the approved cookie-session path during migration. Uploads use a separate signed-URL function and never enter Query cache.

## Query conventions

Use factories such as `missionKeys.list(subject, filters)` and `missionKeys.detail(subject, id)`. The subject is a stable user/session identifier, not a token. Every mutation invalidates the smallest affected list/detail/dashboard keys. Do not copy query results into a second global store. Local UI state may own a drawer or draft form.

## UI and design tokens

Carry forward the current light-first operations design: table-first data surfaces, dense but readable rows, local table scroll, explicit status text beside color, keyboard-accessible drawers, focus-visible states, reduced-motion support and the existing Vietnamese/English catalog. The current CSS UAV reference viewer remains an on-demand reference illustration; it must not be presented as telemetry or a digital twin.

`@uav/ui` should expose semantic variants (`available`, `pending`, `error`) instead of raw hex values. `@uav/design-tokens` owns the current blue/graphite palette, spacing and typography. App-specific branding may override tokens through a documented theme layer, not duplicated component CSS.

## Types and compatibility

Generate or hand-maintain types from the existing DTO contracts only after comparing with controller responses. Keep nullable fields and enum spellings exactly as returned. Add fields as optional first. A breaking backend contract requires a versioned package and a compatibility adapter; do not silently rename `MISSION_*`, media roles or pagination fields.

## Package testing

- `ui`: component/unit tests for keyboard focus, denied/error/empty states and table overflow.
- `api-client`: the existing five session tests moved unchanged, plus cookie/credentials and abort tests.
- `query`: key uniqueness, account isolation and invalidation tests.
- `types`: compile-time contract fixtures for representative backend responses.
- each app: route smoke and permission matrix tests.

## Dependency rules

Use npm workspaces first. Add a build orchestrator only when CI duration or dependency graph requires it. Each package has `src/index.ts` exports; consumers may not deep-import another package's files. Lock one React, Next and TanStack Query major version across all apps.
