# M5 Customer Portal Integration Report

- `NEXT_PUBLIC_CUSTOMER_URL` added to `apps/web/.env.example`, defaulting to local Customer Portal `http://localhost:3101`.
- Header links: `/login` and `/register` on the Customer Portal origin.
- Homepage “Start a request” and “Continue to Customer Portal” link to Customer Portal registration.
- Service CTA links to Customer Portal `/services`; unauthenticated access remains Customer Portal-owned.
- Public `/login` and `/register` are server redirects only and are marked noindex.
- No JWT, access token, localStorage session copying, or query-string return destination is used.
- Origin validation rejects credentials, paths, queries and fragments; production requires HTTPS and a non-localhost hostname.

Evidence: `evidence/tests/browser.json`, `evidence/tests/route-status.log`, and the Customer Portal local `/login` and `/register` 200 responses. Authenticated booking E2E is **NOT_VERIFIED** because a valid test account/fixture was not supplied.
