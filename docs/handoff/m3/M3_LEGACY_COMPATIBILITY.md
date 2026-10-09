# M3 Legacy Compatibility

Baseline `6ecc85111a28e53679b2a6d8ac7ec93730d80be4`.

- `frontend/` was not deleted or route-modified. Existing `/access-control` remains in the legacy app.
- `frontend/src/app/admin/missions` was classified as Operations dispatch and not copied to Admin. `apps/operations` retains canonical `/dispatch/missions` and compatibility aliases.
- Customer and public web foundations are untouched.
- Shared package changes were not required by M3; Admin consumes the existing API client, query, config, design tokens and UI package boundaries.
- Hash/status evidence from M2 remains in `work/m1/baseline-hashes.json`; M3 made no backend source changes.
- Browser screenshot export was unavailable in this session; screenshots are therefore `NOT_VERIFIED` rather than fabricated.
