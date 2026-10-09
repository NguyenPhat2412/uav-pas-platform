# M6 data isolation report

**Status: NOT_VERIFIED for cross-user runtime; cache-isolation code verified and tested.**

The shared query layer scopes the permission key by user id, clears/cancels queries when the subject changes, resets private queries when the permission signature changes, and reloads on storage-driven account changes. The legacy API client test suite passes refresh race, logout-during-refresh, late previous-account response, failed refresh and forbidden retry scenarios.

What is still missing:

- Real CUSTOMER_A and CUSTOMER_B credentials.
- Direct HTTP requests proving customer A cannot read B's mission/media.
- A live operator/admin matrix proving role and resource boundaries.
- Signed media URL ownership/expiry evidence through the running backend.
- PostgreSQL concurrency evidence is available for inventory stabilization tests, but not for a complete customer-to-operations mission workflow.

No private data was fabricated or exposed in M6 evidence.
