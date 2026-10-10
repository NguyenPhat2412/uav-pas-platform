# M4 Customer Security Report

## Controls implemented

- Backend ownership is authoritative; the UI does not client-filter another user into visibility.
- Mission detail subqueries for timeline/media run only after the returned mission `customerId` matches the current user.
- Permission-aware navigation and page gates hide unsupported capabilities, while backend 403 remains authoritative.
- Query keys include the current user identity; logout/account switching clears shared query cache through the session provider.
- Non-idempotent create/submit/cancel mutations do not retry automatically.
- Signed media URLs are requested on demand and opened without persisting the URL in application state.
- No secrets, object-storage credentials, fake AI/payment state, or session tokens in URLs were added.

## Acceptance still required

`CUSTOMER_A` versus `CUSTOMER_B` URL-ID and media-download tests were not run with real synthetic accounts. Direct API security tests and authenticated browser evidence are **NOT_VERIFIED**. The delegated repository security scan remains **IN_PROGRESS**; this handoff does not claim a clean security scan.
