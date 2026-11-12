# M4 Component Reuse Report

- Reused `@uav/design-tokens`, `@uav/api-client`, `@uav/query`, `@uav/ui`, `@uav/config`.
- Moved the approved auth/session implementation into `@uav/query/session`; Customer, Operations and Admin now import the same session boundary.
- Reused the established API error/session refresh behavior. Feature code contains no direct `fetch` calls.
- Added only customer-specific composition: `AppShell`, `PageGuard`, service cards, booking review, mission timeline, and customer media actions.
- UI follows the existing light-first UAV system with keyboard focus, labelled fields, 44px controls, responsive breakpoints and reduced-motion fallback.
