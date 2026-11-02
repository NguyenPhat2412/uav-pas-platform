# M5 Performance Report

- Public pages are server components/static routes; only the mobile navigation is client-side.
- No third-party analytics, fonts, WebGL, remote image requests, or private API fetches are used by `apps/web`.
- Hero visual is CSS-only and the OG asset is a small static image.
- Next production build passed and generated the public route set. Browser smoke showed no horizontal overflow at 1440×900, 1366×768, 1024×768 or 390×844.
- Screenshot evidence is under `evidence/screenshots/`; the browser script records `privateWebRequests: 0` and page errors `[]`.

No Lighthouse score is claimed. Network/device lab metrics were not collected, so production Core Web Vitals remain **NOT_VERIFIED**.
