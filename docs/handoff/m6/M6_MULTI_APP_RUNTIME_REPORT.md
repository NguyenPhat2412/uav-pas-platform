# M6 multi-app runtime report

**Status: PARTIAL.** Frontend checks were rerun in this continuation. All four Next applications have independent dev/build configuration and live health routes. Anonymous browser navigation and guarded-route behavior passed at four requested viewport sizes.

| App | Dev/start port | Health | Production build | Browser smoke |
|---|---:|---|---|---|
| web | 3100 | PASS, HTTP 204 | PASS | PASS |
| customer | 3101 | PASS, HTTP 204 | PASS | PASS; protected route redirected to /login |
| operations | 3102 | PASS, HTTP 204 | PASS | PASS; protected route redirected to /login |
| admin | 3103 | PASS, HTTP 204 | PASS | PASS; protected route redirected to /login |

M6 fixed start to use 3101/3102/3103 for customer/operations/admin and corrected their local NEXT_PUBLIC_APP_URL examples. Dockerfiles already use those ports. This removes a real local start collision without changing an API contract.

The public website sign-in link points to customer http://localhost:3101/login; unsafe returnTo and token query strings are stripped by the public redirect path. The browser evidence covers anonymous and unauthenticated behavior only. It does not prove a real API login, cross-portal session, booking, or permissioned workflow.

An authenticated browser attempt was not claimed: the existing Next dev servers are already locked to the 3100-series ports and their local examples point at backend port 8080, while this verification deliberately isolated Spring on 18080. Starting a second dev instance for the browser would require replacing those running processes or changing the frontend runtime contract, so the authenticated browser result is **NOT_VERIFIED** rather than a pass.

## Backend runtime evidence

Port 8080 remained untouched because an unrelated Expo process owns it. Spring was started on isolated port 18080 with disposable PostgreSQL 55444 and MinIO 9014. `/actuator/health` returned 200/UP; allowed CORS preflight returned 200 with credentials; a disallowed origin returned 403; the synthetic authenticated API and business flow passed. See `evidence/tests/m6-current-isolated-runtime.json`.
