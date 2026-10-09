# M6 data isolation report

**Status: PASS for isolated synthetic API ownership checks; browser/staging cross-portal scope remains NOT_VERIFIED.**

The shared query layer scopes the permission key by user id, clears/cancels queries when the subject changes, resets private queries when the permission signature changes, and reloads on storage-driven account changes. The legacy API client test suite passes refresh race, logout-during-refresh, late previous-account response, failed refresh and forbidden retry scenarios.

Live isolated checks now prove customer A can read the synthetic mission while customer B receives 403 for mission, timeline, media and signed download URL. Operator and admin receive the expected mission/media/timeline access. The complete synthetic mission flow and audit count are recorded in `evidence/tests/m6-current-isolated-runtime.json`.

What is still missing:

- Authenticated browser proof across the four deployed origins.
- Staging-like concurrency and production storage/CORS evidence.
- Cookie SSO/CSRF behavior after the approved contract is implemented.

No private data was fabricated or exposed in M6 evidence.
