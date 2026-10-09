# M6 multi-app runtime report

**Status: PARTIAL.** All four Next applications have independent dev/build configuration and live health routes. Anonymous browser navigation and guarded-route behavior passed at four requested viewport sizes.

| App | Dev/start port | Health | Production build | Browser smoke |
|---|---:|---|---|---|
| web | 3100 | PASS, HTTP 204 | PASS | PASS |
| customer | 3101 | PASS, HTTP 204 | PASS | PASS; protected route redirected to /login |
| operations | 3102 | PASS, HTTP 204 | PASS | PASS; protected route redirected to /login |
| admin | 3103 | PASS, HTTP 204 | PASS | PASS; protected route redirected to /login |

M6 fixed start to use 3101/3102/3103 for customer/operations/admin and corrected their local NEXT_PUBLIC_APP_URL examples. Dockerfiles already use those ports. This removes a real local start collision without changing an API contract.

The public website sign-in link points to customer http://localhost:3101/login; unsafe returnTo and token query strings are stripped by the public redirect path. The browser evidence covers anonymous and unauthenticated behavior only. It does not prove a real API login, cross-portal session, booking, or permissioned workflow.

## Backend runtime blocker

Port 8080 is occupied by an unrelated Expo process:

node /Volumes/D/Codex/projects/tuvihomnay/split-stack/node_modules/.bin/expo start --clear --port 8080

GET /actuator/health and GET /api/v1/auth/me both returned Expo JSON/manifest data, not Spring responses. The UAV API was therefore not reachable at its configured local port during this runtime pass. No unrelated process was stopped. See evidence/runtime/runtime-snapshot.log.
