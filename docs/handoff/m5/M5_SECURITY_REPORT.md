# M5 Security Report

## Public app controls

- Public site has no authenticated data fetch and no private API route usage.
- Customer origin is environment-configured and validated; no tokens or credentials are placed in URLs.
- Login/register delegation carries no user data and uses no open `returnTo` parameter.
- Login/register and health are excluded from indexing.
- No secrets or private media are included in generated public pages.
- External Customer Portal links are plain environment-derived HTTPS/HTTP origin links; no third-party scripts were added.

## Scan status

The previously launched Codex Security standard scan `715164bc-1b82-43e5-aa9b-052936d4b76e` is **IN_PROGRESS** against the M1 baseline revision `6ecc85111a28e53679b2a6d8ac7ec93730d80be4`. The authoritative context reports a provisional threat model, discovery phase, 0/478 files closed and reportable candidates 0 so far. This is not a clean-scan result and this M5 handoff does not close or reinterpret it.

Local evidence: web lint/typecheck/test/build, root checks, route smoke and backend tests pass. A completed security review remains a release gate.
