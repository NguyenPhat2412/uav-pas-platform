# M6 authentication and SSO report

**Status: BACKEND_BLOCKED / NOT_VERIFIED cross-origin.**

Verified in source and tests:

- Login, refresh and logout currently use JSON access/refresh tokens.
- The shared API client attaches a bearer token and refreshes once after 401.
- Logout clears the local session before calling the backend.
- Session initialization calls auth/me when a local token exists.
- Permission queries are keyed by user id and are refreshed every 15 seconds/focus.
- Account/session changes clear or reset private Query data.
- Legacy frontend session race tests pass (5/5).
- Browser route guards correctly redirect unauthenticated protected pages.

Not implemented in the current contract:

- HttpOnly session cookie issuance/clearing.
- Cookie authentication in the backend JWT filter.
- credentials: include session calls.
- CSRF protection for cookie-authenticated state changes.
- Cross-origin SSO across four independent origins.

The approved cross-domain design requires backend cookie/session support (or a reviewed OAuth/OIDC authorization-code + PKCE flow). The current localStorage bearer mode is origin-local and cannot be called SSO. No token was copied between origins or put in a URL. Do not cut over to cookie SSO until the backend contract is approved and browser-tested over HTTPS.
