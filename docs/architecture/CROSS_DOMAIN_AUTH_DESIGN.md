# Cross-Domain Authentication Design

## Current state and problem

The current frontend receives access/refresh tokens as JSON, stores them in browser `localStorage`, reads them in `api.client.ts`, refreshes on a 401 and keys permission queries by user ID. This works for one origin, but storage is origin-local and cannot provide SSO across four independently hosted apps. Copying tokens through query strings or postMessage without a one-time exchange would create a new credential leak.

## Recommended topology

Use one registrable domain in production:

```text
www.uavpas.example       -> web
customer.uavpas.example  -> customer
ops.uavpas.example       -> operations
admin.uavpas.example     -> admin
api.uavpas.example       -> existing Spring Boot app
```

The backend is the session authority. It remains one Spring Boot service and one database. Subdomains are deployment boundaries, not backend services.

## Session transition

1. The user visits any app and is redirected to `www` `/login` with a signed, short-lived `returnTo` allowlisted by the backend.
2. Login or Zalo callback is handled by the backend. It preserves the current JSON response for legacy clients and sets a secure HttpOnly session/access cookie for the new apps.
3. The browser returns to the allowlisted app. The app calls `/api/v1/auth/me` with `credentials: include`; no token is placed in a URL or JavaScript storage.
4. The backend refresh endpoint rotates the refresh/session material and resets the cookie. Logout invalidates the current access and refresh records and clears the cookie.
5. All four apps load `/api/v1/permissions/me` and use the current server result. A permission change invalidates that Query key and private feature keys.

The preferred production cookie is `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Domain=.uavpas.example`. Use exact CORS allowlists and `Access-Control-Allow-Credentials: true`; never use `*` with credentials. If the apps must live on unrelated registrable domains, replace the shared cookie with an OAuth authorization-code + PKCE flow and one-time codes; do not broaden the cookie domain.

## Backend changes required before cutover

These are a separate, explicitly reviewed backend change; this document does not implement them:

- emit/clear the session cookie on login, refresh and logout;
- make the JWT filter accept the HttpOnly cookie when no bearer header is present, while retaining bearer compatibility;
- expose a session/me check that returns the existing `UserResponse` shape;
- enforce short-lived, rotated refresh material and server-side invalidation already represented by current refresh-token services;
- add CSRF protection for cookie-authenticated state-changing requests (double-submit or synchronizer token). Current bearer-only mode disables CSRF, which is insufficient once browsers automatically attach cookies;
- configure exact app origins in `app.cors.allowed-origins` and storage CORS settings.

## Local development

Use hosts such as `www.uavpas.localhost`, `customer.uavpas.localhost`, `ops.uavpas.localhost`, `admin.uavpas.localhost` and `api.uavpas.localhost`, or run all apps under one development origin with a compatibility flag. HTTPS is required to test `Secure` cookies. Legacy localStorage mode remains available only behind a development/rollback flag and is removed after cutover evidence.

## Threat controls

- Allowlist return URLs server-side; reject open redirects.
- Never put access or refresh tokens in URLs, localStorage, sessionStorage, logs or analytics.
- Use `HttpOnly`, `Secure`, narrow `SameSite`, short access lifetime, refresh rotation and logout invalidation.
- Treat frontend permission gates as UX only; keep all `@PreAuthorize` and domain scope checks.
- Clear QueryClient state on subject/session change and on logout.
- Test login, refresh race, logout during refresh, account switch, revoked permission, CSRF rejection and cross-subdomain cookie behavior.

## Rollback

Keep bearer JSON responses and the legacy host route while the cookie path is dark-launched. A failed cookie-session release can disable the new cookie flag and route traffic back to the single legacy frontend without changing data or permissions. Do not delete refresh-token rows or old route aliases as part of the first rollout.
