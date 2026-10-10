# UAV PAS M5 Public Website Handoff

## Status

**PARTIAL**. The independent public website is implemented and verified for public routing, rendering, SEO foundations, responsive behavior, accessibility smoke checks, and safe Customer Portal links. Full authenticated booking E2E and the repository security scan are still open.

## Repository state

- Repository: `uav-pas-platform`
- Branch: `codex/m1-monorepo-foundation`
- Baseline HEAD: `6ecc85111a28e53679b2a6d8ac7ec93730d80be4`
- Working tree: existing M1–M4 changes plus M5 changes; no reset, merge, rebase or push performed.
- Target app: `/Volumes/D/Codex/projects/uav-pas-platform/apps/web`

## Running

`npm run dev --workspace @uav/web` serves port 3100. `NEXT_PUBLIC_CUSTOMER_URL` defaults to `http://localhost:3101` in local development and must be set to an approved HTTPS origin in production. `/health` returns 204.

## Implemented

- Public shell with responsive navigation, mobile menu, skip link, footer, error and not-found states.
- Homepage with factual platform explanation, readiness labels, services, solutions, workflow and CTA.
- `/about`, `/services`, `/services/[slug]`, `/solutions`, `/solutions/[slug]`, `/how-it-works`, `/pricing`, `/contact`, `/faq`, `/privacy`, `/terms`.
- `/login` and `/register` delegate to Customer Portal; no duplicate auth flow or token transfer exists.
- Environment origin validation rejects credentialed, path-bearing, query-bearing, localhost production origins and non-HTTPS production URLs.
- Static WebSite JSON-LD only; no fabricated Organization, Review, Offer, AggregateRating, partner, certification or fleet claims.

## Verification

- `apps/web` lint: PASS
- `apps/web` typecheck: PASS
- `apps/web` tests: PASS (5 tests including M1 and M5 structural checks)
- `apps/web` build: PASS; 25 pages generated.
- Browser evidence: PASS for public pages, unique metadata, canonical tags, OG/Twitter tags, sitemap/robots, responsive widths, mobile menu, skip link, reduced motion, 404 and Customer Portal hrefs. See `evidence/tests/browser.json` and `evidence/screenshots/`.
- Root workspaces lint/typecheck/test/build: PASS.
- Legacy frontend build: PASS.
- Backend Maven wrapper tests: PASS (204 tests, 0 failures, 0 errors, 6 skipped); backend was not modified for M5.

## Known limits

Customer Portal links are verified as environment-based destinations and local destination pages respond 200. An authenticated customer booking journey was not claimed because no test account/fixture was supplied. The public site does not submit contact leads because no approved contact API exists. Pricing and legal pages intentionally remain publication placeholders. The Codex Security standard scan for the M1 baseline is still IN_PROGRESS and its provisional threat model is not a clean-scan result.

## M6 readiness

**BLOCKED until** an approved production origin/content policy, authenticated Customer Portal E2E fixture, approved contact/legal content, and completed security scan are available. No M6 work was started.
