# M6 legacy compatibility

**Status: PASS for local regression.**

The legacy frontend/ directory remains present and was not removed or rewritten by M6. Its lint, typecheck, 5 API/session tests and production build all pass. Existing bearer/refresh behavior remains available for rollback and compatibility.

The workspace is dirty with pre-existing M1-M5/backend changes, so this is a runtime regression result against the current dirty baseline rather than a clean commit comparison.
