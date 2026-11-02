# M2 Operations Migration Handoff

## Status

M2 operations migration is implemented on top of the M1 branch. The Operations app now owns the migrated operations workspace while the legacy `frontend/` remains intact and runnable. Backend business logic was not changed by M2.

## Canonical surface

The app runs on port `3102` and exposes `/overview`, `/stations`, `/uavs`, `/inventory`, `/media`, `/audit`, `/dispatch/missions`, `/assigned-missions`, `/missions/[id]`, and `/login`. Compatibility aliases preserve `/operations`, `/admin/missions`, and `/operator/missions`; the tab query aliases map to the canonical resource pages.

## Integration choices

- Existing operations panels, mission list/detail workflows, query hooks, and UI primitives were reused in the new app-local source tree.
- Requests go through `@uav/api-client`, including signed media uploads. The API client preserves the current JWT/local-storage bearer contract and refresh-flight behavior.
- TanStack Query retains session-scoped permission keys and targeted invalidation from the existing hooks.
- Navigation and page gates use backend permission codes; backend remains authoritative for resource scope and transitions.
- The existing `UavModelViewer` is available on `/uavs` as the current CSS reference model. It is not a telemetry-backed digital twin.

## Verification

Operations typecheck, lint, structural tests, and production build pass. Root workspace checks pass. Legacy frontend lint, typecheck, tests, and build pass. Browser evidence confirms the Operations login route renders; authenticated live-API flows were not run because no backend service was started in this checkpoint.

## Known limits

Cross-domain SSO is not introduced in M2; the interim bearer/session contract remains. Full browser checks against live permissions, API data, signed storage, and responsive breakpoints remain for the next checkpoint. The full repository security scan is still running/resumable and is not represented as clean in this handoff.
