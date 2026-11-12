# UAV PAS M4 — Customer Portal Migration Handoff

## M4 STATUS

**PARTIAL / NOT_VERIFIED for production acceptance.** The independent Customer Portal is implemented and builds. Ownership, permission, real booking, media download, responsive, and authenticated browser flows still need synthetic customer accounts and a controlled backend test run.

## Repository state

- Repository: `/Volumes/D/Codex/projects/uav-pas-platform`
- Branch: `codex/m1-monorepo-foundation`
- HEAD baseline: `6ecc85111a28e53679b2a6d8ac7ec93730d80be4`
- Worktree: one checkout; no reset, merge, rebase, or push performed.
- Existing Lombok/backend and M1–M3 changes were preserved. M4 changes are frontend/shared-query/docs/tests only.

## Implemented

- `apps/customer`, port 3101: independent Next.js runtime with auth/register, responsive shell, loading/error/empty/forbidden states.
- Shared auth boundary: `@uav/query/session` is consumed by Customer, Operations, and Admin instead of app-local session copies.
- TanStack Query: user-scoped keys, abort signals, permission-aware queries, targeted invalidation, no mutation retries.
- Service catalog: active services from `GET /api/v1/uav-services`; no price/coverage/AI claims.
- Booking: service selection, mission data, time/location validation, availability check, review, single submit; server response controls resulting status.
- Missions: owner-scoped list/detail, draft submit, pending cancellation, status, timeline, authorized media metadata and backend signed download.
- Profile: read-only `auth/me` fields; update UI is omitted because no update contract was found.

## Deliberately omitted

AI results, payments/orders, notifications, preferences, service pricing and service detail endpoint are **NOT_IMPLEMENTED/BACKEND_BLOCKED**. No fake state or placeholder navigation was added.

## M5 readiness

The customer app is an independent M4 deliverable. M5 was not started. Before calling M4 complete, run the security acceptance matrix with CUSTOMER_A/CUSTOMER_B, verify signed media access, capture authenticated browser evidence, and confirm the backend customer role includes the documented permissions.
