# M6 authentication and SSO report

**Status: PARTIAL.** Live bearer authentication, refresh/logout, CORS and role/ownership checks pass on the isolated backend; cross-origin cookie SSO remains backend-blocked.

Verified in source, tests and isolated runtime:

- Login, refresh and logout currently use JSON access/refresh tokens.
- The shared API client attaches a bearer token and refreshes once after 401.
- Logout clears the local session before calling the backend.
- Session initialization calls auth/me when a local token exists.
- Permission queries are keyed by user id and are refreshed every 15 seconds/focus.
- Account/session changes clear or reset private Query data.
- Legacy frontend session race tests pass (5/5).
- Browser route guards correctly redirect unauthenticated protected pages.
- Synthetic login returns 200; anonymous/invalid bearer return 401; refresh returns 200; logout revokes the new access/refresh pair (401 afterwards).
- CORS allows the configured portal origin with credentials and rejects an unlisted origin (403).

Current live evidence is `evidence/tests/m6-current-isolated-runtime.json`; the allowed request used a real preflight (`Access-Control-Request-Method` and `Access-Control-Request-Headers`) and returned 200.

The pre-refresh access token remained valid after logging out the refreshed pair. The observed logout is token-specific; it does not establish global session revocation.

Not implemented in the current contract:

- HttpOnly session cookie issuance/clearing.
- Cookie authentication in the backend JWT filter.
- credentials: include session calls.
- CSRF protection for cookie-authenticated state changes.
- Cross-origin SSO across four independent origins.

The approved cross-domain design requires backend cookie/session support (or a reviewed OAuth/OIDC authorization-code + PKCE flow). The current localStorage bearer mode is origin-local and cannot be called SSO. No token was copied between origins or put in a URL. Do not cut over to cookie SSO until the backend contract is approved and browser-tested over HTTPS.
